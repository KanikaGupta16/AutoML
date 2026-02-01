#!/usr/bin/env python3
"""
AutoML Unified Backend
======================
Single FastAPI server combining:
- Discovery Pipeline (web crawling, LLM scoring)
- ML Training (Modal H100 GPU training)
- Model Inference

Endpoints:
- Discovery: /discovery/start, /discovery/{id}/status
- Training: /training/start, /training/{id}, /training/models/list
- Webhooks: /webhooks/firecrawl
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import config
from src.db import mongodb
from src.api import discovery_router, training_router, webhooks_router, chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("Starting AutoML Backend...")

    # Connect to MongoDB if configured
    if config.mongodb_uri:
        try:
            await mongodb.connect()
        except Exception as e:
            print(f"MongoDB connection failed (discovery features disabled): {e}")

    print(f"\nServer ready on port {config.port}")
    print(f"Base URL: {config.base_url}")
    print("\nAPI Endpoints:")
    print(f"  POST {config.base_url}/discovery/start")
    print(f"  GET  {config.base_url}/discovery/{{projectId}}/status")
    print(f"  POST {config.base_url}/training/start")
    print(f"  GET  {config.base_url}/training/{{jobId}}")
    print(f"  GET  {config.base_url}/training/models/list")
    print(f"  POST {config.base_url}/webhooks/firecrawl")

    yield

    # Shutdown
    print("\nShutting down...")
    if config.mongodb_uri:
        await mongodb.disconnect()


app = FastAPI(
    title="AutoML Backend",
    description="Unified API for data discovery, ML training, and model inference",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "mongodb": "connected" if mongodb.client else "disconnected",
            "models_count": len(list(config.models_dir.glob("*.pth"))) if config.models_dir.exists() else 0,
        },
    }


# Include routers
app.include_router(discovery_router)
app.include_router(training_router)
app.include_router(webhooks_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=config.port,
        reload=True,
    )
