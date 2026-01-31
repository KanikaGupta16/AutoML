# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                 │
│  HTTP/REST API                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /discovery/start
                         │ GET  /discovery/:id/status
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER                               │
│  - API Routes (discovery.ts)                                    │
│  - Webhook Handler (firecrawl.ts)                              │
│  - Health Check                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Schedule jobs
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              AGENDA JOB QUEUE (MongoDB-backed)                  │
│                                                                 │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ intent-parse  │→ │discovery-crawl │→ │relevance-score  │  │
│  │               │  │                │  │                 │  │
│  │ Parse prompt  │  │ Search URLs    │  │ Score 0-100     │  │
│  └───────────────┘  └────────────────┘  └────────┬────────┘  │
│                                                   │            │
│                                                   ▼            │
│                                          ┌─────────────────┐  │
│                                          │validation-enrich│  │
│                                          │                 │  │
│                                          │ Deep scrape +   │  │
│                                          │ schema detect   │  │
│                                          └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Call external APIs
                         │
         ┌───────────────┼───────────────┬─────────────────┐
         │               │               │                 │
         ▼               ▼               ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OpenRouter  │  │  Firecrawl   │  │   MongoDB    │  │MongoDB Cache │
│   (LLM)     │  │  (Scraping)  │  │  (Storage)   │  │   (24h TTL)  │
│             │  │              │  │              │  │              │
│ • Intent    │  │ • Search     │  │ • Projects   │  │ • Relevance  │
│ • Scoring   │  │ • Scrape     │  │ • Sources    │  │   scores     │
│ • Schema    │  │              │  │ • Jobs       │  │ • TTL index  │
└─────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Data Flow

### 1. User Request → Intent Parsing

```
User submits prompt:
"Predict housing prices based on crime and schools"
                    ↓
┌─────────────────────────────────────────────────┐
│         POST /discovery/start                   │
│  Create project → Schedule intent-parse job     │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│      intent-parse Job (5 seconds)               │
│  OpenRouter extracts:                           │
│  • target: "housing_price"                      │
│  • features: ["crime_rate", "school_quality"]   │
│  • queries: [                                   │
│      "real estate prices by zip code dataset",  │
│      "FBI crime statistics API",                │
│      "school district ratings API"              │
│    ]                                            │
└────────────┬────────────────────────────────────┘
             ↓
         Save to MongoDB
             ↓
    Schedule discovery-crawl job
```

### 2. Discovery Crawl → Find URLs

```
┌─────────────────────────────────────────────────┐
│    discovery-crawl Job (10-20 seconds)          │
│  For each query:                                │
│    Firecrawl.search(query, limit=10)            │
│      ↓                                          │
│    Returns URLs + snippets                      │
│      ↓                                          │
│    Deduplicate by normalized URL                │
│      ↓                                          │
│    Save as sources (status: pending_validation) │
└────────────┬────────────────────────────────────┘
             ↓
       MongoDB: 25 sources saved
             ↓
    Schedule relevance-score jobs (batched)
```

### 3. Relevance Scoring → Filter Quality

```
┌─────────────────────────────────────────────────┐
│   relevance-score Job (20-40 seconds)           │
│  For each URL:                                  │
│    1. Check MongoDB cache                       │
│         ↓                                       │
│       Cache hit? → Use cached score             │
│         ↓                                       │
│       Cache miss? → Call OpenRouter             │
│         ↓                                       │
│       Score 0-100 + source_type                 │
│         ↓                                       │
│       Save to cache (24h TTL)                   │
│    2. Update source in MongoDB                  │
│         ↓                                       │
│       Set relevance_score, source_type          │
│         ↓                                       │
│       Set status: "validated" or "rejected"     │
│    3. If score > 70:                            │
│         ↓                                       │
│       Schedule validation-enrich job            │
└─────────────────────────────────────────────────┘
             ↓
     8 sources with score > 70
             ↓
    Schedule 8 validation-enrich jobs
```

### 4. Validation & Enrichment → Deep Analysis

```
┌─────────────────────────────────────────────────┐
│  validation-enrich Job (30-60 seconds)          │
│  For high-scoring URL:                          │
│    1. Set status: "crawling"                    │
│         ↓                                       │
│    2. Firecrawl.scrape(url, webhook)            │
│         ↓                                       │
│       Returns markdown + metadata               │
│         ↓                                       │
│       Handle rate limits (403/429)              │
│         ↓                                       │
│       If rate limited: retry_after              │
│         ↓                                       │
│    3. OpenRouter.detectSchema(sample)           │
│         ↓                                       │
│       Identifies features_found                 │
│         ↓                                       │
│       Rates quality (0-100)                     │
│         ↓                                       │
│    4. Determine credibility_tier                │
│         ↓                                       │
│       .gov/.edu → "high"                        │
│       github/kaggle → "high"                    │
│       Others → "medium"                         │
│         ↓                                       │
│    5. Update source in MongoDB                  │
│         ↓                                       │
│       Set features_found, quality_rating,       │
│       credibility_tier, raw_data_sample         │
│         ↓                                       │
│       Set status: "validated"                   │
└─────────────────────────────────────────────────┘
             ↓
    8 enriched sources ready
```

---

## Component Responsibilities

### Express Server (`src/index.ts`)
- HTTP server on port 3000
- REST API endpoints
- Webhook handlers
- Health checks

### API Routes (`src/api/discovery.ts`)
- `POST /discovery/start` - Create project, schedule intent-parse
- `GET /discovery/:id/status` - Return project status + sources
- `GET /discovery/:id` - Alias for status

### Job Queue (`src/jobs/agenda.ts`)
- Initialize Agenda with MongoDB
- Define 4 job types
- Start workers (5 concurrent)
- Process every 10 seconds

### OpenRouter Service (`src/services/openrouter.ts`)
- **parseIntent()** - Extract target, features, queries
- **scoreRelevance()** - Rate URL 0-100 + source type
- **detectSchema()** - Identify features in data

### Firecrawl Service (`src/services/firecrawl.ts`)
- **search()** - Find URLs matching query
- **scrape()** - Deep crawl for content
- **normalizeUrl()** - Deduplicate URLs
- Handle rate limits (403/429/504)

### MongoDB (`src/db/mongodb.ts`)
- Connect to MongoDB Atlas
- Create indexes on startup
- Collections:
  - `discovery_projects` - Projects + sources
  - `relevance_cache` - 24h TTL cache
  - `agendaJobs` - Job queue

---

## Database Schema

### discovery_projects

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,
  discovery_chain: {
    original_prompt: String,
    generated_queries: [String],
    discovery_date: Date
  },
  sources: [{
    url: String,
    firecrawl_id: String,
    relevance_score: Number,         // 0-100
    source_type: String,             // API|Dataset|Article|Irrelevant
    features_found: [String],        // ["price", "location", ...]
    status: String,                  // pending_validation|validated|...
    raw_data_sample: Object,         // Scraped content sample
    last_crawled: Date,
    credibility_tier: String,        // high|medium|low
    quality_rating: Number,          // 0-100
    retry_after: Date                // For rate-limited sources
  }]
}
```

**Indexes:**
- `project_id` - Find by project
- `sources.url` - Find by URL
- `sources.status` - Filter by status
- `discovery_chain.discovery_date` - Sort by date

### relevance_cache

```javascript
{
  _id: ObjectId,
  url: String,                       // Normalized URL
  relevance_score: Number,           // 0-100
  source_type: String,               // API|Dataset|...
  expiresAt: Date                    // TTL index (24h)
}
```

**Indexes:**
- `url` (unique) - Fast lookup
- `expiresAt` (TTL) - Auto-delete expired

### agendaJobs (managed by Agenda)

```javascript
{
  _id: ObjectId,
  name: String,                      // Job type
  data: Object,                      // Job payload
  nextRunAt: Date,                   // When to run
  lastRunAt: Date,
  lastFinishedAt: Date,
  failCount: Number,
  failedAt: Date
}
```

---

## Job States & Transitions

```
┌────────────────┐
│  Job Created   │
│  (pending)     │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Job Running   │
│  (processing)  │
└───┬────────┬───┘
    │        │
    ▼        ▼
┌────────┐ ┌────────┐
│Success │ │ Failed │
│(done)  │ │(retry) │
└────────┘ └────────┘
```

**Job scheduling:**
- `intent-parse` → schedules `discovery-crawl` (5s delay)
- `discovery-crawl` → schedules `relevance-score` (10s delay, batched)
- `relevance-score` → schedules `validation-enrich` (15s delay, if score > 70)
- `validation-enrich` → no further jobs (terminal)

---

## Source Status Flow

```
                     Discovered
                         ↓
              ┌──────────────────┐
              │pending_validation│
              └─────────┬────────┘
                        │
                        ↓
              ┌─────────────────┐
              │ Relevance Scored│
              └────┬────────┬───┘
                   │        │
         score>70  │        │  score≤70
                   │        │
                   ▼        ▼
         ┌──────────┐  ┌──────────┐
         │validated │  │ rejected │
         └─────┬────┘  └──────────┘
               │
               ▼
         ┌──────────┐
         │ crawling │
         └────┬─────┘
              │
      ┌───────┼───────┐
      │       │       │
      ▼       ▼       ▼
┌──────────┐ ┌─────────────┐ ┌────────┐
│validated │ │rate_limited │ │ failed │
└──────────┘ └──────┬──────┘ └────────┘
                    │
                    │ retry_after
                    │
                    ▼
              ┌──────────┐
              │ crawling │
              └──────────┘
```

---

## Cost Optimization Strategy

### 1. Model Routing

```
Intent Parsing:   Claude 3.5 Sonnet ($3/1M tokens)
                  ↓ High quality for complex extraction
                  
Relevance Scoring: Llama 3.1 70B ($0.60/1M tokens)
                   ↓ Cheap for bulk scoring
                   
Schema Detection: Llama 3.1 70B ($0.60/1M tokens)
                  ↓ Cheap for pattern matching
```

### 2. Caching

```
First request:  OpenRouter → MongoDB cache (24h)
                ↓
                Cost: $0.001

Cached request: MongoDB → Return cached score
                ↓
                Cost: $0.000001 (99.9% savings)
```

### 3. Firecrawl Optimization

```
Discovery:      Firecrawl.search() for ALL URLs
                ↓ Cheap API call
                Cost: $0.01 per 100 searches

Validation:     Firecrawl.scrape() ONLY for score > 70
                ↓ Expensive deep crawl
                ↓ Only 8/25 URLs (32%)
                Cost: $0.10 per scrape
                
Total savings: 68% vs scraping everything
```

### 4. Batching

```
Sequential:     1 job per URL = 25 jobs
                ↓
                Overhead: 25 × 100ms = 2.5s

Batched:        1 job per 5 URLs = 5 jobs
                ↓
                Overhead: 5 × 100ms = 0.5s
                
Savings: 80% overhead reduction
```

---

## Hosting Architecture

### Recommended: Railway + MongoDB Atlas

```
┌─────────────────────────────────────┐
│        Railway (One Service)        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Express + Agenda            │ │
│  │   (Single Node.js Process)    │ │
│  │                               │ │
│  │   • API Server (port 3000)    │ │
│  │   • Job Workers (5 concurrent)│ │
│  │   • Webhook Handler           │ │
│  └──────────┬────────────────────┘ │
│             │                       │
└─────────────┼───────────────────────┘
              │
              │ MongoDB connection
              │
              ▼
┌─────────────────────────────────────┐
│      MongoDB Atlas (Free M0)        │
│                                     │
│  • discovery_projects               │
│  • relevance_cache                  │
│  • agendaJobs                       │
│                                     │
│  Region: Same as Railway for latency│
└─────────────────────────────────────┘
```

**Why this works:**
- Single service = simple deployment
- MongoDB handles queue + cache + storage
- No Redis = one less service to manage
- Railway auto-deploys on git push
- Free tiers available for testing

---

## Performance Characteristics

### Latency

- Intent parsing: 2-5 seconds (OpenRouter API call)
- Discovery crawl: 10-20 seconds (multiple Firecrawl searches)
- Relevance scoring: 20-40 seconds (OpenRouter + cache checks)
- Validation: 30-60 seconds per source (Firecrawl scrape + schema)

**Total pipeline**: 1-2 minutes (typical)

### Throughput

- Concurrent workers: 5 (configurable)
- Jobs processed: ~30-50/minute
- Sources per project: 10-50 (typical)
- Cache hit rate: 30-50% (depends on overlap)

### Scalability

**Vertical scaling:**
- Increase worker concurrency (5 → 10)
- Upgrade MongoDB tier (M0 → M10)
- Increase hosting resources (RAM/CPU)

**Horizontal scaling:**
- Run multiple Agenda instances (shared MongoDB)
- Add Redis for distributed locking (optional)
- Load balancer for API endpoints

---

This architecture provides a balance of simplicity (single service), reliability (MongoDB-backed queue), and cost-efficiency (smart caching + model routing).
