"""Configuration management for AutoML."""

import os
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    """Application configuration."""

    # API Keys
    openrouter_api_key: str = os.environ.get("OPENROUTER_API_KEY", "")
    mongodb_uri: str = os.environ.get("MONGODB_URI", "")
    kaggle_api_key: str = os.environ.get("KAGGLE_API_KEY", "")

    # Paths
    project_root: Path = Path(__file__).parent.parent
    models_dir: Path = project_root / "models"
    data_dir: Path = project_root / "data"

    # Modal
    modal_gpu: str = "H100"
    modal_timeout: int = 3600
    modal_volume_name: str = "automl-models"

    # Training defaults
    default_epochs: int = 10
    default_batch_size: int = 32
    default_learning_rate: float = 0.001

    # LLM
    llm_model: str = "google/gemini-2.0-flash-001"

    def __post_init__(self):
        self.models_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)

    def validate(self) -> list[str]:
        """Validate configuration. Returns list of errors."""
        errors = []
        if not self.openrouter_api_key:
            errors.append("OPENROUTER_API_KEY not set")
        if not self.kaggle_api_key:
            errors.append("KAGGLE_API_KEY not set")
        return errors


# Global config instance
config = Config()
