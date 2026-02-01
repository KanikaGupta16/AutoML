# Example API Requests

This file contains example requests for the Discovery & Validation Pipeline.

## Start a Discovery Pipeline

```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Predict housing prices based on crime rates and school quality"
  }'
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

## Check Discovery Status

```bash
curl http://localhost:3000/discovery/65f1234567890abcdef12345/status
```

Response:
```json
{
  "project_id": "65f1234567890abcdef12345",
  "discovery_chain": {
    "original_prompt": "Predict housing prices based on crime rates and school quality",
    "generated_queries": [
      "real estate prices by zip code dataset",
      "FBI crime statistics by locality API",
      "school district ratings API"
    ],
    "discovery_date": "2026-01-31T12:00:00.000Z"
  },
  "stats": {
    "total_sources": 25,
    "pending_validation": 3,
    "validated": 8,
    "rejected": 12,
    "crawling": 2,
    "rate_limited": 0,
    "failed": 0
  },
  "high_quality_sources": [
    {
      "url": "https://data.gov/housing-prices",
      "relevance_score": 95,
      "source_type": "API",
      "features_found": ["price", "location", "crime_rate", "school_rating"],
      "quality_rating": 90,
      "credibility_tier": "high",
      "last_crawled": "2026-01-31T12:05:00.000Z"
    }
  ],
  "rate_limited_sources": [],
  "all_sources": [...]
}
```

## More Example Prompts

### Financial Analysis
```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Predict stock market trends using company earnings, social media sentiment, and economic indicators"
  }'
```

### Healthcare
```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Predict patient readmission risk based on medical history, demographics, and treatment data"
  }'
```

### E-commerce
```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Predict customer churn using purchase history, website activity, and customer support interactions"
  }'
```

### Climate Analysis
```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Predict air quality based on traffic data, weather conditions, and industrial emissions"
  }'
```

## Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```
