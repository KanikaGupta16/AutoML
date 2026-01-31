#!/usr/bin/env python3
"""
AutoML CLI
==========
Command-line interface for the AutoML Vision system.

Usage:
    python run.py "identify bird species"
    python run.py "detect metal defects" --priority accuracy
    python run.py "classify cats vs dogs" --skip-training
"""

import sys
import argparse

from src.orchestrator import run_workflow
from src.config import config


def main():
    parser = argparse.ArgumentParser(
        description="AutoML Vision - Train and benchmark image classifiers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run.py "identify bird species"
    python run.py "detect metal surface defects" --priority accuracy
    python run.py "classify cats and dogs" --priority speed
    python run.py "classify flowers" --skip-training --skip-benchmark
        """
    )

    parser.add_argument(
        "task",
        help="Task description (what to classify)"
    )
    parser.add_argument(
        "--priority",
        choices=["speed", "accuracy", "balanced"],
        default="balanced",
        help="Optimization priority (default: balanced)"
    )
    parser.add_argument(
        "--skip-training",
        action="store_true",
        help="Skip training if model already exists"
    )
    parser.add_argument(
        "--skip-benchmark",
        action="store_true",
        help="Skip benchmarking"
    )

    args = parser.parse_args()

    # Validate config
    errors = config.validate()
    if errors:
        print("Configuration errors:")
        for e in errors:
            print(f"  - {e}")
        print("\nPlease set required environment variables in .env")
        sys.exit(1)

    # Run workflow
    try:
        result = run_workflow(
            task_description=args.task,
            priority=args.priority,
            skip_training=args.skip_training,
            skip_benchmark=args.skip_benchmark,
        )

        if result.success:
            print("\n✓ Workflow completed successfully!")
            sys.exit(0)
        else:
            print(f"\n✗ Workflow failed: {result.error}")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\nWorkflow interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
