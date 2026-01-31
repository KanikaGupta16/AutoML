# MongoDB Data Isolation

The Discovery Pipeline stores **all its data in a separate database** so it never touches your existing MongoDB data.

## How it works

1. **Same connection, different database**  
   You use one `MONGODB_URI` (same cluster/user). The app connects with that URI and then uses a **dedicated database name** for all pipeline data.

2. **Pipeline database**  
   All pipeline collections live in the database named by `MONGODB_DATABASE` (default: `automl_discovery`):

   - `discovery_projects` – projects and sources
   - `relevance_cache` – 24h relevance cache
   - `agendaJobs` – job queue (Agenda)

3. **Your data**  
   Any other database on the same cluster (e.g. `myapp`, `production`, `superman`) is **never read or written** by this app.

## Configuration

In `.env`:

```env
# Your existing MongoDB connection (cluster, user, password)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net?retryWrites=true&w=majority

# Database used ONLY by the pipeline (default: automl_discovery)
MONGODB_DATABASE=automl_discovery
```

- **MONGODB_URI** – Connection string to your cluster. It can include a database path (e.g. `.../superman`) or not; the app **ignores** that path for pipeline data and uses `MONGODB_DATABASE` instead.
- **MONGODB_DATABASE** – Name of the database where the pipeline writes. Default: `automl_discovery`.

## What gets created

Only in the `automl_discovery` (or your chosen) database:

| Collection          | Purpose                    |
|---------------------|----------------------------|
| `discovery_projects`| Discovery runs and sources |
| `relevance_cache`   | Cached relevance scores    |
| `agendaJobs`        | Job queue (Agenda)         |

No collections are created or modified in any other database.

## Example

- Cluster has databases: `superman`, `myapp`, `automl_discovery`.
- You set `MONGODB_URI=...@cluster.net` and `MONGODB_DATABASE=automl_discovery`.
- The app only uses `automl_discovery`.  
- `superman` and `myapp` are never touched.

## Changing the pipeline database name

To use a different name (e.g. `automl_pipeline`):

```env
MONGODB_DATABASE=automl_pipeline
```

The app will use that database for all pipeline collections. Your other databases remain unchanged.
