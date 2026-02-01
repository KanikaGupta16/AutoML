"""
AutoML Orchestrator
===================
Main workflow that coordinates all components.

Flow:
1. Dataset Discovery (with validation & fallbacks)
2. Architecture Selection (LLM-based)
3. Training on Modal H100 (with retries)
4. Benchmark (local vs API)
5. Report Generation
"""

import json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

import torch

from .config import config
from .dataset import DatasetDiscovery, DatasetInfo
from .model import ArchitectureAgent, ArchitectureConfig
from .training import Trainer, TrainingResult
from .benchmark import Benchmark, ComparisonReport


@dataclass
class WorkflowResult:
    """Complete workflow result."""
    success: bool
    task: str
    dataset: Optional[DatasetInfo]
    architecture: Optional[ArchitectureConfig]
    training: Optional[TrainingResult]
    benchmark: Optional[ComparisonReport]
    error: Optional[str] = None


class Orchestrator:
    """
    Orchestrates the complete AutoML workflow.

    Handles all stages with proper error handling and recovery.
    """

    def __init__(self):
        self.dataset_discovery = DatasetDiscovery()
        self.arch_agent = ArchitectureAgent()
        self.trainer = Trainer()

    def run(
        self,
        task_description: str,
        priority: str = "balanced",
        skip_training: bool = False,
        skip_benchmark: bool = False,
        dataset_ref: Optional[str] = None,
    ) -> WorkflowResult:
        """
        Run the complete AutoML workflow.

        Args:
            task_description: What to classify (e.g., "identify bird species")
            priority: "speed", "accuracy", or "balanced"
            skip_training: Skip training if model exists
            skip_benchmark: Skip benchmarking
            dataset_ref: Optional pre-selected dataset reference (skips discovery)

        Returns:
            WorkflowResult with all outputs
        """
        print("\n" + "=" * 60)
        print("AUTOML WORKFLOW")
        print("=" * 60)
        print(f"Task: {task_description}")
        print(f"Priority: {priority}")
        if dataset_ref:
            print(f"Pre-selected dataset: {dataset_ref}")

        # Generate task name
        task_name = self._generate_task_name(task_description)

        result = WorkflowResult(
            success=False,
            task=task_description,
            dataset=None,
            architecture=None,
            training=None,
            benchmark=None,
        )

        # Stage 1: Dataset Discovery (skip if dataset_ref provided)
        print("\n" + "-" * 60)
        print("STAGE 1: Dataset Discovery")
        print("-" * 60)

        try:
            if dataset_ref:
                # Use pre-selected dataset, skip discovery
                print(f"  Using pre-selected dataset: {dataset_ref}")
                dataset = DatasetInfo(
                    ref=dataset_ref,
                    title=dataset_ref.split("/")[-1] if "/" in dataset_ref else dataset_ref,
                    is_validated=True,  # Already validated during discovery phase
                )
                fallback_datasets = []
                result.dataset = dataset
                print(f"\n  ✓ Dataset: {dataset.ref}")
            else:
                # Run full discovery
                all_datasets = self.dataset_discovery.discover_all(task_description)
                if not all_datasets:
                    raise RuntimeError("No accessible datasets found")
                dataset = all_datasets[0]  # Primary dataset
                fallback_datasets = all_datasets[1:]  # Fallbacks for self-healing
                result.dataset = dataset
                print(f"\n  Primary: {dataset.ref}")
                if fallback_datasets:
                    print(f"  Fallbacks: {[d.ref for d in fallback_datasets]}")
        except Exception as e:
            result.error = f"Dataset discovery failed: {e}"
            print(f"\n✗ {result.error}")
            return result

        # Stage 2: Architecture Selection
        print("\n" + "-" * 60)
        print("STAGE 2: Architecture Selection")
        print("-" * 60)

        try:
            arch_config = self.arch_agent.select(task_description, dataset, priority)
            result.architecture = arch_config
        except Exception as e:
            result.error = f"Architecture selection failed: {e}"
            print(f"\n✗ {result.error}")
            return result

        # Stage 3: Training
        print("\n" + "-" * 60)
        print("STAGE 3: Training")
        print("-" * 60)

        model_path = config.models_dir / f"{task_name}_{arch_config.architecture}.pth"

        if skip_training and model_path.exists():
            print(f"  Skipping training - model exists at {model_path}")
            # Load existing model info (torch imported at top of file)
            checkpoint = torch.load(model_path, map_location="cpu")
            result.training = TrainingResult(
                success=True,
                model_filename=model_path.name,
                model_path=model_path,
                architecture=arch_config.architecture,
                accuracy=checkpoint.get("accuracy", 0),
                class_names=checkpoint.get("class_names", []),
                num_classes=checkpoint.get("num_classes", 0),
                training_time_s=0,
            )
        else:
            try:
                training_result = self.trainer.train(
                    task_name, dataset, arch_config,
                    fallback_datasets=fallback_datasets  # Self-healing: try alternatives
                )
                result.training = training_result

                if not training_result.success:
                    result.error = f"Training failed: {training_result.error}"
                    print(f"\n✗ {result.error}")
                    return result

            except Exception as e:
                result.error = f"Training error: {e}"
                print(f"\n✗ {result.error}")
                return result

        # Stage 4: Benchmark
        print("\n" + "-" * 60)
        print("STAGE 4: Benchmark")
        print("-" * 60)

        if skip_benchmark:
            print("  Skipped (--skip-benchmark flag)")
        elif not result.training:
            print("  Skipped (no training result)")
        elif not result.training.model_path:
            print("  Skipped (model download failed - check Modal volume)")
        else:
            try:
                # Get actual dataset used from checkpoint (may differ from original due to fallback)
                checkpoint = torch.load(result.training.model_path, map_location="cpu")
                actual_dataset_ref = checkpoint.get("dataset_ref", dataset.ref)
                print(f"  Using dataset: {actual_dataset_ref}")

                benchmark = Benchmark(result.training.model_path)
                test_data = benchmark.get_test_images(actual_dataset_ref, num_images=30)

                if test_data:
                    comparison = benchmark.compare(test_data)
                    result.benchmark = comparison
                    benchmark.print_report(comparison)
                else:
                    print("  No test images available for benchmark")

            except Exception as e:
                print(f"  Benchmark error: {e}")
                # Don't fail the whole workflow for benchmark errors

        # Success
        result.success = True
        self._save_result(result, task_name)

        print("\n" + "=" * 60)
        print("✓ WORKFLOW COMPLETE")
        print("=" * 60)

        return result

    def _generate_task_name(self, task_description: str) -> str:
        """Generate a clean task name from description."""
        words = task_description.lower().split()[:3]
        name = "_".join(words)
        name = "".join(c for c in name if c.isalnum() or c == "_")
        return name[:30]

    def _save_result(self, result: WorkflowResult, task_name: str):
        """Save workflow result to JSON."""
        output = {
            "task": result.task,
            "success": result.success,
            "dataset": asdict(result.dataset) if result.dataset else None,
            "architecture": asdict(result.architecture) if result.architecture else None,
            "training": {
                "success": result.training.success,
                "model_filename": result.training.model_filename,
                "accuracy": result.training.accuracy,
                "class_names": result.training.class_names,
                "training_time_s": result.training.training_time_s,
            } if result.training else None,
            "benchmark": {
                "local_accuracy": result.benchmark.local.accuracy,
                "api_accuracy": result.benchmark.api.accuracy,
                "speedup": result.benchmark.speedup,
                "cost_savings_1m": result.benchmark.cost_savings_1m,
            } if result.benchmark else None,
        }

        output_path = config.project_root / f"{task_name}_result.json"
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2, default=str)

        print(f"\n  Results saved to {output_path}")


def run_workflow(
    task_description: str,
    priority: str = "balanced",
    skip_training: bool = False,
    skip_benchmark: bool = False,
    dataset_ref: Optional[str] = None,
) -> WorkflowResult:
    """Convenience function to run the workflow."""
    orchestrator = Orchestrator()
    return orchestrator.run(task_description, priority, skip_training, skip_benchmark, dataset_ref)
