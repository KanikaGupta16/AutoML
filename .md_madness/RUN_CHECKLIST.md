# Run Checklist

## ✅ What’s in place

- [x] **Source code** – All 13 TypeScript files in `src/`
- [x] **Dependencies** – `node_modules` (267 packages)
- [x] **Build** – `dist/` (compiles with 0 errors)
- [x] **Config** – `.env` created from `.env.example`
- [x] **Scripts** – `npm run build`, `npm start`, `npm run dev`

## ⚠️ What you must set before `npm start` works

The app **requires** a real MongoDB and valid env vars. It will exit on startup if:

1. **MONGODB_URI** is missing or invalid (e.g. placeholder `user:password@cluster.mongodb.net`).
2. **OPENROUTER_API_KEY** or **FIRECRAWL_API_KEY** are missing (config validation).

### 1. Get a MongoDB URI

- **Option A – MongoDB Atlas (recommended)**  
  1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).  
  2. Create a free M0 cluster.  
  3. Create a DB user (username + password).  
  4. Network Access → Add IP `0.0.0.0/0` (or your IP).  
  5. Clusters → Connect → “Connect your application” → copy the URI.  
  6. Replace `<password>` with your DB user password.  
  7. Put the full URI in `.env` as `MONGODB_URI=...`.

- **Option B – Local MongoDB**  
  If MongoDB is running locally:  
  `MONGODB_URI=mongodb://localhost:27017/automl`

### 2. Put it in `.env`

Edit `.env` and set:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/automl?retryWrites=true&w=majority
```

(Use your real Atlas URI or local URI.)

### 3. Run again

```bash
npm start
```

You should see:

```
✅ Connected to MongoDB
✅ MongoDB indexes created
✅ Agenda started
✅ Server running on port 3000
```

Then test:

```bash
curl http://localhost:3000/health
```

---

## Quick reference

| Step              | Command / action |
|-------------------|-------------------|
| Install           | `npm install`     |
| Create env        | `cp .env.example .env` then edit `.env` |
| Build             | `npm run build`   |
| Run               | `npm start`       |
| Health check      | `curl http://localhost:3000/health` |

If the server exits immediately, check the error: it’s usually **MongoDB connection** (fix `MONGODB_URI`) or **invalid env** (fix API keys in `.env`).
