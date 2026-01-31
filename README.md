# AutoML Discovery & Validation Pipeline

An intelligent data discovery system that uses OpenRouter (LLM) and Firecrawl to automatically find, validate, and enrich data sources based on natural language prompts.

## Features

- **Intent Parsing**: Converts natural language prompts into structured search queries using Claude/GPT-4
- **Automated Discovery**: Searches the web for relevant datasets, APIs, and data sources using Firecrawl
- **Relevance Scoring**: Uses LLMs to score and filter discovered sources (0-100 scale)
- **Smart Caching**: MongoDB-based cache with 24-hour TTL to avoid re-scoring the same URLs
- **Validation & Enrichment**: Deep scraping and schema detection for high-quality sources
- **Async Processing**: Agenda (MongoDB-backed) job queue for reliable background processing
- **Retry Logic**: Automatic retry with backoff for rate-limited sources

## Architecture

```
User Prompt → Intent Parsing (OpenRouter) 
  → Discovery Crawl (Firecrawl search) 
  → Relevance Scoring (OpenRouter + MongoDB cache) 
  → Validation & Enrichment (Firecrawl scrape + OpenRouter schema detection)
  → Enriched Sources in MongoDB
```

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **API**: Express
- **Queue**: Agenda (MongoDB-backed job scheduler)
- **Database**: MongoDB (Atlas recommended)
- **LLM**: OpenRouter (Claude, GPT-4, Llama)
- **Scraping**: Firecrawl

## Prerequisites

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
3. **OpenRouter API Key** - [Get API Key](https://openrouter.ai/)
4. **Firecrawl API Key** - [Get API Key](https://firecrawl.dev/)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL_INTENT=anthropic/claude-3.5-sonnet
OPENROUTER_MODEL_SCORE=meta-llama/llama-3.1-70b-instruct

# Firecrawl API Configuration
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# MongoDB Configuration (MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/automl?retryWrites=true&w=majority

# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### 3. Build

```bash
npm run build
```

### 4. Run

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

## API Usage

### Start Discovery Pipeline

```bash
POST /discovery/start
Content-Type: application/json

{
  "prompt": "Predict housing prices based on crime rates and school quality"
}
```

Response:
```json
{
  "project_id": "65f1234567890abcdef12345",
  "job_id": "65f1234567890abcdef12346",
  "status": "started",
  "message": "Discovery pipeline started"
}
```

### Check Discovery Status

```bash
GET /discovery/:projectId/status
```

Response:
```json
{
  "project_id": "65f1234567890abcdef12345",
  "discovery_chain": {
    "original_prompt": "Predict housing prices...",
    "generated_queries": [
      "real estate prices by zip code dataset",
      "FBI crime statistics by locality API",
      "school district ratings API"
    ],
    "discovery_date": "2026-01-31T12:00:00.000Z"
  },
  "stats": {
    "total_sources": 25,
    "validated": 8,
    "rejected": 15,
    "crawling": 2,
    "rate_limited": 0,
    "failed": 0
  },
  "high_quality_sources": [
    {
      "url": "https://data.gov/...",
      "relevance_score": 95,
      "source_type": "API",
      "features_found": ["price", "location", "crime_rate"],
      "quality_rating": 90,
      "credibility_tier": "high"
    }
  ],
  "rate_limited_sources": []
}
```

## Pipeline Flow

1. **Intent Parsing** (`intent-parse` job)
   - Sends user prompt to OpenRouter
   - Extracts target variable, features, and search queries
   - Schedules `discovery-crawl` job

2. **Discovery Crawl** (`discovery-crawl` job)
   - Searches Firecrawl for each generated query
   - Saves candidate URLs to MongoDB
   - Schedules `relevance-score` jobs (batched)

3. **Relevance Scoring** (`relevance-score` job)
   - Checks MongoDB cache for existing scores
   - If cache miss, scores URL with OpenRouter
   - Caches score for 24 hours
   - If score > 70, schedules `validation-enrich` job

4. **Validation & Enrichment** (`validation-enrich` job)
   - Deep scrapes URL with Firecrawl
   - Detects schema and features with OpenRouter
   - Determines credibility tier (`.gov`, `.edu` = high)
   - Handles rate limits with smart retry

## MongoDB Collections

### `discovery_projects`
Stores discovery projects and their sources:
```javascript
{
  project_id: ObjectId,
  discovery_chain: {
    original_prompt: String,
    generated_queries: [String],
    discovery_date: Date
  },
  sources: [{
    url: String,
    relevance_score: Number,
    source_type: String,
    status: String,
    features_found: [String],
    ...
  }]
}
```

### `relevance_cache`
Caches relevance scores (24h TTL):
```javascript
{
  url: String,
  relevance_score: Number,
  source_type: String,
  expiresAt: Date  // TTL index
}
```

### `agendaJobs`
Agenda job queue (managed by Agenda):
```javascript
{
  name: String,
  data: Object,
  nextRunAt: Date,
  ...
}
```

## Hosting

### Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables in Railway dashboard
4. Railway auto-deploys on git push

### Render

1. Create account at [render.com](https://render.com)
2. New Web Service → Connect repo
3. Build: `npm run build`
4. Start: `npm start`
5. Add environment variables in Render dashboard

### MongoDB Atlas

1. Create free M0 cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist Railway/Render IP (or use `0.0.0.0/0` for testing)
4. Copy connection string to `MONGODB_URI`

## Cost Optimization

1. **Model Routing**: Uses cheap models (Llama 3.1 70B) for bulk relevance scoring
2. **Caching**: 24-hour MongoDB cache prevents re-scoring same URLs
3. **Firecrawl**: Only deep-scrapes URLs with score > 70
4. **Batching**: Processes URLs in batches to reduce job overhead

## Development

### Project Structure

```
src/
├── index.ts              # App entry point
├── config.ts             # Environment validation
├── db/
│   ├── mongodb.ts        # MongoDB connection
│   └── schemas.ts        # TypeScript types
├── services/
│   ├── openrouter.ts     # OpenRouter client
│   └── firecrawl.ts      # Firecrawl client
├── jobs/
│   ├── agenda.ts         # Agenda setup
│   ├── intent-parser.job.ts
│   ├── discovery-crawl.job.ts
│   ├── relevance-scorer.job.ts
│   └── validation-enrich.job.ts
├── api/
│   └── discovery.ts      # REST API routes
└── webhooks/
    └── firecrawl.ts      # Webhook handler
```

### Scripts

- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled code
- `npm run dev` - Run with ts-node (development)
- `npm run dev:watch` - Run with auto-reload

## Troubleshooting

### MongoDB Connection Error

- Check `MONGODB_URI` is correct
- Ensure IP is whitelisted in MongoDB Atlas
- Verify network access rules

### OpenRouter Rate Limits

- Reduce concurrency in `src/jobs/agenda.ts` (`maxConcurrency`)
- Use cheaper models for scoring
- Increase delays between jobs

### Firecrawl Errors

- Check API key is valid
- Monitor Firecrawl dashboard for quota
- Rate-limited sources auto-retry after cooldown

## License

MIT
