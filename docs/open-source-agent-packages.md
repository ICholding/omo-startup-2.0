# Open Source Agent Packages

This repo's Docker stack is organized by package categories to support memory, orchestration, and guardrails.

## Memory + State
- `letta`
- `letta-client`
- `pgvector`
- `redis`

## RAG + Retrieval
- `llama-index`
- `haystack-ai`
- `sentence-transformers`
- `chromadb`

## Multi-agent Coordination
- `pyautogen`
- `crewai`
- `metagpt`

## Verification + Guardrails
- `nemoguardrails`
- `guardrails-ai`
- `evaluate`

## ML / Foundation
- `torch`
- `transformers`
- `spacy`

## API + Serving
- `fastapi`
- `uvicorn`
- `prometheus-client`

## Security
- `bandit`
- `safety`
- `cryptography`

## Data + Storage
- `psycopg2-binary`
- `sqlalchemy`

## Notes
- Heavy ML packages increase image size significantly.
- Prefer profile-driven deployment and only enable needed services in each environment.
