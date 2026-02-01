"""
Firecrawl Service
=================
Handles web search and scraping via Firecrawl API.
"""

import httpx
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

from ..config import config


@dataclass
class FirecrawlSearchResult:
    """Result from Firecrawl search."""
    url: str
    title: str
    description: str = ""
    snippet: str = ""
    favicon: Optional[str] = None


@dataclass
class FirecrawlScrapeResult:
    """Result from Firecrawl scrape."""
    success: bool
    content: Optional[str] = None
    markdown: Optional[str] = None
    html: Optional[str] = None
    metadata: Optional[dict] = None
    rate_limited: bool = False
    retry_after: Optional[int] = None
    error: Optional[str] = None


class FirecrawlService:
    """Service for interacting with Firecrawl API."""

    def __init__(self):
        self.base_url = "https://api.firecrawl.dev/v1"
        self.headers = {
            "Authorization": f"Bearer {config.firecrawl_api_key}",
            "Content-Type": "application/json",
        }

    async def search(self, query: str, limit: int = 10) -> list[FirecrawlSearchResult]:
        """Search for URLs matching a query."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/search",
                    headers=self.headers,
                    json={"query": query, "limit": limit},
                )
                response.raise_for_status()
                data = response.json()

                # Handle various response formats from Firecrawl API
                results_data = data.get("data", data)

                # data can be a list directly or a dict with nested results
                if isinstance(results_data, list):
                    results = results_data
                elif isinstance(results_data, dict):
                    results = results_data.get("web") or results_data.get("results") or []
                else:
                    results = data.get("results", [])

                if not isinstance(results, list):
                    results = []

                return [
                    FirecrawlSearchResult(
                        url=item.get("url") or item.get("link", ""),
                        title=item.get("title", ""),
                        description=item.get("description") or item.get("snippet", ""),
                        snippet=item.get("snippet") or item.get("description", ""),
                        favicon=item.get("favicon"),
                    )
                    for item in results
                ]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                print("Firecrawl rate limited on search")
            else:
                print(f"Firecrawl search error: {e}")
            return []
        except Exception as e:
            print(f"Firecrawl search error: {e}")
            return []

    async def scrape(self, url: str) -> FirecrawlScrapeResult:
        """Scrape a URL for full content."""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/scrape",
                    headers=self.headers,
                    json={
                        "url": url,
                        "formats": ["markdown", "html"],
                        "onlyMainContent": True,
                    },
                )
                response.raise_for_status()
                data = response.json()

                result_data = data.get("data", data)
                metadata = data.get("metadata") or result_data.get("metadata")

                return FirecrawlScrapeResult(
                    success=True,
                    content=result_data.get("content") or result_data.get("markdown"),
                    markdown=result_data.get("markdown"),
                    html=result_data.get("html"),
                    metadata=metadata,
                )
        except httpx.HTTPStatusError as e:
            status = e.response.status_code

            if status in (403, 401):
                return FirecrawlScrapeResult(
                    success=False,
                    rate_limited=True,
                    error="Access denied or authentication failed",
                )

            if status == 429:
                retry_after = e.response.headers.get("retry-after")
                return FirecrawlScrapeResult(
                    success=False,
                    rate_limited=True,
                    retry_after=int(retry_after) if retry_after else 3600,
                    error="Rate limited",
                )

            if status in (504, 408):
                return FirecrawlScrapeResult(
                    success=False,
                    rate_limited=True,
                    retry_after=1800,
                    error="Timeout",
                )

            return FirecrawlScrapeResult(
                success=False,
                error=str(e),
            )
        except Exception as e:
            return FirecrawlScrapeResult(
                success=False,
                error=str(e),
            )

    def normalize_url(self, url: str) -> str:
        """Normalize URL for cache key."""
        try:
            parsed = urlparse(url)
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            return normalized.lower().rstrip("/").replace("://www.", "://")
        except Exception:
            return url.lower().rstrip("/")


# Global service instance
firecrawl_service = FirecrawlService()
