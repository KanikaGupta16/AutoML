"""
Training Pipeline
=================
Handles model training on Modal with automatic retries and error handling.

Features:
- Modal H100 GPU training
- Automatic retry on failure
- Progress monitoring
- Model download
"""

import subprocess
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

import torch

from ..config import config
from ..dataset.discovery import DatasetInfo
from ..model.agent import ArchitectureConfig


@dataclass
class TrainingResult:
    """Result of a training run."""
    success: bool
    model_filename: str
    model_path: Optional[Path]
    architecture: str
    accuracy: float
    class_names: list[str]
    num_classes: int
    training_time_s: float
    error: Optional[str] = None


class Trainer:
    """
    Manages model training on Modal.

    Handles:
    - Training job submission
    - Progress monitoring
    - Model download
    - Automatic retries
    """

    def __init__(self, max_retries: int = 2):
        self.max_retries = max_retries
        self.models_dir = config.models_dir

    def train(
        self,
        task_name: str,
        dataset: DatasetInfo,
        arch_config: ArchitectureConfig,
        fallback_datasets: list[DatasetInfo] = None,
    ) -> TrainingResult:
        """
        Train a model on Modal with automatic dataset fallback.

        Args:
            task_name: Name for the training task
            dataset: Primary dataset to train on
            arch_config: Architecture and hyperparameters
            fallback_datasets: Alternative datasets to try if primary fails

        Returns:
            TrainingResult with model info
        """
        # Build list of datasets to try (primary + fallbacks)
        datasets_to_try = [dataset]
        if fallback_datasets:
            for fb in fallback_datasets:
                if fb.ref != dataset.ref:  # Don't duplicate primary
                    datasets_to_try.append(fb)

        print(f"\n[Trainer] Starting training on Modal H100")
        print(f"  Architecture: {arch_config.architecture}")
        print(f"  Epochs: {arch_config.epochs}")
        print(f"  Datasets to try: {len(datasets_to_try)}")

        model_filename = f"{task_name}_{arch_config.architecture}.pth"
        last_error = None

        # Try each dataset
        for ds_idx, current_dataset in enumerate(datasets_to_try):
            print(f"\n  Dataset [{ds_idx + 1}/{len(datasets_to_try)}]: {current_dataset.ref}")

            for attempt in range(1, self.max_retries + 1):
                print(f"    Attempt {attempt}/{self.max_retries}")

                result = self._run_modal_training(
                    task_name=task_name,
                    dataset_ref=current_dataset.ref,
                    architecture=arch_config.architecture,
                    epochs=arch_config.epochs,
                    learning_rate=arch_config.learning_rate,
                    batch_size=arch_config.batch_size,
                    freeze_backbone=arch_config.freeze_backbone,
                )

                if result.success:
                    # Download the model
                    print("\n  Downloading trained model...")
                    local_path = self._download_model(model_filename)

                    if local_path:
                        # Load and verify
                        checkpoint = torch.load(local_path, map_location="cpu")
                        result.model_path = local_path
                        result.accuracy = checkpoint.get("accuracy", 0)
                        result.class_names = checkpoint.get("class_names", [])
                        result.num_classes = checkpoint.get("num_classes", 0)

                        print(f"\n  ✓ Training complete!")
                        print(f"    Dataset: {current_dataset.ref}")
                        print(f"    Accuracy: {result.accuracy:.1f}%")
                        print(f"    Classes: {result.class_names[:10]}")

                    return result

                last_error = result.error
                print(f"    ✗ Attempt {attempt} failed: {result.error}")

                # Check if it's a dataset structure error - try next dataset immediately
                if "No class folders" in str(result.error) or "dataset structure" in str(result.error).lower():
                    print("    → Dataset structure issue, trying next dataset...")
                    break  # Break retry loop, move to next dataset

                if attempt < self.max_retries:
                    print("    Retrying...")
                    time.sleep(5)

        return TrainingResult(
            success=False,
            model_filename=model_filename,
            model_path=None,
            architecture=arch_config.architecture,
            accuracy=0,
            class_names=[],
            num_classes=0,
            training_time_s=0,
            error=f"Training failed on all {len(datasets_to_try)} datasets. Last error: {last_error}",
        )

    def _run_modal_training(
        self,
        task_name: str,
        dataset_ref: str,
        architecture: str,
        epochs: int,
        learning_rate: float,
        batch_size: int,
        freeze_backbone: bool,
    ) -> TrainingResult:
        """Execute training on Modal."""
        start_time = time.time()

        cmd = [
            "modal", "run", "modal_app.py",
            "--dataset", dataset_ref,
            "--task-name", task_name,
            "--architecture", architecture,
            "--epochs", str(epochs),
            "--learning-rate", str(learning_rate),
            "--batch-size", str(batch_size),
        ]

        if freeze_backbone:
            cmd.append("--freeze-backbone")

        print(f"  Running: {' '.join(cmd[:6])}...")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=config.modal_timeout,
                cwd=config.project_root,
            )

            training_time = time.time() - start_time

            if result.returncode == 0:
                return TrainingResult(
                    success=True,
                    model_filename=f"{task_name}_{architecture}.pth",
                    model_path=None,
                    architecture=architecture,
                    accuracy=0,
                    class_names=[],
                    num_classes=0,
                    training_time_s=training_time,
                )
            else:
                # Parse error
                error = result.stderr[-500:] if result.stderr else "Unknown error"
                return TrainingResult(
                    success=False,
                    model_filename=f"{task_name}_{architecture}.pth",
                    model_path=None,
                    architecture=architecture,
                    accuracy=0,
                    class_names=[],
                    num_classes=0,
                    training_time_s=training_time,
                    error=error,
                )

        except subprocess.TimeoutExpired:
            return TrainingResult(
                success=False,
                model_filename=f"{task_name}_{architecture}.pth",
                model_path=None,
                architecture=architecture,
                accuracy=0,
                class_names=[],
                num_classes=0,
                training_time_s=config.modal_timeout,
                error="Training timeout",
            )
        except Exception as e:
            return TrainingResult(
                success=False,
                model_filename=f"{task_name}_{architecture}.pth",
                model_path=None,
                architecture=architecture,
                accuracy=0,
                class_names=[],
                num_classes=0,
                training_time_s=0,
                error=str(e),
            )

    def _download_model(self, model_filename: str) -> Optional[Path]:
        """Download model from Modal volume."""
        self.models_dir.mkdir(exist_ok=True)
        local_path = self.models_dir / model_filename

        try:
            cmd = ["modal", "volume", "get", config.modal_volume_name, model_filename, str(local_path)]
            print(f"    Running: {' '.join(cmd[:4])}...")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode == 0 and local_path.exists():
                print(f"    ✓ Downloaded to {local_path}")
                return local_path
            else:
                print(f"    ✗ Download failed: {result.stderr[:200] if result.stderr else 'Unknown error'}")

        except subprocess.TimeoutExpired:
            print(f"    ✗ Download timeout")
        except Exception as e:
            print(f"    ✗ Download error: {e}")

        return None
