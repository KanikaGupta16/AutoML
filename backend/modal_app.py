"""
Modal Training App
==================
Runs model training on Modal's H100 GPU infrastructure.

This file is executed by Modal - it contains the actual training logic
that runs in the cloud.
"""

import modal
import os
import shutil

# Create Modal app
app = modal.App("automl-trainer")

# Container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "torch",
        "torchvision",
        "timm",
        "Pillow",
        "tqdm",
        "kaggle",
    ])
    .env({"KAGGLE_CONFIG_DIR": "/root/.kaggle"})
)

# Persistent volume for models
volume = modal.Volume.from_name("automl-models", create_if_missing=True)
MODEL_DIR = "/models"


def load_architecture(arch_name: str, num_classes: int, pretrained: bool = True):
    """Load a model architecture with optional pretrained weights."""
    import torch.nn as nn
    from torchvision import models
    import timm

    arch_configs = {
        "mobilenet_v2": {
            "input_size": 224,
            "loader": lambda: models.mobilenet_v2(
                weights=models.MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
            ),
            "classifier_attr": "classifier",
            "classifier_idx": 1,
            "in_features_attr": "last_channel",
        },
        "resnet50": {
            "input_size": 224,
            "loader": lambda: models.resnet50(
                weights=models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None
            ),
            "classifier_attr": "fc",
            "in_features_attr": lambda m: m.fc.in_features,
        },
        "efficientnet_b0": {
            "input_size": 224,
            "loader": lambda: timm.create_model("efficientnet_b0", pretrained=pretrained),
            "classifier_attr": "classifier",
            "in_features_attr": lambda m: m.classifier.in_features,
        },
        "efficientnet_b4": {
            "input_size": 380,
            "loader": lambda: timm.create_model("efficientnet_b4", pretrained=pretrained),
            "classifier_attr": "classifier",
            "in_features_attr": lambda m: m.classifier.in_features,
        },
        "convnext_tiny": {
            "input_size": 224,
            "loader": lambda: timm.create_model("convnext_tiny", pretrained=pretrained),
            "classifier_attr": "head.fc",
            "in_features_attr": lambda m: m.head.fc.in_features,
        },
    }

    if arch_name not in arch_configs:
        print(f"Unknown architecture {arch_name}, using mobilenet_v2")
        arch_name = "mobilenet_v2"

    config = arch_configs[arch_name]
    model = config["loader"]()

    # Get input features
    if callable(config["in_features_attr"]):
        in_features = config["in_features_attr"](model)
    else:
        in_features = getattr(model, config["in_features_attr"])

    # Replace classifier head
    if "." in config["classifier_attr"]:
        parts = config["classifier_attr"].split(".")
        parent = model
        for part in parts[:-1]:
            parent = getattr(parent, part)
        setattr(parent, parts[-1], nn.Linear(in_features, num_classes))
    elif "classifier_idx" in config:
        classifier = getattr(model, config["classifier_attr"])
        classifier[config["classifier_idx"]] = nn.Linear(in_features, num_classes)
    else:
        setattr(model, config["classifier_attr"], nn.Linear(in_features, num_classes))

    return model, config["input_size"]


@app.function(
    image=image,
    gpu="H100",
    timeout=3600,
    secrets=[modal.Secret.from_name("kaggle-secret")],
    volumes={MODEL_DIR: volume},
)
def train_model(
    dataset_ref: str,
    task_name: str,
    architecture: str = "mobilenet_v2",
    epochs: int = 10,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    freeze_backbone: bool = False,
) -> dict:
    """Train a model on Modal H100."""
    import subprocess
    import json
    import time
    from pathlib import Path

    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, random_split
    from torchvision import datasets, transforms
    from tqdm import tqdm

    # Setup Kaggle credentials
    kaggle_dir = Path("/root/.kaggle")
    kaggle_dir.mkdir(parents=True, exist_ok=True)
    kaggle_json = kaggle_dir / "kaggle.json"
    kaggle_json.write_text(json.dumps({
        "username": os.environ.get("KAGGLE_USERNAME", ""),
        "key": os.environ.get("KAGGLE_KEY", "")
    }))
    kaggle_json.chmod(0o600)

    # Setup directories
    data_dir = Path("/tmp/dataset")
    data_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("AUTOML TRAINING")
    print("=" * 60)
    print(f"Architecture: {architecture}")
    print(f"Dataset: {dataset_ref}")
    print(f"Epochs: {epochs}, Batch: {batch_size}, LR: {learning_rate}")
    print("=" * 60)

    # Download dataset
    print(f"\nDownloading dataset: {dataset_ref}")
    result = subprocess.run(
        ["kaggle", "datasets", "download", "-d", dataset_ref, "-p", str(data_dir), "--unzip"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Dataset download failed: {result.stderr}")

    # Debug: Print directory structure
    def print_tree(path: Path, prefix: str = "", max_depth: int = 3, current_depth: int = 0):
        if current_depth >= max_depth:
            return
        try:
            items = sorted(path.iterdir())[:20]  # Limit items shown
            for i, item in enumerate(items):
                is_last = i == len(items) - 1
                print(f"{prefix}{'└── ' if is_last else '├── '}{item.name}{'/' if item.is_dir() else ''}")
                if item.is_dir():
                    extension = "    " if is_last else "│   "
                    print_tree(item, prefix + extension, max_depth, current_depth + 1)
        except Exception as e:
            print(f"{prefix}Error reading: {e}")

    print("\nDataset structure:")
    print_tree(data_dir, max_depth=4)

    # Find and prepare image data - handle nested/split structures
    extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tiff'}
    skip_names = {'__MACOSX', '.ipynb_checkpoints', '__pycache__', '.git'}
    split_names = {'train', 'training', 'test', 'testing', 'valid', 'validation', 'val'}

    def count_images_in_dir(path: Path) -> int:
        """Count image files recursively."""
        count = 0
        try:
            for f in path.rglob("*"):
                if f.is_file() and f.suffix.lower() in extensions:
                    count += 1
        except:
            pass
        return count

    def is_class_folder(path: Path) -> bool:
        """Check if a folder contains images (is a class folder)."""
        try:
            for f in path.iterdir():
                if f.is_file() and f.suffix.lower() in extensions:
                    return True
        except:
            pass
        return False

    def find_class_root(path: Path) -> Path:
        """Find directory containing class folders with images."""
        subdirs = [d for d in path.iterdir() if d.is_dir() and d.name not in skip_names]

        if not subdirs:
            return path

        # Check if current subdirs are class folders (contain images directly)
        class_subdirs = [d for d in subdirs if is_class_folder(d)]
        if len(class_subdirs) >= 2:
            print(f"  Found {len(class_subdirs)} class folders at {path}")
            return path

        # Check for train/valid/test structure - use 'train' if available
        for name in ['train', 'Train', 'TRAIN', 'training']:
            train_dir = path / name
            if train_dir.exists() and train_dir.is_dir():
                nested_subdirs = [d for d in train_dir.iterdir() if d.is_dir() and d.name not in skip_names]
                if len(nested_subdirs) >= 2 and any(is_class_folder(d) for d in nested_subdirs):
                    print(f"  Found train folder with class structure at {train_dir}")
                    return train_dir

        # Recurse into subdirs
        for subdir in subdirs:
            result = find_class_root(subdir)
            if result != subdir:
                return result
            # Check this subdir's children for class folders
            nested = [d for d in subdir.iterdir() if d.is_dir() and d.name not in skip_names]
            if len(nested) >= 2 and any(is_class_folder(d) for d in nested):
                return subdir

        return path

    def merge_split_datasets(base_path: Path) -> Path:
        """
        If dataset has train/valid/test splits, merge them into a single directory.
        This allows ImageFolder to work with all data.
        """
        merged_dir = Path("/tmp/merged_dataset")
        subdirs = [d for d in base_path.iterdir() if d.is_dir() and d.name not in skip_names]
        subdir_names = {d.name.lower() for d in subdirs}

        # Check if this looks like a split dataset
        if not subdir_names.intersection(split_names):
            return base_path  # Not a split dataset

        print(f"  Detected split dataset structure, merging...")

        # Find all class names across splits
        class_names = set()
        split_dirs = []
        for subdir in subdirs:
            if subdir.name.lower() in split_names:
                split_dirs.append(subdir)
                for class_dir in subdir.iterdir():
                    if class_dir.is_dir() and class_dir.name not in skip_names:
                        class_names.add(class_dir.name)

        if not class_names:
            return base_path  # Couldn't find classes

        # Create merged structure
        if merged_dir.exists():
            shutil.rmtree(merged_dir)
        merged_dir.mkdir(parents=True)

        for class_name in class_names:
            (merged_dir / class_name).mkdir()

        # Copy files from all splits
        file_count = 0
        for split_dir in split_dirs:
            for class_dir in split_dir.iterdir():
                if class_dir.is_dir() and class_dir.name in class_names:
                    for img_file in class_dir.iterdir():
                        if img_file.is_file() and img_file.suffix.lower() in extensions:
                            # Use unique name to avoid conflicts
                            dest = merged_dir / class_dir.name / f"{split_dir.name}_{img_file.name}"
                            shutil.copy2(img_file, dest)
                            file_count += 1

        print(f"  Merged {file_count} images from {len(split_dirs)} splits into {len(class_names)} classes")
        return merged_dir

    # Try to find and prepare the dataset
    print("\nAnalyzing dataset structure...")
    data_dir = find_class_root(data_dir)
    print(f"Initial class root: {data_dir}")

    # Check if we need to merge splits
    data_dir = merge_split_datasets(data_dir)
    print(f"After merge check: {data_dir}")

    class_dirs = [d for d in data_dir.iterdir() if d.is_dir() and d.name not in skip_names]

    # If still no class dirs, do exhaustive search
    if len(class_dirs) < 2:
        print("No class folders found, doing exhaustive search...")
        original_data_dir = Path("/tmp/dataset")

        best_dir = None
        best_count = 0

        for item in original_data_dir.rglob("*"):
            if item.is_dir():
                subdirs = [d for d in item.iterdir() if d.is_dir() and d.name not in skip_names]
                class_count = sum(1 for d in subdirs if is_class_folder(d))
                if class_count >= 2 and class_count > best_count:
                    best_count = class_count
                    best_dir = item
                    print(f"  Found candidate: {item} with {class_count} classes")

        if best_dir:
            data_dir = best_dir
            # Try merge again on the found directory
            data_dir = merge_split_datasets(data_dir)
            class_dirs = [d for d in data_dir.iterdir() if d.is_dir() and d.name not in skip_names]

    print(f"Final data directory: {data_dir}")

    num_classes = len(class_dirs)
    class_names = sorted([d.name for d in class_dirs])

    if num_classes == 0:
        raise RuntimeError(f"No class folders found in dataset. Check dataset structure.")

    print(f"Found {num_classes} classes: {class_names[:10]}{'...' if len(class_names) > 10 else ''}")

    # Setup device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")

    # Load model
    model, input_size = load_architecture(architecture, num_classes)

    if freeze_backbone:
        for param in model.parameters():
            param.requires_grad = False
        # Unfreeze classifier
        if hasattr(model, 'classifier'):
            for param in model.classifier.parameters():
                param.requires_grad = True
        elif hasattr(model, 'fc'):
            for param in model.fc.parameters():
                param.requires_grad = True
        elif hasattr(model, 'head'):
            for param in model.head.parameters():
                param.requires_grad = True

    model = model.to(device)
    print(f"Model: {architecture} ({sum(p.numel() for p in model.parameters()):,} params)")

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Load dataset
    full_dataset = datasets.ImageFolder(str(data_dir), transform=train_transform)
    val_size = int(len(full_dataset) * 0.2)
    train_size = len(full_dataset) - val_size

    train_dataset, val_dataset = random_split(
        full_dataset, [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)

    print(f"Train: {len(train_dataset)}, Val: {len(val_dataset)}")

    # Training
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=learning_rate)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_acc = 0.0
    training_start = time.time()

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}"):
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()

        scheduler.step()

        # Validate
        model.eval()
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

        train_acc = 100. * train_correct / train_total
        val_acc = 100. * val_correct / val_total

        print(f"Epoch {epoch+1}: Train {train_acc:.1f}%, Val {val_acc:.1f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc

    training_time = time.time() - training_start

    # Save model
    model_filename = f"{task_name}_{architecture}.pth"
    model_path = Path(MODEL_DIR) / model_filename

    torch.save({
        "model_state_dict": model.state_dict(),
        "architecture": architecture,
        "num_classes": num_classes,
        "class_names": class_names,
        "input_size": input_size,
        "accuracy": best_val_acc,
        "dataset_ref": dataset_ref,
    }, model_path)

    volume.commit()

    print(f"\n{'=' * 60}")
    print("TRAINING COMPLETE")
    print(f"{'=' * 60}")
    print(f"Model: {model_filename}")
    print(f"Accuracy: {best_val_acc:.1f}%")
    print(f"Time: {training_time:.1f}s")

    return {
        "model_filename": model_filename,
        "architecture": architecture,
        "accuracy": best_val_acc,
        "class_names": class_names,
        "num_classes": num_classes,
        "training_time_s": training_time,
    }


@app.local_entrypoint()
def main(
    dataset: str = "kaustubhdikshit/neu-surface-defect-database",
    task_name: str = "defects",
    architecture: str = "mobilenet_v2",
    epochs: int = 10,
    learning_rate: float = 0.001,
    batch_size: int = 32,
    freeze_backbone: bool = False,
):
    """CLI entrypoint for training."""
    print(f"Starting training...")
    print(f"  Dataset: {dataset}")
    print(f"  Architecture: {architecture}")
    print(f"  Epochs: {epochs}")

    result = train_model.remote(
        dataset_ref=dataset,
        task_name=task_name,
        architecture=architecture,
        epochs=epochs,
        learning_rate=learning_rate,
        batch_size=batch_size,
        freeze_backbone=freeze_backbone,
    )

    print("\n" + "=" * 50)
    print("COMPLETE")
    print("=" * 50)
    print(f"Model: {result['model_filename']}")
    print(f"Accuracy: {result['accuracy']:.1f}%")
    print(f"Classes: {result['class_names'][:10]}")

    return result
