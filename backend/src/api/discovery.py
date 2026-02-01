"""
Discovery API Routes
====================
Endpoints for the data discovery pipeline.
"""

import asyncio
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional

from ..db import mongodb
from ..db.schemas import SourceStats, HighQualitySource
from ..jobs import run_discovery_pipeline


router = APIRouter(prefix="/discovery", tags=["Discovery"])


# Request/Response Models
class StartDiscoveryRequest(BaseModel):
    """Request to start a discovery pipeline."""
    prompt: str = Field(..., description="What data are you looking for?")
    project_id: Optional[str] = Field(None, description="Optional project ID (auto-generated if not provided)")


class StartDiscoveryResponse(BaseModel):
    """Response from starting discovery."""
    project_id: str
    status: str
    message: str


class DiscoveryStatusResponse(BaseModel):
    """Response with discovery status."""
    project_id: str
    discovery_chain: Optional[dict] = None
    stats: SourceStats
    selected_source: Optional[HighQualitySource] = None
    backup_sources: list[HighQualitySource] = Field(default_factory=list)
    high_quality_sources: list[HighQualitySource] = Field(default_factory=list)
    rate_limited_sources: list[dict] = Field(default_factory=list)
    all_sources: list[dict] = Field(default_factory=list)


@router.post("/start", response_model=StartDiscoveryResponse)
async def start_discovery(
    request: StartDiscoveryRequest,
    background_tasks: BackgroundTasks,
):
    """Start a new discovery pipeline."""
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    # Generate project ID if not provided
    project_id = request.project_id or str(ObjectId())
    project_oid = ObjectId(project_id)

    # Initialize project document
    await mongodb.discovery_projects.update_one(
        {"project_id": project_oid},
        {
            "$setOnInsert": {
                "project_id": project_oid,
                "sources": [],
                "created_at": datetime.now(),
            }
        },
        upsert=True,
    )

    # Run discovery pipeline in background
    background_tasks.add_task(run_discovery_pipeline, project_id, request.prompt)

    print(f"Started discovery for project {project_id}")

    return StartDiscoveryResponse(
        project_id=project_id,
        status="started",
        message="Discovery pipeline started",
    )


@router.get("/{project_id}/status", response_model=DiscoveryStatusResponse)
async def get_discovery_status(project_id: str):
    """Get discovery status for a project."""
    try:
        project_oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await mongodb.discovery_projects.find_one({"project_id": project_oid})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sources = project.get("sources", [])

    # Calculate stats
    stats = SourceStats(
        total_sources=len(sources),
        pending_validation=sum(1 for s in sources if s.get("status") == "pending_validation"),
        validated=sum(1 for s in sources if s.get("status") == "validated"),
        rejected=sum(1 for s in sources if s.get("status") == "rejected"),
        crawling=sum(1 for s in sources if s.get("status") == "crawling"),
        rate_limited=sum(1 for s in sources if s.get("status") == "rate_limited"),
        failed=sum(1 for s in sources if s.get("status") == "failed"),
        selected=sum(1 for s in sources if s.get("status") == "selected"),
        backup=sum(1 for s in sources if s.get("status") == "backup"),
    )

    # Get selected source (the best one)
    selected_source = None
    for s in sources:
        if s.get("status") == "selected":
            selected_source = HighQualitySource(
                url=s.get("url", ""),
                relevance_score=s.get("relevance_score"),
                source_type=s.get("source_type"),
                features_found=s.get("features_found", []),
                quality_rating=s.get("quality_rating"),
                credibility_tier=s.get("credibility_tier"),
                last_crawled=s.get("last_crawled"),
            )
            break

    # Get backup sources
    backup_sources = [
        HighQualitySource(
            url=s.get("url", ""),
            relevance_score=s.get("relevance_score"),
            source_type=s.get("source_type"),
            features_found=s.get("features_found", []),
            quality_rating=s.get("quality_rating"),
            credibility_tier=s.get("credibility_tier"),
            last_crawled=s.get("last_crawled"),
        )
        for s in sources
        if s.get("status") == "backup"
    ]

    # Get high-quality sources (includes selected + backup + validated)
    high_quality = [
        HighQualitySource(
            url=s.get("url", ""),
            relevance_score=s.get("relevance_score"),
            source_type=s.get("source_type"),
            features_found=s.get("features_found", []),
            quality_rating=s.get("quality_rating"),
            credibility_tier=s.get("credibility_tier"),
            last_crawled=s.get("last_crawled"),
        )
        for s in sources
        if s.get("status") in ("selected", "backup", "validated") and s.get("relevance_score", 0) > 70
    ]

    # Get rate-limited sources
    rate_limited = [
        {
            "url": s.get("url"),
            "retry_after": s.get("retry_after"),
            "message": "Source found but needs retry",
        }
        for s in sources
        if s.get("status") == "rate_limited"
    ]

    return DiscoveryStatusResponse(
        project_id=project_id,
        discovery_chain=project.get("discovery_chain"),
        stats=stats,
        selected_source=selected_source,
        backup_sources=backup_sources,
        high_quality_sources=high_quality,
        rate_limited_sources=rate_limited,
        all_sources=sources,
    )


@router.get("/{project_id}", response_model=DiscoveryStatusResponse)
async def get_discovery(project_id: str):
    """Alias for status endpoint."""
    return await get_discovery_status(project_id)
