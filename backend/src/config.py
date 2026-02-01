"""Configuration management for AutoML."""

import os
from pathlib import Path
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    """Application configuration."""

    # API Keys
    openrouter_api_key: str = field(default_factory=lambda: os.environ.get("OPENROUTER_API_KEY", ""))
    firecrawl_api_key: str = field(default_factory=lambda: os.environ.get("FIRECRAWL_API_KEY", ""))
    firecrawl_webhook_secret: str = field(default_factory=lambda: os.environ.get("FIRECRAWL_WEBHOOK_SECRET", ""))
    mongodb_uri: str = field(default_factory=lambda: os.environ.get("MONGODB_URI", ""))
    mongodb_database: str = field(default_factory=lambda: os.environ.get("MONGODB_DATABASE", "automl"))
    kaggle_api_key: str = field(default_factory=lambda: os.environ.get("KAGGLE_API_KEY", ""))

    # Server
    port: int = field(default_factory=lambda: int(os.environ.get("PORT", "8000")))
    base_url: str = field(default_factory=lambda: os.environ.get("BASE_URL", "http://localhost:8000"))

    # Paths
    project_root: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    models_dir: Path = field(default=None)
    data_dir: Path = field(default=None)

    # Modal
    modal_gpu: str = "H100"
    modal_timeout: int = 3600
    modal_volume_name: str = "automl-models"

    # Training defaults
    default_epochs: int = 10
    default_batch_size: int = 32
    default_learning_rate: float = 0.001

    # LLM Models
    llm_model: str = field(default_factory=lambda: os.environ.get("LLM_MODEL", "google/gemini-2.0-flash-001"))
    openrouter_model_intent: str = field(default_factory=lambda: os.environ.get("OPENROUTER_MODEL_INTENT", "anthropic/claude-3.5-sonnet"))
    openrouter_model_score: str = field(default_factory=lambda: os.environ.get("OPENROUTER_MODEL_SCORE", "meta-llama/llama-3.1-70b-instruct"))

    def __post_init__(self):
        if self.models_dir is None:
            self.models_dir = self.project_root / "models"
        if self.data_dir is None:
            self.data_dir = self.project_root / "data"
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

    def validate_discovery(self) -> list[str]:
        """Validate configuration for discovery pipeline."""
        errors = []
        if not self.openrouter_api_key:
            errors.append("OPENROUTER_API_KEY not set")
        if not self.firecrawl_api_key:
            errors.append("FIRECRAWL_API_KEY not set")
        if not self.mongodb_uri:
            errors.append("MONGODB_URI not set")
        return errors


# Global config instance
config = Config()
