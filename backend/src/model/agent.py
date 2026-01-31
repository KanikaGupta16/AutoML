"""
Architecture Selection Agent
=============================
Uses LLM to analyze tasks and select optimal model architecture.

Features:
- LLM-based intelligent selection
- Rule-based fallback
- Hyperparameter recommendations
"""

import json
import requests
from dataclasses import dataclass
from typing import Optional

from ..config import config
from ..dataset.discovery import DatasetInfo


@dataclass
class ArchitectureConfig:
    """Model architecture and training configuration."""
    architecture: str
    learning_rate: float
    epochs: int
    batch_size: int
    freeze_backbone: bool
    input_size: int
    reason: str


# Available architectures with metadata
ARCHITECTURES = {
    "mobilenet_v2": {
        "name": "MobileNetV2",
        "params": "3.4M",
        "speed": "very fast",
        "accuracy": "good",
        "best_for": "mobile/edge deployment, real-time inference, small datasets",
        "input_size": 224,
        "default_lr": 0.001,
        "default_epochs": 10,
    },
    "resnet50": {
        "name": "ResNet50",
        "params": "25.6M",
        "speed": "medium",
        "accuracy": "very good",
        "best_for": "balanced accuracy/speed, medium datasets, general purpose",
        "input_size": 224,
        "default_lr": 0.0001,
        "default_epochs": 15,
    },
    "efficientnet_b0": {
        "name": "EfficientNet-B0",
        "params": "5.3M",
        "speed": "fast",
        "accuracy": "very good",
        "best_for": "best accuracy/efficiency ratio, production deployment",
        "input_size": 224,
        "default_lr": 0.001,
        "default_epochs": 15,
    },
    "efficientnet_b4": {
        "name": "EfficientNet-B4",
        "params": "19M",
        "speed": "slow",
        "accuracy": "excellent",
        "best_for": "maximum accuracy, fine-grained classification, large datasets",
        "input_size": 380,
        "default_lr": 0.0001,
        "default_epochs": 20,
    },
    "convnext_tiny": {
        "name": "ConvNeXt-Tiny",
        "params": "28.6M",
        "speed": "medium",
        "accuracy": "excellent",
        "best_for": "state-of-the-art accuracy, complex visual tasks",
        "input_size": 224,
        "default_lr": 0.0001,
        "default_epochs": 15,
    },
}


class ArchitectureAgent:
    """
    Agent that selects optimal architecture based on task analysis.

    Uses LLM for intelligent selection with rule-based fallback.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or config.openrouter_api_key
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    def select(
        self,
        task_description: str,
        dataset: Optional[DatasetInfo] = None,
        priority: str = "balanced"
    ) -> ArchitectureConfig:
        """
        Select the best architecture for a task.

        Args:
            task_description: What to classify
            dataset: Optional dataset info
            priority: "speed", "accuracy", or "balanced"

        Returns:
            ArchitectureConfig with model and hyperparameters
        """
        print(f"\n[Architecture Agent] Analyzing task...")
        print(f"  Priority: {priority}")

        # Try LLM selection
        if self.api_key:
            result = self._llm_select(task_description, dataset, priority)
            if result:
                print(f"  ✓ LLM recommended: {result.architecture}")
                print(f"    Reason: {result.reason}")
                return result

        # Fallback to rule-based
        print("  Using rule-based selection...")
        return self._rule_select(task_description, priority)

    def _llm_select(
        self,
        task_description: str,
        dataset: Optional[DatasetInfo],
        priority: str
    ) -> Optional[ArchitectureConfig]:
        """Use LLM for architecture selection."""
        try:
            arch_descriptions = "\n".join([
                f"- {k}: {v['name']} ({v['params']} params, {v['speed']}, {v['accuracy']} accuracy)"
                for k, v in ARCHITECTURES.items()
            ])

            dataset_info = ""
            if dataset:
                dataset_info = f"\nDataset: {dataset.title} ({dataset.num_classes} classes)"

            prompt = f"""Select the best CNN architecture for this classification task.

TASK: {task_description}
PRIORITY: {priority}{dataset_info}

ARCHITECTURES:
{arch_descriptions}

HYPERPARAMETER GUIDELINES:
- Simple tasks (2-10 classes): 10-15 epochs
- Complex/fine-grained (species, medical): 15-25 epochs
- learning_rate: 0.001 for small models, 0.0001 for larger models
- freeze_backbone: false for complex classification, true for simple tasks

Return JSON only:
{{"architecture": "key", "reason": "brief reason", "learning_rate": 0.001, "epochs": 15, "batch_size": 32, "freeze_backbone": false}}"""

            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 300,
                },
                timeout=30,
            )
            response.raise_for_status()

            content = response.json()["choices"][0]["message"]["content"]

            # Parse JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            result = json.loads(content.strip())

            arch_key = result.get("architecture", "mobilenet_v2")
            if arch_key not in ARCHITECTURES:
                arch_key = "mobilenet_v2"

            arch_info = ARCHITECTURES[arch_key]

            return ArchitectureConfig(
                architecture=arch_key,
                learning_rate=result.get("learning_rate", arch_info["default_lr"]),
                epochs=result.get("epochs", arch_info["default_epochs"]),
                batch_size=result.get("batch_size", 32),
                freeze_backbone=result.get("freeze_backbone", True),
                input_size=arch_info["input_size"],
                reason=result.get("reason", "LLM recommendation"),
            )

        except Exception as e:
            print(f"  LLM selection error: {e}")
            return None

    def _rule_select(self, task_description: str, priority: str) -> ArchitectureConfig:
        """Rule-based architecture selection."""
        task_lower = task_description.lower()

        # Select based on priority and keywords
        if priority == "speed":
            arch = "mobilenet_v2"
        elif priority == "accuracy":
            if any(w in task_lower for w in ["fine-grained", "species", "detailed", "medical"]):
                arch = "efficientnet_b4"
            else:
                arch = "convnext_tiny"
        elif any(w in task_lower for w in ["defect", "industrial", "inspection"]):
            arch = "efficientnet_b0"
        elif any(w in task_lower for w in ["mobile", "edge", "real-time", "fast"]):
            arch = "mobilenet_v2"
        else:
            arch = "efficientnet_b0"  # Good default

        info = ARCHITECTURES[arch]

        return ArchitectureConfig(
            architecture=arch,
            learning_rate=info["default_lr"],
            epochs=info["default_epochs"],
            batch_size=32,
            freeze_backbone=True,
            input_size=info["input_size"],
            reason=f"Rule-based: {info['best_for']}",
        )


# Convenience function
def select_architecture(
    task_description: str,
    dataset: Optional[DatasetInfo] = None,
    priority: str = "balanced"
) -> ArchitectureConfig:
    """Convenience function to select architecture."""
    agent = ArchitectureAgent()
    return agent.select(task_description, dataset, priority)
