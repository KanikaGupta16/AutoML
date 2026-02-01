"""API routes module."""

from .discovery import router as discovery_router
from .training import router as training_router
from .webhooks import router as webhooks_router
from .chat import router as chat_router

__all__ = ["discovery_router", "training_router", "webhooks_router", "chat_router"]
