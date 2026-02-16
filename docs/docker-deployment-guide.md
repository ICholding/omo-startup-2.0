# Docker Deployment Guide

This guide deploys the agent stack with persistent memory, fallback services, and optional observability.

## 1. Prerequisites
- Docker Engine 24+
- Docker Compose v2
- 4 CPU / 6 GB RAM minimum

## 2. Configure environment

```bash
cp .env.example .env
```

Or create `.env` manually:

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxx
GITHUB_TOKEN=ghp_xxxx
POSTGRES_PASSWORD=postgres-pass
REDIS_PASSWORD=redis-pass
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

## 3. Build + run core stack

```bash
docker compose up -d --build
```

Core services:
- `clawbot-agent`
- `postgres` (pgvector)
- `chromadb`
- `redis`

## 4. Optional profiles

```bash
# High availability standby
docker compose --profile ha up -d

# Observability stack
docker compose --profile observability up -d

# Backup worker
docker compose --profile backup up -d
```

## 5. Health checks

```bash
curl http://localhost:10000/health
curl http://localhost:8000/api/v1/heartbeat
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
```

## 6. Persistence volumes
- `agent-data`
- `letta-memory`
- `chroma-data`
- `postgres-data`
- `redis-data`
- `backups`

## 7. Stop and clean up

```bash
docker compose down
# include -v only when you intend to remove persistent data
```
