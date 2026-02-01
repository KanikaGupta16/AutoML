# Deployment Guide

Deploy the AutoML Discovery Pipeline to production using Railway or Render.

## MongoDB Atlas Setup (Required First)

Before deploying, set up MongoDB Atlas:

1. **Create Cluster**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free M0 cluster (512MB, shared)
   - Choose a cloud provider and region close to your app hosting

2. **Create Database User**
   - Database Access → Add New Database User
   - Username: `automl-app` (or your choice)
   - Password: Generate a strong password
   - Database User Privileges: "Read and write to any database"

3. **Network Access**
   - Network Access → Add IP Address
   - Allow Access from Anywhere: `0.0.0.0/0` (recommended for Railway/Render)
   - Or add specific IPs from your hosting provider

4. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/`
   - Replace `<user>` and `<password>` with your credentials
   - Add database name: `mongodb+srv://user:password@cluster.mongodb.net/automl`

---

## Option 1: Deploy to Railway (Recommended)

Railway offers the simplest deployment with GitHub integration.

### Step 1: Prepare Repository

```bash
# Commit all changes
git add .
git commit -m "Initial commit: AutoML Discovery Pipeline"

# Push to GitHub
git remote add origin https://github.com/yourusername/AutoML.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to https://railway.app/
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `AutoML` repository

### Step 3: Configure Environment Variables

In Railway dashboard:

1. Go to your project → Variables tab
2. Add each environment variable:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL_INTENT=anthropic/claude-3.5-sonnet
OPENROUTER_MODEL_SCORE=meta-llama/llama-3.1-70b-instruct
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/automl
PORT=3000
NODE_ENV=production
```

**Important**: Railway will auto-generate `BASE_URL` or you can set it after first deploy:
- Copy your Railway app URL (e.g., `https://automl-production.up.railway.app`)
- Add `BASE_URL=https://your-app.railway.app` to variables

### Step 4: Deploy

Railway auto-deploys on every git push. Initial deploy:

1. Railway detects Node.js project
2. Runs `npm install`
3. Runs `npm run build`
4. Runs `npm start`

Watch the deployment logs in Railway dashboard.

### Step 5: Verify

Once deployed, test your endpoints:

```bash
# Health check
curl https://your-app.railway.app/health

# Start discovery
curl -X POST https://your-app.railway.app/discovery/start \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Find housing price datasets"}'
```

### Railway Features

- **Auto-deploys** on git push
- **Free tier**: $5/month credit (enough for testing)
- **Custom domains**: Add your own domain
- **Logs**: Real-time logs in dashboard
- **Scaling**: Easy vertical/horizontal scaling

---

## Option 2: Deploy to Render

Render is another excellent hosting option with a generous free tier.

### Step 1: Prepare Repository

Same as Railway - push code to GitHub.

### Step 2: Create Web Service

1. Go to https://render.com/
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your `AutoML` repository

### Step 3: Configure Service

Fill in the settings:

- **Name**: `automl-discovery-pipeline`
- **Region**: Choose closest to your MongoDB Atlas region
- **Branch**: `main`
- **Root Directory**: leave blank
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or paid for production)

### Step 4: Environment Variables

In Render dashboard, add environment variables:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL_INTENT=anthropic/claude-3.5-sonnet
OPENROUTER_MODEL_SCORE=meta-llama/llama-3.1-70b-instruct
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/automl
PORT=3000
NODE_ENV=production
BASE_URL=https://your-app.onrender.com
```

**Note**: Update `BASE_URL` after first deploy with your actual Render URL.

### Step 5: Deploy

Click "Create Web Service". Render will:

1. Clone your repo
2. Run build command
3. Start the service
4. Assign a URL (e.g., `https://automl-discovery-pipeline.onrender.com`)

### Step 6: Update BASE_URL

1. Copy your Render URL from dashboard
2. Update `BASE_URL` environment variable
3. Click "Manual Deploy" to redeploy

### Step 7: Verify

Test your endpoints:

```bash
curl https://your-app.onrender.com/health
```

### Render Features

- **Free tier**: 750 hours/month (enough for 1 service)
- **Auto-deploys** on git push
- **Custom domains**: Add your own domain
- **Auto-sleep**: Free tier sleeps after 15 min inactivity (first request takes 30s to wake)
- **Background workers**: Can run separate worker services

---

## Option 3: Deploy to Fly.io

For more control and global distribution.

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Initialize

```bash
fly auth login
fly launch
```

Follow prompts:
- App name: `automl-discovery`
- Region: Choose closest to MongoDB Atlas
- PostgreSQL: No
- Redis: No

### Step 3: Configure fly.toml

Fly creates `fly.toml`. Verify these settings:

```toml
app = "automl-discovery"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Step 4: Set Secrets

```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx \
  FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxx \
  MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/automl \
  BASE_URL=https://automl-discovery.fly.dev
```

### Step 5: Deploy

```bash
fly deploy
```

### Step 6: Verify

```bash
fly open
# Or
curl https://automl-discovery.fly.dev/health
```

---

## Post-Deployment Checklist

After deploying to any platform:

- [ ] Update `BASE_URL` with actual deployed URL
- [ ] Test `/health` endpoint
- [ ] Test `/discovery/start` endpoint
- [ ] Check logs for errors
- [ ] Monitor MongoDB Atlas for connections
- [ ] Set up monitoring/alerts (if available)
- [ ] Configure custom domain (optional)
- [ ] Set up auto-backups for MongoDB (optional)

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | `sk-or-v1-...` | OpenRouter API key |
| `OPENROUTER_MODEL_INTENT` | No | `anthropic/claude-3.5-sonnet` | Model for intent parsing |
| `OPENROUTER_MODEL_SCORE` | No | `meta-llama/llama-3.1-70b-instruct` | Model for scoring |
| `FIRECRAWL_API_KEY` | Yes | `fc-...` | Firecrawl API key |
| `FIRECRAWL_WEBHOOK_SECRET` | No | `secret123` | Webhook signature verification |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB connection string |
| `PORT` | No | `3000` | Server port (Railway/Render set automatically) |
| `BASE_URL` | No | `https://...` | Public URL for webhooks |
| `NODE_ENV` | No | `production` | Environment |

---

## Monitoring & Maintenance

### Check Logs

**Railway**: Dashboard → Deployments → View logs

**Render**: Dashboard → Logs tab

**Fly.io**:
```bash
fly logs
```

### Monitor MongoDB

MongoDB Atlas → Cluster → Metrics
- Check connections
- Monitor storage usage
- Review slow queries

### Monitor API Usage

- **OpenRouter**: Dashboard → Usage
- **Firecrawl**: Dashboard → API Usage

### Scaling

**Railway**: Settings → Scale → Increase memory/CPU

**Render**: Service → Plan → Upgrade to paid plan

**Fly.io**: 
```bash
fly scale count 2  # Horizontal scaling
fly scale vm shared-cpu-2x  # Vertical scaling
```

---

## Troubleshooting Deployment

### Build fails

- Check Node.js version: Add `"engines": { "node": ">=20.0.0" }` to package.json
- Ensure `build` script exists in package.json
- Check TypeScript compiles locally first

### App crashes on start

- Check environment variables are set
- Verify MongoDB URI is accessible from hosting platform
- Check logs for specific error messages

### Webhook not working

- Ensure `BASE_URL` is set correctly
- Check Firecrawl webhook configuration
- Verify public URL is accessible

### High costs

- Use cheaper OpenRouter models for scoring
- Reduce Firecrawl search limits
- Implement request throttling
- Monitor MongoDB Atlas tier limits

---

## Next Steps

Once deployed:

1. Set up monitoring alerts
2. Configure custom domain
3. Add authentication (if needed)
4. Set up CI/CD pipeline
5. Implement rate limiting
6. Add request logging

For production use, consider:
- Redis for additional caching (optional)
- Load balancer for multiple instances
- Backup strategy for MongoDB
- Error tracking (Sentry, etc.)
