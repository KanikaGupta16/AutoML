"""
Discovery Pipeline Jobs
=======================
Background tasks for the discovery pipeline:
1. Intent parsing
2. Discovery crawl
3. Relevance scoring
4. Validation and enrichment
"""

import asyncio
from datetime import datetime, timedelta
from urllib.parse import urlparse
from bson import ObjectId

from ..db import mongodb
from ..db.schemas import Source, DiscoveryChain, ParsedIntent
from ..services import firecrawl_service, openrouter_service


MIN_HIGH_QUALITY_SOURCES = 5  # Stop searching once we have this many good sources


async def run_discovery_pipeline(project_id: str, prompt: str) -> None:
    """Run the complete discovery pipeline in the background."""
    print(f"[Discovery] Starting pipeline for project {project_id}")

    try:
        # Step 1: Parse intent
        parsed_intent = await parse_intent(project_id, prompt)

        # Step 2: Crawl for sources
        sources = await discovery_crawl(project_id, parsed_intent)

        # Step 3: Score relevance - stops early once we have 5 high-quality sources
        high_quality_sources = await score_relevance_batch(project_id, sources, parsed_intent)

        # Step 4: Select best source and mark others as backup
        await select_best_source(project_id, high_quality_sources, parsed_intent)

        print(f"[Discovery] Pipeline completed for project {project_id}")
    except Exception as e:
        print(f"[Discovery] Pipeline error: {e}")
        raise


async def parse_intent(project_id: str, prompt: str) -> ParsedIntent:
    """Parse user intent using LLM."""
    print(f"[Intent Parser] Processing for project {project_id}")

    parsed_intent = await openrouter_service.parse_intent(prompt)

    print(f"[Intent Parser] Parsed: target={parsed_intent.target_variable}, "
          f"features={len(parsed_intent.feature_requirements)}, "
          f"queries={len(parsed_intent.search_queries)}")

    # Update project with discovery chain
    project_oid = ObjectId(project_id)
    await mongodb.discovery_projects.update_one(
        {"project_id": project_oid},
        {
            "$set": {
                "discovery_chain": {
                    "original_prompt": prompt,
                    "generated_queries": parsed_intent.search_queries,
                    "discovery_date": datetime.now(),
                }
            }
        },
        upsert=True,
    )

    return parsed_intent


async def search_kaggle_datasets(parsed_intent: ParsedIntent) -> list[Source]:
    """Search MongoDB kaggle_datasets collection for relevant datasets."""
    print(f"[Kaggle Search] Searching for datasets matching: {parsed_intent.target_variable}")

    sources: list[Source] = []

    try:
        # Build search terms from target and features
        search_terms = [parsed_intent.target_variable] + parsed_intent.feature_requirements[:3]
        search_regex = "|".join(term.replace(" ", ".*") for term in search_terms if term)

        # Search by title, description, or tags
        cursor = mongodb.kaggle_datasets.find({
            "$or": [
                {"title": {"$regex": search_regex, "$options": "i"}},
                {"description": {"$regex": search_regex, "$options": "i"}},
                {"tags": {"$elemMatch": {"$regex": search_regex, "$options": "i"}}},
            ]
        }).limit(20)

        async for doc in cursor:
            # Build Kaggle URL from ref field or use existing url
            url = doc.get("url") or f"https://www.kaggle.com/datasets/{doc.get('ref', '')}"
            if url and doc.get("ref"):
                sources.append(Source(
                    url=url,
                    status="pending_validation",
                    source_type="Dataset",
                ))
                print(f"  Found Kaggle: {doc.get('title', url)[:60]}")

    except Exception as e:
        print(f"[Kaggle Search] Error: {e}")

    print(f"[Kaggle Search] Found {len(sources)} datasets")
    return sources


async def discovery_crawl(project_id: str, parsed_intent: ParsedIntent) -> list[Source]:
    """Crawl for data sources using Firecrawl and Kaggle in parallel."""
    queries = parsed_intent.search_queries
    print(f"[Discovery Crawl] Processing {len(queries)} queries for project {project_id}")

    all_sources: list[Source] = []
    seen_urls: set[str] = set()

    # Run Firecrawl and Kaggle searches in parallel
    async def firecrawl_search() -> list[Source]:
        sources = []
        for query in queries:
            print(f"  Searching Firecrawl: \"{query}\"")
            results = await firecrawl_service.search(query, limit=10)
            for result in results:
                sources.append(Source(
                    url=result.url,
                    status="pending_validation",
                ))
        return sources

    # Execute both searches in parallel
    firecrawl_task = asyncio.create_task(firecrawl_search())
    kaggle_task = asyncio.create_task(search_kaggle_datasets(parsed_intent))

    firecrawl_results, kaggle_results = await asyncio.gather(
        firecrawl_task, kaggle_task, return_exceptions=True
    )

    # Handle potential exceptions
    if isinstance(firecrawl_results, Exception):
        print(f"[Discovery Crawl] Firecrawl error: {firecrawl_results}")
        firecrawl_results = []
    if isinstance(kaggle_results, Exception):
        print(f"[Discovery Crawl] Kaggle error: {kaggle_results}")
        kaggle_results = []

    # Merge results, deduplicating by URL
    for source in list(firecrawl_results) + list(kaggle_results):
        normalized_url = firecrawl_service.normalize_url(source.url)
        if normalized_url not in seen_urls:
            seen_urls.add(normalized_url)
            all_sources.append(source)

    print(f"[Discovery Crawl] Found {len(all_sources)} unique URLs "
          f"(Firecrawl: {len(firecrawl_results)}, Kaggle: {len(kaggle_results)})")

    # Save to MongoDB
    if all_sources:
        project_oid = ObjectId(project_id)
        await mongodb.discovery_projects.update_one(
            {"project_id": project_oid},
            {
                "$push": {
                    "sources": {
                        "$each": [s.model_dump() for s in all_sources]
                    }
                }
            },
        )

    return all_sources


async def score_relevance_batch(
    project_id: str,
    sources: list[Source],
    parsed_intent: ParsedIntent,
) -> list[dict]:
    """Score relevance for sources. Stops early once we have enough high-quality sources."""
    print(f"[Relevance Scorer] Processing up to {len(sources)} URLs for project {project_id}")

    project_oid = ObjectId(project_id)
    high_quality_sources: list[dict] = []

    for source in sources:
        # Stop early if we have enough high-quality sources
        if len(high_quality_sources) >= MIN_HIGH_QUALITY_SOURCES:
            print(f"[Relevance Scorer] Found {MIN_HIGH_QUALITY_SOURCES} high-quality sources, stopping early")
            break

        url = source.url
        normalized_url = firecrawl_service.normalize_url(url)

        # Check cache first
        cached = await mongodb.relevance_cache.find_one({
            "url": normalized_url,
            "expires_at": {"$gt": datetime.now()},
        })

        if cached:
            print(f"  Cache hit for {url}")
            relevance_score = cached["relevance_score"]
            source_type = cached["source_type"]
        else:
            # Score with LLM
            result = await openrouter_service.score_relevance(
                target=parsed_intent.target_variable,
                features=parsed_intent.feature_requirements,
                title=url,
                snippet="",
            )
            relevance_score = result.relevance_score
            source_type = result.source_type

            # Cache result
            await mongodb.relevance_cache.update_one(
                {"url": normalized_url},
                {
                    "$set": {
                        "url": normalized_url,
                        "relevance_score": relevance_score,
                        "source_type": source_type,
                        "expires_at": datetime.now() + timedelta(hours=24),
                    }
                },
                upsert=True,
            )

            print(f"  Scored {url}: {relevance_score}")

        # Update source in MongoDB
        is_high_quality = relevance_score > 70
        status = "validated" if is_high_quality else "rejected"
        await mongodb.discovery_projects.update_one(
            {
                "project_id": project_oid,
                "sources.url": url,
            },
            {
                "$set": {
                    "sources.$.relevance_score": relevance_score,
                    "sources.$.source_type": source_type,
                    "sources.$.status": status,
                }
            },
        )

        # Track high-quality sources
        if is_high_quality:
            high_quality_sources.append({
                "url": url,
                "relevance_score": relevance_score,
                "source_type": source_type,
            })

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    print(f"[Relevance Scorer] Found {len(high_quality_sources)} high-quality sources")
    return high_quality_sources


async def select_best_source(
    project_id: str,
    high_quality_sources: list[dict],
    parsed_intent: ParsedIntent,
) -> None:
    """Select the best source and mark others as backup."""
    project_oid = ObjectId(project_id)

    if not high_quality_sources:
        print("[Source Selection] No high-quality sources found")
        return

    # Sort by relevance score (highest first)
    sorted_sources = sorted(high_quality_sources, key=lambda x: x["relevance_score"], reverse=True)

    best_source = sorted_sources[0]
    backup_sources = sorted_sources[1:]

    print(f"[Source Selection] Best source: {best_source['url']} (score: {best_source['relevance_score']})")
    print(f"[Source Selection] {len(backup_sources)} backup sources available")

    # Mark backup sources
    for source in backup_sources:
        await mongodb.discovery_projects.update_one(
            {"project_id": project_oid, "sources.url": source["url"]},
            {"$set": {"sources.$.status": "backup"}},
        )

    # Validate and enrich the best source
    url = best_source["url"]
    print(f"[Source Selection] Enriching best source: {url}")

    # Mark as crawling
    await mongodb.discovery_projects.update_one(
        {"project_id": project_oid, "sources.url": url},
        {"$set": {"sources.$.status": "crawling"}},
    )

    # Scrape content
    scrape_result = await firecrawl_service.scrape(url)

    if not scrape_result.success:
        print(f"[Source Selection] Failed to scrape best source, trying backups...")
        # Try backup sources
        for backup in backup_sources:
            backup_url = backup["url"]
            await mongodb.discovery_projects.update_one(
                {"project_id": project_oid, "sources.url": url},
                {"$set": {"sources.$.status": "failed"}},
            )

            # Try the backup
            url = backup_url
            await mongodb.discovery_projects.update_one(
                {"project_id": project_oid, "sources.url": url},
                {"$set": {"sources.$.status": "crawling"}},
            )

            scrape_result = await firecrawl_service.scrape(url)
            if scrape_result.success:
                print(f"[Source Selection] Using backup source: {url}")
                break

    if not scrape_result.success:
        print("[Source Selection] All sources failed to scrape")
        return

    # Get sample content
    sample_content = scrape_result.markdown or scrape_result.content or ""
    if not sample_content:
        await mongodb.discovery_projects.update_one(
            {"project_id": project_oid, "sources.url": url},
            {"$set": {"sources.$.status": "failed"}},
        )
        return

    # Detect schema with LLM
    schema_result = await openrouter_service.detect_schema(
        target=parsed_intent.target_variable,
        features=parsed_intent.feature_requirements,
        scraped_sample=sample_content,
    )

    # Determine credibility tier
    credibility_tier = "medium"
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.hostname.lower() if parsed_url.hostname else ""

        if domain.endswith(".gov") or domain.endswith(".edu"):
            credibility_tier = "high"
        elif "github.com" in domain or "kaggle.com" in domain:
            credibility_tier = "high"
    except Exception:
        pass

    # Update with enriched data and mark as selected
    await mongodb.discovery_projects.update_one(
        {"project_id": project_oid, "sources.url": url},
        {
            "$set": {
                "sources.$.status": "selected",
                "sources.$.features_found": schema_result.features_found,
                "sources.$.quality_rating": schema_result.quality_rating,
                "sources.$.credibility_tier": credibility_tier,
                "sources.$.raw_data_sample": {
                    "markdown": sample_content[:5000],
                    "metadata": scrape_result.metadata,
                },
                "sources.$.last_crawled": datetime.now(),
            }
        },
    )

    # Also store the selected source at the project level for easy access
    await mongodb.discovery_projects.update_one(
        {"project_id": project_oid},
        {
            "$set": {
                "selected_source": {
                    "url": url,
                    "relevance_score": high_quality_sources[0]["relevance_score"] if url == best_source["url"] else next(
                        (s["relevance_score"] for s in backup_sources if s["url"] == url), 0
                    ),
                    "source_type": high_quality_sources[0]["source_type"] if url == best_source["url"] else next(
                        (s["source_type"] for s in backup_sources if s["url"] == url), "Dataset"
                    ),
                    "features_found": schema_result.features_found,
                    "quality_rating": schema_result.quality_rating,
                    "credibility_tier": credibility_tier,
                }
            }
        },
    )

    print(f"[Source Selection] Selected source: {url}")
    print(f"  Features: {schema_result.features_found}")
    print(f"  Quality: {schema_result.quality_rating}, Credibility: {credibility_tier}")
