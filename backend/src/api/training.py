"""
Training API Routes
===================
Endpoints for ML model training and inference.
"""

import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field

from ..config import config
from ..orchestrator import Orchestrator


def extract_kaggle_ref(url: str) -> Optional[str]:
    """Extract Kaggle dataset reference from URL.

    Handles both dataset URLs and competition URLs:
    - https://www.kaggle.com/datasets/username/dataset-name → username/dataset-name
    - https://www.kaggle.com/c/competition-name → None (competitions need special handling)
    - https://www.kaggle.com/username/dataset-name → username/dataset-name
    """
    if not url or "kaggle.com" not in url:
        return None

    # Handle /datasets/ URLs (preferred)
    if "kaggle.com/datasets/" in url:
        parts = url.split("kaggle.com/datasets/")
        if len(parts) > 1:
            ref = parts[1].rstrip("/").split("?")[0]
            # Ensure it has username/dataset format
            if "/" in ref:
                return ref

    # Handle direct /username/dataset URLs (not /c/ competitions)
    if "kaggle.com/" in url and "/c/" not in url and "/datasets/" not in url:
        parts = url.split("kaggle.com/")
        if len(parts) > 1:
            path = parts[1].rstrip("/").split("?")[0]
            # Must have exactly one slash (username/dataset)
            if path.count("/") == 1 and not path.startswith(("c/", "code/", "discussion/")):
                return path

    # Competition URLs (/c/) don't have direct dataset refs
    return None


router = APIRouter(prefix="/training", tags=["Training"])

# Thread pool for blocking ML tasks
executor = ThreadPoolExecutor(max_workers=2)

# In-memory job storage
jobs: dict[str, dict] = {}


# Request/Response Models
class TrainRequest(BaseModel):
    """Request to start training."""
    task: str = Field(..., description="Task description (e.g., 'identify bird species')")
    priority: str = Field(default="balanced", description="Priority: speed, accuracy, or balanced")
    dataset_ref: Optional[str] = Field(None, description="Optional Kaggle dataset reference")
    project_id: Optional[str] = Field(None, description="Discovery project ID to get selected source from")
    skip_benchmark: bool = Field(default=False, description="Skip benchmarking step")


class TrainResponse(BaseModel):
    """Response from starting training."""
    job_id: str
    status: str
    message: str


class JobStatus(BaseModel):
    """Status of a training job."""
    job_id: str
    status: str
    task: str
    started_at: str
    completed_at: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class ModelInfo(BaseModel):
    """Information about a trained model."""
    filename: str
    architecture: str
    accuracy: float
    num_classes: int
    class_names: list[str]
    created_at: str
    size_mb: float


class PredictResponse(BaseModel):
    """Response from prediction."""
    predictions: list[dict]
    model: str
    inference_time_ms: float


def run_training_sync(
    job_id: str,
    task: str,
    priority: str,
    dataset_ref: Optional[str],
    skip_benchmark: bool,
):
    """Run training in background thread."""
    try:
        jobs[job_id]["status"] = "running"

        orchestrator = Orchestrator()
        result = orchestrator.run(
            task_description=task,
            priority=priority,
            skip_training=False,
            skip_benchmark=skip_benchmark,
            dataset_ref=dataset_ref,  # Pass pre-selected dataset reference
        )

        # Convert result to dict
        result_dict = {
            "success": result.success,
            "task": result.task,
            "error": result.error,
        }

        if result.dataset:
            result_dict["dataset"] = {
                "ref": result.dataset.ref,
                "title": result.dataset.title,
            }

        if result.architecture:
            result_dict["architecture"] = {
                "name": result.architecture.architecture,
                "epochs": result.architecture.epochs,
                "learning_rate": result.architecture.learning_rate,
                "reason": result.architecture.reason,
            }

        if result.training:
            result_dict["training"] = {
                "model_filename": result.training.model_filename,
                "accuracy": result.training.accuracy,
                "class_names": result.training.class_names,
                "num_classes": result.training.num_classes,
                "training_time_s": result.training.training_time_s,
            }

        if result.benchmark:
            result_dict["benchmark"] = {
                "local_accuracy": result.benchmark.local.accuracy,
                "api_accuracy": result.benchmark.api.accuracy,
                "speedup": result.benchmark.speedup,
                "cost_savings_1m": result.benchmark.cost_savings_1m,
            }

        jobs[job_id]["status"] = "completed" if result.success else "failed"
        jobs[job_id]["result"] = result_dict
        jobs[job_id]["completed_at"] = datetime.now().isoformat()

        if not result.success:
            jobs[job_id]["error"] = result.error

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["completed_at"] = datetime.now().isoformat()


@router.post("/start", response_model=TrainResponse)
async def start_training(request: TrainRequest):
    """Start a new training job."""
    from bson import ObjectId
    from ..db import mongodb

    # Validate config
    errors = config.validate()
    if errors:
        raise HTTPException(status_code=500, detail=f"Configuration errors: {errors}")

    # Get dataset_ref from discovery project if project_id provided
    dataset_ref = request.dataset_ref
    if request.project_id and not dataset_ref:
        try:
            project_oid = ObjectId(request.project_id)
            project = await mongodb.discovery_projects.find_one({"project_id": project_oid})

            if project:
                # Try to get from selected_source field first
                selected = project.get("selected_source")
                if selected:
                    url = selected.get("url", "")
                    # Extract Kaggle dataset ref from URL
                    dataset_ref = extract_kaggle_ref(url)
                    if dataset_ref:
                        print(f"[Training] Using dataset from discovery: {dataset_ref}")

                # Fall back to sources with status=selected or backup (prefer datasets over competitions)
                if not dataset_ref:
                    sources = project.get("sources", [])
                    # First try selected sources
                    for source in sources:
                        if source.get("status") == "selected":
                            ref = extract_kaggle_ref(source.get("url", ""))
                            if ref:
                                dataset_ref = ref
                                print(f"[Training] Using dataset from discovery sources: {dataset_ref}")
                                break

                    # If still no dataset, try backup sources (sorted by relevance)
                    if not dataset_ref:
                        backup_sources = [s for s in sources if s.get("status") == "backup"]
                        backup_sources.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
                        for source in backup_sources:
                            ref = extract_kaggle_ref(source.get("url", ""))
                            if ref:
                                dataset_ref = ref
                                print(f"[Training] Using backup dataset: {dataset_ref}")
                                break
        except Exception as e:
            print(f"[Training] Error fetching discovery project: {e}")

    # Create job
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "task": request.task,
        "priority": request.priority,
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "result": None,
        "error": None,
    }

    # Run training in background
    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        executor,
        run_training_sync,
        job_id,
        request.task,
        request.priority,
        dataset_ref,
        request.skip_benchmark,
    )

    return TrainResponse(
        job_id=job_id,
        status="pending",
        message=f"Training job started for: {request.task}" + (f" (dataset: {dataset_ref})" if dataset_ref else ""),
    )


@router.get("/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get status of a training job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatus(**jobs[job_id])


@router.get("/", response_model=dict)
async def list_jobs():
    """List all training jobs."""
    return {
        "jobs": list(jobs.values()),
        "total": len(jobs),
    }


@router.get("/models/list", response_model=list[ModelInfo])
async def list_models():
    """List all trained models."""
    import torch

    models = []

    if not config.models_dir.exists():
        return []

    for model_file in config.models_dir.glob("*.pth"):
        try:
            checkpoint = torch.load(model_file, map_location="cpu")

            models.append(ModelInfo(
                filename=model_file.name,
                architecture=checkpoint.get("architecture", "unknown"),
                accuracy=checkpoint.get("accuracy", 0),
                num_classes=checkpoint.get("num_classes", 0),
                class_names=checkpoint.get("class_names", []),
                created_at=datetime.fromtimestamp(model_file.stat().st_mtime).isoformat(),
                size_mb=model_file.stat().st_size / (1024 * 1024),
            ))
        except Exception as e:
            print(f"Error loading model {model_file}: {e}")

    return models


@router.get("/models/{model_name}")
async def get_model(model_name: str):
    """Get details of a specific model."""
    import torch

    model_path = config.models_dir / model_name

    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")

    checkpoint = torch.load(model_path, map_location="cpu")

    return {
        "filename": model_name,
        "architecture": checkpoint.get("architecture", "unknown"),
        "accuracy": checkpoint.get("accuracy", 0),
        "num_classes": checkpoint.get("num_classes", 0),
        "class_names": checkpoint.get("class_names", []),
        "input_size": checkpoint.get("input_size", 224),
        "dataset_ref": checkpoint.get("dataset_ref", "unknown"),
    }


@router.post("/predict", response_model=PredictResponse)
async def predict(model_name: str, file: UploadFile = File(...)):
    """Run inference on an uploaded image."""
    import torch
    import time
    from PIL import Image
    from torchvision import transforms
    from io import BytesIO

    model_path = config.models_dir / model_name

    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")

    # Load checkpoint
    checkpoint = torch.load(model_path, map_location="cpu")

    # Import here to avoid circular imports
    import sys
    sys.path.insert(0, str(config.project_root))
    from modal_app import load_architecture

    architecture = checkpoint.get("architecture", "mobilenet_v2")
    num_classes = checkpoint.get("num_classes", 2)
    input_size = checkpoint.get("input_size", 224)
    class_names = checkpoint.get("class_names", [])

    model, _ = load_architecture(architecture, num_classes, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Process image
    image_data = await file.read()
    image = Image.open(BytesIO(image_data)).convert("RGB")

    transform = transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    input_tensor = transform(image).unsqueeze(0)

    # Inference
    start_time = time.time()
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
    inference_time = (time.time() - start_time) * 1000

    # Get top predictions
    top_k = min(5, len(class_names))
    top_probs, top_indices = torch.topk(probabilities, top_k)

    predictions = []
    for prob, idx in zip(top_probs.tolist(), top_indices.tolist()):
        predictions.append({
            "class": class_names[idx] if idx < len(class_names) else f"class_{idx}",
            "probability": round(prob * 100, 2),
        })

    return PredictResponse(
        predictions=predictions,
        model=model_name,
        inference_time_ms=round(inference_time, 2),
    )
