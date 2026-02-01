"""
Dataset Discovery Module
========================
Finds and validates datasets for training with automatic fallbacks.

Features:
- MongoDB vector search for semantic matching
- Kaggle API validation before training
- Automatic fallback to known-good datasets
- Pre-flight accessibility checks
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import requests

from ..config import config


def get_kaggle_path() -> str:
    """Get the path to the kaggle executable in the same venv as Python."""
    # Find kaggle in the same directory as the Python executable
    python_dir = Path(sys.executable).parent
    kaggle_path = python_dir / "kaggle"
    if kaggle_path.exists():
        return str(kaggle_path)
    # Fallback to just "kaggle" and hope it's in PATH
    return "kaggle"


@dataclass
class DatasetInfo:
    """Information about a discovered dataset."""
    ref: str                           # Kaggle reference (user/dataset-name)
    title: str
    description: str = ""
    num_classes: int = 0
    class_names: list[str] = field(default_factory=list)
    size_bytes: int = 0
    download_count: int = 0
    is_validated: bool = False         # Whether we confirmed it's accessible
    validation_error: Optional[str] = None


# Known-good datasets that don't require special permissions
FALLBACK_DATASETS = {
    "bird": [
        DatasetInfo(ref="gpiosenka/100-bird-species", title="100 Bird Species"),  # Large, well-structured
        DatasetInfo(ref="umairshahpirzada/birds-20-species-image-classification", title="Birds 20 Species"),
        DatasetInfo(ref="wenewone/cub2002011", title="CUB-200-2011 Birds"),
    ],
    "cat": [
        DatasetInfo(ref="tongpython/cat-and-dog", title="Cats and Dogs"),
        DatasetInfo(ref="shaunthesheep/microsoft-catsvsdogs-dataset", title="Microsoft Cats vs Dogs"),
    ],
    "dog": [
        DatasetInfo(ref="tongpython/cat-and-dog", title="Cats and Dogs"),
        DatasetInfo(ref="jessicali9530/stanford-dogs-dataset", title="Stanford Dogs"),
    ],
    "flower": [
        DatasetInfo(ref="alxmamaev/flowers-recognition", title="Flowers Recognition"),
        DatasetInfo(ref="imsparsh/flowers-dataset", title="Flowers Dataset"),
    ],
    "defect": [
        DatasetInfo(ref="kaustubhdikshit/neu-surface-defect-database", title="NEU Surface Defect"),
        DatasetInfo(ref="fantacher/neu-metal-surface-defects-data", title="NEU Metal Surface Defects"),
    ],
    "metal": [
        DatasetInfo(ref="kaustubhdikshit/neu-surface-defect-database", title="NEU Surface Defect"),
        DatasetInfo(ref="fantacher/neu-metal-surface-defects-data", title="NEU Metal Surface Defects"),
    ],
    "fruit": [
        DatasetInfo(ref="moltean/fruits", title="Fruits 360"),
    ],
    "food": [
        DatasetInfo(ref="kmader/food41", title="Food-41"),
    ],
    "default": [
        DatasetInfo(ref="kaustubhdikshit/neu-surface-defect-database", title="NEU Surface Defect"),
    ],
}


class DatasetDiscovery:
    """
    Discovers and validates datasets for training.

    Implements a multi-stage discovery process:
    1. Try MongoDB vector search (if configured)
    2. Try keyword-based fallbacks
    3. Validate accessibility before returning
    4. Auto-retry with alternatives on failure
    """

    def __init__(self, mongodb_uri: str = None, openrouter_api_key: str = None):
        self.mongodb_uri = mongodb_uri or config.mongodb_uri
        self.openrouter_api_key = openrouter_api_key or config.openrouter_api_key
        self._kaggle_validated = False

    def discover(self, task_description: str, max_candidates: int = 5) -> DatasetInfo:
        """
        Discover the best dataset for a task.

        Args:
            task_description: What the user wants to classify
            max_candidates: Maximum number of candidates to try

        Returns:
            DatasetInfo with validated, accessible dataset

        Raises:
            RuntimeError: If no accessible dataset found
        """
        validated = self.discover_all(task_description, max_candidates)
        if validated:
            return validated[0]
        raise RuntimeError(f"No accessible dataset found for task: {task_description}")

    def discover_all(self, task_description: str, max_candidates: int = 5) -> list[DatasetInfo]:
        """
        Discover ALL validated datasets for a task (for self-healing fallbacks).

        Args:
            task_description: What the user wants to classify
            max_candidates: Maximum number of candidates to validate

        Returns:
            List of validated DatasetInfo objects (may be empty)
        """
        print(f"\n[Dataset Discovery] Task: {task_description}")

        # Collect candidate datasets
        candidates = []

        # Stage 1: Try MongoDB vector search
        mongo_results = self._search_mongodb(task_description)
        candidates.extend(mongo_results)
        print(f"  MongoDB search: {len(mongo_results)} candidates")

        # Stage 2: Add keyword-based fallbacks
        fallbacks = self._get_fallbacks(task_description)
        candidates.extend(fallbacks)
        print(f"  Fallback datasets: {len(fallbacks)} candidates")

        # Stage 3: Deduplicate by ref
        seen = set()
        unique_candidates = []
        for c in candidates:
            if c.ref not in seen:
                seen.add(c.ref)
                unique_candidates.append(c)

        print(f"  Total unique candidates: {len(unique_candidates)}")

        # Stage 4: Validate ALL candidates
        validated_datasets = []
        for i, candidate in enumerate(unique_candidates[:max_candidates]):
            print(f"\n  [{i+1}/{min(len(unique_candidates), max_candidates)}] Validating: {candidate.ref}")

            validated = self._validate_dataset(candidate)
            if validated.is_validated:
                print(f"  ✓ Dataset accessible: {validated.ref}")
                validated_datasets.append(validated)
            else:
                print(f"  ✗ Not accessible: {validated.validation_error}")

        print(f"\n  Validated {len(validated_datasets)} datasets")
        return validated_datasets

    def _search_mongodb(self, query: str) -> list[DatasetInfo]:
        """Search MongoDB for datasets using vector similarity."""
        if not self.mongodb_uri:
            return []

        try:
            from pymongo import MongoClient
            from sentence_transformers import SentenceTransformer

            client = MongoClient(self.mongodb_uri)
            db = client.get_default_database()
            collection = db["kaggle_datasets"]

            # Generate embedding for query
            model = SentenceTransformer("all-MiniLM-L6-v2")
            query_embedding = model.encode(query).tolist()

            # Vector search
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": 50,
                        "limit": 10,
                    }
                },
                {
                    "$match": {
                        "downloadCount": {"$gte": 100}  # Quality filter
                    }
                }
            ]

            results = list(collection.aggregate(pipeline))

            return [
                DatasetInfo(
                    ref=r["ref"],
                    title=r.get("title", r["ref"]),
                    description=r.get("description", "")[:200],
                    download_count=r.get("downloadCount", 0),
                    size_bytes=r.get("totalBytes", 0),
                )
                for r in results
            ]

        except Exception as e:
            print(f"  MongoDB search error: {e}")
            return []

    def _get_fallbacks(self, task_description: str) -> list[DatasetInfo]:
        """Get fallback datasets based on keywords."""
        task_lower = task_description.lower()

        results = []
        for keyword, datasets in FALLBACK_DATASETS.items():
            if keyword in task_lower:
                results.extend(datasets)

        # Always add default as last resort
        if not results:
            results.extend(FALLBACK_DATASETS["default"])

        return results

    def _validate_dataset(self, dataset: DatasetInfo) -> DatasetInfo:
        """
        Validate that a dataset is accessible via Kaggle API.

        Does a lightweight metadata check without downloading the full dataset.
        More lenient - tries multiple methods before rejecting.
        """
        kaggle_cmd = get_kaggle_path()
        try:
            # Method 1: Try metadata check
            result = subprocess.run(
                [kaggle_cmd, "datasets", "metadata", "-d", dataset.ref, "-p", "/tmp"],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode == 0:
                # Try to read metadata
                metadata_path = Path("/tmp/dataset-metadata.json")
                if metadata_path.exists():
                    with open(metadata_path) as f:
                        meta = json.load(f)
                    dataset.title = meta.get("title", dataset.title)
                    metadata_path.unlink()  # Cleanup

                dataset.is_validated = True
                return dataset

            # Method 2: Try listing dataset files (more lenient)
            list_result = subprocess.run(
                [kaggle_cmd, "datasets", "files", "-d", dataset.ref],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if list_result.returncode == 0 and list_result.stdout:
                # Dataset exists and we can list files
                dataset.is_validated = True
                return dataset

            # Check for specific errors
            combined_stderr = (result.stderr or "") + (list_result.stderr or "")
            if "403" in combined_stderr or "Forbidden" in combined_stderr:
                dataset.validation_error = "Requires terms acceptance on Kaggle"
            elif "404" in combined_stderr or "Not Found" in combined_stderr:
                dataset.validation_error = "Dataset not found"
            elif "401" in combined_stderr or "Unauthorized" in combined_stderr:
                dataset.validation_error = "Invalid Kaggle credentials"
            else:
                dataset.validation_error = combined_stderr[:100] if combined_stderr else "Unknown error"

            return dataset

        except subprocess.TimeoutExpired:
            dataset.validation_error = "Validation timeout"
            return dataset
        except Exception as e:
            dataset.validation_error = str(e)
            return dataset

    def _ask_llm_for_datasets(self, task_description: str) -> list[DatasetInfo]:
        """Use LLM to suggest Kaggle dataset names."""
        if not self.openrouter_api_key:
            return []

        try:
            prompt = f"""Suggest 3 Kaggle datasets for this task: {task_description}

Return ONLY a JSON array of dataset references in format:
["username/dataset-name", "username2/dataset-name2", "username3/dataset-name3"]

Only suggest real, popular Kaggle datasets. No explanation, just the JSON array."""

            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 200,
                },
                timeout=30,
            )

            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]

            # Parse JSON array
            import re
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                refs = json.loads(match.group())
                return [DatasetInfo(ref=r, title=r.split("/")[-1]) for r in refs]

        except Exception as e:
            print(f"  LLM suggestion error: {e}")

        return []


# Convenience function
def discover_dataset(task_description: str) -> DatasetInfo:
    """Convenience function to discover a dataset."""
    discovery = DatasetDiscovery()
    return discovery.discover(task_description)
