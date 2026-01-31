# Quick Start Guide

Get the AutoML Discovery Pipeline running in 5 minutes.

## Prerequisites

- Node.js 20+ installed
- MongoDB Atlas account (free tier)
- OpenRouter API key
- Firecrawl API key

## Step 1: Get API Keys

### OpenRouter
1. Go to https://openrouter.ai/
2. Sign up and navigate to API Keys
3. Create a new API key
4. Add credits to your account ($5 minimum)

### Firecrawl
1. Go to https://firecrawl.dev/
2. Sign up and navigate to API Keys
3. Copy your API key

### MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Create a database user (username + password)
4. Network Access: Add IP `0.0.0.0/0` (or your IP)
5. Get connection string (looks like `mongodb+srv://...`)

## Step 2: Setup Project

```bash
# Clone or navigate to the project
cd AutoML

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

## Step 3: Configure Environment

Edit `.env` file:

```env
# Add your actual API keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/automl

# These can stay as-is for local dev
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
```

## Step 4: Build and Run

```bash
# Build TypeScript
npm run build

# Start the server
npm start
```

You should see:
```
✅ Connected to MongoDB
✅ MongoDB indexes created
✅ Agenda started
✅ Server running on port 3000
```

## Step 5: Test the Pipeline

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find datasets for predicting housing prices"
  }'
```

You'll get a response with a `project_id`:
```json
{
  "project_id": "65f...",
  "job_id": "65f...",
  "status": "started"
}
```

## Step 6: Check Status

Wait 30-60 seconds, then check status:

```bash
curl http://localhost:3000/discovery/<project_id>/status
```

Replace `<project_id>` with the ID from step 5.

## What's Happening?

1. **Intent Parsing** (5s): OpenRouter extracts target variable, features, and generates 3-5 search queries
2. **Discovery Crawl** (10-20s): Firecrawl searches each query and finds 10-50 candidate URLs
3. **Relevance Scoring** (20-40s): OpenRouter scores each URL (0-100) based on relevance
4. **Validation & Enrichment** (30-60s): For URLs with score > 70, Firecrawl deep-scrapes and OpenRouter detects schema

Total time: **1-2 minutes** for a complete discovery run.

## Troubleshooting

### "MongoDB connection error"
- Check your `MONGODB_URI` is correct
- Ensure IP whitelist includes your IP (or `0.0.0.0/0`)
- Verify database user credentials

### "OpenRouter API error"
- Check your API key is valid
- Ensure you have credits in your account
- Try a different model if quota exceeded

### "Firecrawl rate limited"
- Check your API quota in Firecrawl dashboard
- Wait for rate limit to reset (shown in response)
- Upgrade Firecrawl plan if needed

### Port already in use
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or stop the process using port 3000

## Next Steps

- Read [EXAMPLES.md](EXAMPLES.md) for more example prompts
- Check [README.md](README.md) for detailed documentation
- Deploy to Railway or Render (see README hosting section)

## Development Mode

For faster iteration with auto-reload:

```bash
npm run dev
```

This uses `ts-node` to run TypeScript directly without building.
