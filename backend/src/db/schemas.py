"""
Database Schemas
================
Pydantic models for MongoDB documents.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class ParsedIntent(BaseModel):
    """Parsed user intent from LLM."""
    target_variable: str
    feature_requirements: list[str] = Field(default_factory=list)
    search_queries: list[str] = Field(default_factory=list)


class DiscoveryChain(BaseModel):
    """Discovery chain metadata."""
    original_prompt: str
    generated_queries: list[str] = Field(default_factory=list)
    discovery_date: datetime = Field(default_factory=datetime.now)


class Source(BaseModel):
    """A discovered data source."""
    url: str
    firecrawl_id: Optional[str] = None
    relevance_score: Optional[int] = None
    source_type: Optional[Literal["API", "Dataset", "Article", "Irrelevant", "government", "api", "dataset", "news"]] = None
    features_found: list[str] = Field(default_factory=list)
    status: Literal["pending_validation", "validated", "crawling", "cleaned", "failed", "rate_limited", "rejected", "selected", "backup"] = "pending_validation"
    raw_data_sample: Optional[dict] = None
    last_crawled: Optional[datetime] = None
    credibility_tier: Optional[Literal["high", "medium", "low"]] = None
    quality_rating: Optional[int] = None
    retry_after: Optional[datetime] = None


class DiscoveryProject(BaseModel):
    """A discovery project document."""
    project_id: str
    discovery_chain: Optional[DiscoveryChain] = None
    sources: list[Source] = Field(default_factory=list)


class RelevanceCache(BaseModel):
    """Cached relevance score for a URL."""
    url: str
    relevance_score: int
    source_type: str
    expires_at: datetime


class SourceStats(BaseModel):
    """Statistics for a discovery project."""
    total_sources: int = 0
    pending_validation: int = 0
    validated: int = 0
    rejected: int = 0
    crawling: int = 0
    rate_limited: int = 0
    failed: int = 0
    selected: int = 0
    backup: int = 0


class HighQualitySource(BaseModel):
    """High quality source summary."""
    url: str
    relevance_score: Optional[int] = None
    source_type: Optional[str] = None
    features_found: list[str] = Field(default_factory=list)
    quality_rating: Optional[int] = None
    credibility_tier: Optional[str] = None
    last_crawled: Optional[datetime] = None
