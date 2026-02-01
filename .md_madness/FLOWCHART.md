# Simple Flowchart: How the Pipeline Works

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        START                                │
│  User sends: "Find datasets for housing price prediction"  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   STEP 1: INTENT PARSING                    │
│                     (5 seconds)                             │
│                                                             │
│  Send prompt to OpenRouter (Claude/GPT-4)                   │
│  ↓                                                          │
│  Extract:                                                   │
│  • Target: "housing_price"                                  │
│  • Features: ["location", "crime", "schools"]               │
│  • Queries: [                                               │
│      "housing prices dataset",                              │
│      "real estate prices API",                              │
│      "home values by zipcode"                               │
│    ]                                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 STEP 2: DISCOVERY CRAWL                     │
│                    (10-20 seconds)                          │
│                                                             │
│  For each query, search with Firecrawl                      │
│  ↓                                                          │
│  Query 1: "housing prices dataset"                          │
│    → Found 10 URLs                                          │
│  Query 2: "real estate prices API"                          │
│    → Found 10 URLs                                          │
│  Query 3: "home values by zipcode"                          │
│    → Found 10 URLs                                          │
│  ↓                                                          │
│  Remove duplicates → 25 unique URLs                         │
│  ↓                                                          │
│  Save to MongoDB (status: pending_validation)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                STEP 3: RELEVANCE SCORING                    │
│                   (20-40 seconds)                           │
│                                                             │
│  For each URL:                                              │
│                                                             │
│  1. Check MongoDB cache                                     │
│     ↓                                                       │
│     Cache HIT? → Use cached score (instant)                 │
│     Cache MISS? → Call OpenRouter                           │
│                                                             │
│  2. OpenRouter scores URL (0-100)                           │
│     • High relevance: 90-100                                │
│     • Good match: 70-89                                     │
│     • Partial match: 40-69                                  │
│     • Poor match: 0-39                                      │
│                                                             │
│  3. Save score to cache (24h TTL)                           │
│                                                             │
│  Results:                                                   │
│    8 URLs with score > 70  ✅ → Move to validation          │
│   17 URLs with score ≤ 70  ❌ → Mark as rejected            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 4: VALIDATION & ENRICHMENT                  │
│                  (30-60 seconds per URL)                    │
│                                                             │
│  For each high-scoring URL (8 total):                       │
│                                                             │
│  1. Deep scrape with Firecrawl                              │
│     ↓                                                       │
│     Extract full content (markdown + metadata)              │
│                                                             │
│  2. Send sample to OpenRouter                               │
│     ↓                                                       │
│     Detect features: ["price", "location", "date"]          │
│     Rate quality: 85/100                                    │
│                                                             │
│  3. Determine credibility                                   │
│     • .gov domain → HIGH                                    │
│     • .edu domain → HIGH                                    │
│     • GitHub/Kaggle → HIGH                                  │
│     • Others → MEDIUM                                       │
│                                                             │
│  4. Save enriched data to MongoDB                           │
│                                                             │
│  Handle failures:                                           │
│    • Rate limited (429) → Retry after 1 hour                │
│    • Timeout (504) → Retry after 30 min                     │
│    • Access denied (403) → Mark as failed                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         DONE!                               │
│                                                             │
│  Results available at: GET /discovery/:id/status            │
│                                                             │
│  Response includes:                                         │
│  • 8 validated sources                                      │
│  • Relevance scores                                         │
│  • Features detected                                        │
│  • Quality ratings                                          │
│  • Credibility tiers                                        │
│  • Sample data                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Simple Diagram

```
USER REQUEST
     ↓
┌────────────┐
│  OpenRouter│ ← "Find housing data"
│   (LLM)    │
└─────┬──────┘
      ↓ Extract intent
      ↓ Generate queries
      ↓
┌────────────┐
│ Firecrawl  │ ← Search 3 queries
│  (Search)  │
└─────┬──────┘
      ↓ Find 25 URLs
      ↓
┌────────────┐
│  MongoDB   │ ← Save candidates
│  (Cache)   │
└─────┬──────┘
      ↓
      ├─ Check cache → HIT? Use score
      │                MISS? ↓
┌────────────┐
│ OpenRouter │ ← Score each URL (0-100)
│  (Score)   │
└─────┬──────┘
      ↓ Save to cache
      ↓ Filter: score > 70
      ↓ (8 URLs pass)
      ↓
┌────────────┐
│ Firecrawl  │ ← Deep scrape 8 URLs
│  (Scrape)  │
└─────┬──────┘
      ↓ Get full content
      ↓
┌────────────┐
│ OpenRouter │ ← Detect schema/features
│  (Schema)  │
└─────┬──────┘
      ↓
┌────────────┐
│  MongoDB   │ ← Save enriched data
│ (Storage)  │
└─────┬──────┘
      ↓
   RESULTS
```

---

## Job Queue Flow

```
POST /discovery/start
         ↓
    ┌────────┐
    │ Job 1  │ intent-parse
    └───┬────┘
        ↓ schedules
    ┌────────┐
    │ Job 2  │ discovery-crawl
    └───┬────┘
        ↓ schedules (batched)
    ┌────────┐
    │ Job 3  │ relevance-score
    └───┬────┘
        ↓ schedules (if score > 70)
    ┌────────┐
    │ Job 4  │ validation-enrich
    └───┬────┘
        ↓
     COMPLETE
```

---

## Status Timeline

```
Time    Status              What's Happening
────────────────────────────────────────────────────────
0s      Started             User submits request
                            
5s      Parsing             OpenRouter parsing intent
                            
10s     Searching           Firecrawl searching 3 queries
                            
30s     Scoring             OpenRouter scoring 25 URLs
                            Cache: 7 hits, 18 misses
                            
50s     Validating          Firecrawl scraping 8 URLs
                            
80s     Enriching           OpenRouter detecting schemas
                            
90s     Complete            8 enriched sources ready
```

---

## Data Journey

```
1. USER INPUT
   "Find housing price datasets"

2. PARSED INTENT
   {
     target: "housing_price",
     features: ["location", "crime", "schools"],
     queries: ["housing prices dataset", ...]
   }

3. DISCOVERED URLs (25 total)
   [
     "https://data.gov/housing-prices",
     "https://kaggle.com/datasets/house-prices",
     "https://realestate-api.com",
     ...
   ]

4. SCORED URLs (8 high-quality)
   [
     { url: "https://data.gov/...", score: 95 },
     { url: "https://kaggle.com/...", score: 88 },
     ...
   ]

5. ENRICHED SOURCES (8 validated)
   [
     {
       url: "https://data.gov/housing-prices",
       score: 95,
       type: "API",
       features: ["price", "location", "date"],
       quality: 90,
       credibility: "high",
       sample: "..."
     },
     ...
   ]
```

---

## Error Handling

```
URL → Scrape → Success? → Continue
                 ↓ No
              ┌──────────────┐
              │ What error?  │
              └──┬───────┬───┘
                 │       │
       Rate     │       │    Timeout
       Limited  │       │    (504)
       (429)    │       │
                ↓       ↓
              Retry   Retry
              1 hour  30 min
                ↓       ↓
              Queue   Queue
              later   later
```

---

## Cache Strategy

```
URL needs scoring
      ↓
   ┌──────────────┐
   │ Check cache? │
   └──┬───────┬───┘
      │       │
    HIT?    MISS?
      │       │
      ↓       ↓
   Return  Call OpenRouter
   cached     ↓
   score   Score 0-100
      ↓       ↓
      │    Save to cache
      │    (expires: 24h)
      │       ↓
      └───────┘
          ↓
      Use score
```

---

## Cost Optimization

```
25 URLs discovered
      ↓
   ┌──────────────────┐
   │ Relevance scoring│
   │  (check cache)   │
   └────┬─────────────┘
        ↓
   7 cached (FREE)
   18 new ($0.02)
        ↓
   Filter: score > 70
        ↓
   8 URLs pass
        ↓
   ┌──────────────────┐
   │  Deep scraping   │
   │  (expensive)     │
   └────┬─────────────┘
        ↓
   8 scrapes ($0.80)
   vs 25 scrapes ($2.50)
        ↓
   68% cost savings!
```

---

## Complete Example

```bash
# 1. User starts discovery
$ curl -X POST http://localhost:3000/discovery/start \
  -d '{"prompt": "Find housing prices"}'

Response:
{
  "project_id": "abc123",
  "status": "started"
}

# 2. Wait 90 seconds...

# 3. Check results
$ curl http://localhost:3000/discovery/abc123/status

Response:
{
  "stats": {
    "total_sources": 25,
    "validated": 8,
    "rejected": 17
  },
  "high_quality_sources": [
    {
      "url": "https://data.gov/housing",
      "score": 95,
      "features": ["price", "location"],
      "credibility": "high"
    },
    ...
  ]
}
```

---

## Summary

**Total time:** 1-2 minutes  
**Input:** Natural language prompt  
**Output:** 8 validated, enriched data sources  
**Cost:** $0.10-0.50 per project  
**Technology:** OpenRouter (LLM) + Firecrawl (scraping) + MongoDB (storage/queue/cache)
