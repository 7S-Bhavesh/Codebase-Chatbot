# Commands to run the project

Open Docker Desktop and wait until it is running. Use PowerShell for the commands
below. Keep your credentials in the project's existing `.env` file.

## Go to the project folder

```powershell
cd 'D:\Codebase-Chatbot\Codebase-Chatbot'
```

Run all remaining commands from this directory, which contains `docker-compose.yml`.

## Start all servers

```powershell
docker compose up -d --build
```

This builds and starts the frontend, main server, indexing worker, reranker, and
PostgreSQL. The first build can take several minutes to download dependencies
and the reranker model.

For subsequent starts without rebuilding:

```powershell
docker compose up -d
```

## Access the application

| Service | Address |
| --- | --- |
| Frontend | http://localhost:3000 |
| Main server | http://localhost:5000 |
| Reranker health | http://localhost:8001/health |
| Reranker API documentation | http://localhost:8001/docs |
| PostgreSQL | `localhost:5432` |

The indexing worker (`private`) runs in the background and has no browser port.
Redis and Weaviate use the cloud connections configured in `.env`.
The reranker host port defaults to 8001; `RERANKER_HOST_PORT` can override it.

## Restart after saving code or configuration

Save your changes in the editor before restarting.

```powershell
# Main server: use after changing rag.config.js, alpha, or backend source
docker compose restart backend

# Repository indexing worker
docker compose restart private

# Restart the running reranker
docker compose restart reranker

# Restart all existing services
docker compose restart
```

Frontend and reranker source files are copied into their images, so source edits
to those services require a rebuild:

```powershell
# Rebuild and start the frontend after UI changes
docker compose up -d --build frontend

# Rebuild and start the reranker after changing app.py or its dependencies
docker compose up -d --build reranker
```

## Reload changed .env values

A restart alone does not load changed Compose environment variables. After
changing the Gemini key or model, recreate the main server:

```powershell
docker compose up -d --no-deps --force-recreate backend
```

If you changed shared credentials used by both the backend and indexing worker:

```powershell
docker compose up -d --no-deps --force-recreate backend private
```

## Check server status

```powershell
docker compose ps
Invoke-RestMethod 'http://localhost:5000/'
Invoke-RestMethod 'http://localhost:8001/health'
```

Check the alpha value available inside the backend container:

```powershell
@'
import { RAG_CONFIG } from './config/rag.config.js';
console.log('Alpha:', RAG_CONFIG.ALPHA);
'@ | docker compose exec -T backend node --input-type=module
```

## Watch logs and request summaries

Run one of these commands depending on which service you want to watch:

```powershell
# Main server, including automatic summaries for every completed/failed question
docker compose logs -f --tail 50 backend

# Reranker HTTP requests
docker compose logs -f --tail 50 reranker

# Repository indexing jobs
docker compose logs -f --tail 50 private

# All services
docker compose logs -f --tail 50
```

Press **Ctrl+C** to stop watching logs. This does not stop the servers.

Detailed request traces are stored in `Main server/logs/rag/*.jsonl`.
Plain-language summaries are stored beside them as `*.summary.txt`.

Print the latest saved summary:

```powershell
$latestSummary = Get-ChildItem 'Main server/logs/rag/*.summary.txt' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestSummary) {
    Get-Content -LiteralPath $latestSummary.FullName -Encoding UTF8
} else {
    Write-Output 'No summaries yet. Send a chat question first.'
}
```

## Stop and start existing servers

```powershell
# Stop services while keeping containers and database data
docker compose stop

# Start those existing containers again
docker compose start
```

For the detailed application flow, see [ARCHITECTURE.md](ARCHITECTURE.md).
