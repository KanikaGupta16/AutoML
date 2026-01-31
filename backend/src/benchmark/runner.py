"""
Benchmark Runner
================
Compares local trained models against LLM vision APIs.

Features:
- Local model inference
- Gemini Vision API inference
- Accuracy and speed comparison
- Cost analysis
"""

import base64
import time
import subprocess
import shutil
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import requests

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

from ..config import config


@dataclass
class BenchmarkResult:
    """Results from benchmarking."""
    model_name: str
    total_images: int
    correct: int
    accuracy: float
    avg_time_ms: float
    total_cost: float
    predictions: list = field(default_factory=list)


@dataclass
class ComparisonReport:
    """Comparison between local and API models."""
    local: BenchmarkResult
    api: BenchmarkResult
    speedup: float
    accuracy_diff: float
    cost_savings_1m: float


class Benchmark:
    """
    Benchmarks trained models against LLM vision APIs.

    Handles:
    - Test image acquisition
    - Local model inference
    - API model inference
    - Comparison reporting
    """

    def __init__(self, model_path: Path, api_key: str = None):
        self.model_path = model_path
        self.api_key = api_key or config.openrouter_api_key

        # Load model info
        self.checkpoint = torch.load(model_path, map_location="cpu")
        self.class_names = self.checkpoint["class_names"]
        self.architecture = self.checkpoint.get("architecture", "mobilenet_v2")
        self.input_size = self.checkpoint.get("input_size", 224)

        # Setup model
        self.model = self._load_model()
        self.transform = self._get_transform()

        # Device
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model = self.model.to(self.device)

    def _load_model(self) -> nn.Module:
        """Load the trained model."""
        num_classes = self.checkpoint["num_classes"]

        if self.architecture == "mobilenet_v2":
            model = models.mobilenet_v2(weights=None)
            model.classifier[1] = nn.Linear(model.last_channel, num_classes)
        elif self.architecture == "resnet50":
            model = models.resnet50(weights=None)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        elif "efficientnet" in self.architecture or "convnext" in self.architecture:
            import timm
            # timm uses underscores in model names (efficientnet_b0, not efficientnet-b0)
            model = timm.create_model(
                self.architecture,
                pretrained=False,
                num_classes=num_classes
            )
        else:
            model = models.mobilenet_v2(weights=None)
            model.classifier[1] = nn.Linear(model.last_channel, num_classes)

        model.load_state_dict(self.checkpoint["model_state_dict"])
        model.eval()
        return model

    def _get_transform(self):
        """Get image transform pipeline."""
        return transforms.Compose([
            transforms.Resize((self.input_size, self.input_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def get_test_images(
        self,
        dataset_ref: str,
        num_images: int = 30,
        data_dir: Path = None
    ) -> list[tuple[Path, str]]:
        """
        Get test images from a Kaggle dataset.

        Returns list of (image_path, ground_truth_class) tuples.
        """
        data_dir = data_dir or config.data_dir / "test_images"

        # Clear and recreate
        if data_dir.exists():
            shutil.rmtree(data_dir)
        data_dir.mkdir(parents=True)

        print(f"\n[Benchmark] Downloading test images from {dataset_ref}")

        # First try to get specific files (faster for large datasets)
        try:
            # Get list of files
            list_result = subprocess.run(
                ["kaggle", "datasets", "files", "-d", dataset_ref],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if list_result.returncode == 0:
                # Parse file list and download sample per class
                lines = list_result.stdout.strip().split('\n')[2:]  # Skip header
                files_by_class = {}
                extensions = {'.jpg', '.jpeg', '.png'}

                for line in lines[:500]:  # Check first 500 files
                    parts = line.split()
                    if parts:
                        filepath = parts[0]
                        if any(filepath.lower().endswith(ext) for ext in extensions):
                            # Extract class from path (e.g., "train/bird_name/img.jpg" -> "bird_name")
                            path_parts = filepath.split('/')
                            if len(path_parts) >= 2:
                                class_name = path_parts[-2]
                                if class_name not in files_by_class:
                                    files_by_class[class_name] = []
                                if len(files_by_class[class_name]) < 3:  # Max 3 per class
                                    files_by_class[class_name].append(filepath)

                # Download sample files
                if files_by_class:
                    print(f"  Found {len(files_by_class)} classes, downloading samples...")
                    for class_name, files in list(files_by_class.items())[:10]:  # Max 10 classes
                        class_dir = data_dir / class_name
                        class_dir.mkdir(exist_ok=True)
                        for filepath in files[:2]:  # 2 images per class
                            try:
                                subprocess.run(
                                    ["kaggle", "datasets", "download", "-d", dataset_ref,
                                     "-f", filepath, "-p", str(class_dir)],
                                    capture_output=True,
                                    timeout=60,
                                )
                                # Unzip if needed
                                for zf in class_dir.glob("*.zip"):
                                    subprocess.run(["unzip", "-o", "-q", str(zf), "-d", str(class_dir)])
                                    zf.unlink()
                            except:
                                pass
                    print(f"  Downloaded samples for {len(files_by_class)} classes")

        except Exception as e:
            print(f"  Sample download failed: {e}, trying full download...")

            # Fallback: full dataset download with longer timeout
            try:
                result = subprocess.run(
                    ["kaggle", "datasets", "download", "-d", dataset_ref, "-p", str(data_dir), "--unzip"],
                    capture_output=True,
                    text=True,
                    timeout=600,  # 10 minutes for large datasets
                )

                if result.returncode != 0:
                    print(f"  Warning: {result.stderr[:200]}")

            except Exception as e2:
                print(f"  Download error: {e2}")

        # Find images organized by class
        test_data = []
        extensions = {".jpg", ".jpeg", ".png", ".bmp"}

        for class_dir in data_dir.rglob("*"):
            if class_dir.is_dir():
                images = [f for f in class_dir.iterdir() if f.suffix.lower() in extensions]
                if images:
                    class_name = class_dir.name
                    for img in images[:num_images // 10]:  # Sample per class
                        test_data.append((img, class_name))

        # Limit total
        if len(test_data) > num_images:
            import random
            random.seed(42)
            test_data = random.sample(test_data, num_images)

        print(f"  Found {len(test_data)} test images")
        return test_data

    def benchmark_local(self, test_data: list[tuple[Path, str]]) -> BenchmarkResult:
        """Benchmark the local trained model."""
        print(f"\n[Benchmark] Running local model ({self.architecture})")

        # Warmup
        dummy = torch.randn(1, 3, self.input_size, self.input_size).to(self.device)
        for _ in range(3):
            with torch.no_grad():
                _ = self.model(dummy)

        correct = 0
        times = []
        predictions = []

        for img_path, ground_truth in test_data:
            start = time.time()

            image = Image.open(img_path).convert("RGB")
            tensor = self.transform(image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.model(tensor)
                probs = torch.softmax(outputs, dim=1)
                conf, idx = probs.max(1)

            elapsed = (time.time() - start) * 1000
            times.append(elapsed)

            predicted = self.class_names[idx.item()]
            is_correct = predicted.lower() == ground_truth.lower()

            if is_correct:
                correct += 1

            predictions.append({
                "image": img_path.name,
                "ground_truth": ground_truth,
                "predicted": predicted,
                "confidence": conf.item(),
                "correct": is_correct,
            })

        accuracy = 100.0 * correct / len(test_data) if test_data else 0
        avg_time = sum(times) / len(times) if times else 0

        print(f"  Accuracy: {accuracy:.1f}% ({correct}/{len(test_data)})")
        print(f"  Avg time: {avg_time:.1f}ms")

        return BenchmarkResult(
            model_name=f"Local {self.architecture}",
            total_images=len(test_data),
            correct=correct,
            accuracy=accuracy,
            avg_time_ms=avg_time,
            total_cost=0.0,
            predictions=predictions,
        )

    def benchmark_api(self, test_data: list[tuple[Path, str]]) -> BenchmarkResult:
        """Benchmark Gemini Vision API."""
        print(f"\n[Benchmark] Running Gemini Vision API")

        correct = 0
        times = []
        predictions = []
        cost_per_image = 0.00015  # Approximate

        for img_path, ground_truth in test_data:
            try:
                # Encode image
                with open(img_path, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")

                suffix = img_path.suffix.lower()
                media_type = "image/jpeg" if suffix in [".jpg", ".jpeg"] else "image/png"

                prompt = f"""Classify this image into ONE of these categories:
{self.class_names}

Respond with ONLY the category name."""

                start = time.time()

                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.llm_model,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{image_data}"}}
                            ]
                        }],
                        "max_tokens": 50,
                        "temperature": 0,
                    },
                    timeout=30,
                )

                elapsed = (time.time() - start) * 1000
                times.append(elapsed)

                response.raise_for_status()
                predicted = response.json()["choices"][0]["message"]["content"].strip()

                # Fuzzy match
                pred_lower = predicted.lower().replace("-", "_").replace(" ", "_")
                truth_lower = ground_truth.lower().replace("-", "_").replace(" ", "_")
                is_correct = pred_lower == truth_lower or truth_lower in pred_lower

                if is_correct:
                    correct += 1

                predictions.append({
                    "image": img_path.name,
                    "ground_truth": ground_truth,
                    "predicted": predicted,
                    "correct": is_correct,
                })

            except Exception as e:
                print(f"  Error on {img_path.name}: {e}")
                predictions.append({
                    "image": img_path.name,
                    "ground_truth": ground_truth,
                    "predicted": "ERROR",
                    "correct": False,
                })

        accuracy = 100.0 * correct / len(test_data) if test_data else 0
        avg_time = sum(times) / len(times) if times else 0

        print(f"  Accuracy: {accuracy:.1f}% ({correct}/{len(test_data)})")
        print(f"  Avg time: {avg_time:.1f}ms")

        return BenchmarkResult(
            model_name="Gemini Vision API",
            total_images=len(test_data),
            correct=correct,
            accuracy=accuracy,
            avg_time_ms=avg_time,
            total_cost=cost_per_image * len(test_data),
            predictions=predictions,
        )

    def compare(self, test_data: list[tuple[Path, str]]) -> ComparisonReport:
        """Run full comparison benchmark."""
        local_result = self.benchmark_local(test_data)
        api_result = self.benchmark_api(test_data)

        speedup = api_result.avg_time_ms / local_result.avg_time_ms if local_result.avg_time_ms > 0 else 0
        accuracy_diff = local_result.accuracy - api_result.accuracy
        cost_savings_1m = 0.00015 * 1_000_000  # $150 per 1M images

        return ComparisonReport(
            local=local_result,
            api=api_result,
            speedup=speedup,
            accuracy_diff=accuracy_diff,
            cost_savings_1m=cost_savings_1m,
        )

    def print_report(self, report: ComparisonReport):
        """Print comparison report."""
        print("\n" + "=" * 60)
        print("BENCHMARK COMPARISON")
        print("=" * 60)

        print(f"\n{'Metric':<25} {'Local Model':<20} {'Gemini API':<20}")
        print("-" * 65)
        print(f"{'Images tested':<25} {report.local.total_images:<20} {report.api.total_images:<20}")
        print(f"{'Correct':<25} {report.local.correct:<20} {report.api.correct:<20}")
        print(f"{'Accuracy':<25} {report.local.accuracy:<19.1f}% {report.api.accuracy:<19.1f}%")
        print(f"{'Avg time':<25} {report.local.avg_time_ms:<19.1f}ms {report.api.avg_time_ms:<19.1f}ms")
        print(f"{'Cost':<25} ${'0.00':<19} ${report.api.total_cost:<19.4f}")

        print("\n" + "-" * 65)
        print(f"\n🚀 Local model is {report.speedup:.0f}x FASTER")
        print(f"💰 Saves ${report.cost_savings_1m:,.0f} per 1M images")

        if report.accuracy_diff > 0:
            print(f"🎯 Local model is {report.accuracy_diff:.1f}% MORE accurate")
        elif report.accuracy_diff < 0:
            print(f"🎯 API is {-report.accuracy_diff:.1f}% more accurate")
        else:
            print("🎯 Equal accuracy")

        print("=" * 60)
