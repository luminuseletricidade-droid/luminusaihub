# Project Documentation

## Overview
Luminus AI Hub is a contract and maintenance management platform for the power-generation sector. The monorepo combines a Vite/React frontend, a FastAPI backend with Agno/LLM orchestration, Supabase integrations (PostgreSQL, edge functions, storage), and serverless helpers for PDF processing. This documentation captures the state of the codebase as of March 2025 and highlights current flows, gaps, and next steps.

**Purpose**: Centralize contract, maintenance, client, and reporting workflows with AI assistance.  
**Domain**: Operations and maintenance for generator contracts and technical services.  
**Status**: Advanced MVP running in production (Railway) with outstanding security and testing work.

## Documentation Index

### Core Documentation
- [Project Overview](project-overview.md) — Business context, stakeholders, and timeline signals
- [Architecture](architecture.md) — Current topology and design patterns
- [Technology Stack](technology-stack.md) — Tooling across frontend, backend, and infrastructure

### Technical Documentation
- [Frontend](frontend.md) — React structure, routing, and key hooks
- [Backend](backend.md) — FastAPI layers, Agno agents, and integrations
- [API](api.md) — REST endpoints and serverless entry points
- [Database](database.md) — Supabase schema, relations, and migrations
- [Authentication](authentication.md) — Custom JWT flow and hardening plan
- [AI](ai.md) — Current OpenAI/Gemini usage and OpenRouter roadmap

### Delivery Workflows
- [Setup Guide](setup.md) — Local provisioning and environment variables
- [Development Workflow](workflow.md) — Daily process and synchronization tips
- [Testing Strategy](testing.md) — Existing coverage, gaps, and recommendations
- [Deployment](deployment.md) — Railway, Nixpacks, and Supabase deployment notes

### Guias para Iniciantes
- **[Setup Completo do Zero](setup-completo.md)** — Guia passo a passo para configurar toda a infraestrutura (banco, backend, frontend) do zero, ideal para quem nunca trabalhou com o Luminus

## Quick Start

### Prerequisites
- Node.js 18+ (see `package.json` engines)
- Python 3.9+ with virtualenv support
- Supabase project credentials (URL + anon/service role keys)
- OpenAI credentials (`OPENAI_API_KEY`) and optional Gemini key
- PostgreSQL or Supabase connection string (`SUPABASE_DB_URL`)

### Setup
```bash
# Frontend
npm install
cp .env.example .env                # set VITE_API_URL and Supabase keys

# Backend
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # set OPENAI_API_KEY, SUPABASE_DB_URL, JWT_SECRET
```

### Development
```bash
# Run in separate terminals
npm run dev                         # http://localhost:5173
cd backend && source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Contributing
- Follow Conventional Commits (`feat|fix|chore: short description`)
- Run `npm run lint` and `python backend/scripts/testing/test_system.py` before opening a PR
- Update related documentation (docs/, agents/, prompts/) whenever user-facing flows change
- Avoid leaking secrets—review `src/integrations/supabase/client.ts` and environment files before publishing

## Roadmap Themes
- **Security**: Strengthen the custom JWT implementation (secret rotation, refresh tokens) and remove the embedded Supabase anon key from the frontend bundle.
- **AI**: Consolidate provider usage via OpenRouter and verify supported models (replace all references to non-existent `gpt-5-mini-*`).
- **Observability**: Centralize logging for frontend/backend and monitor long-running PDF jobs.
- **Quality**: Build out Vitest suites aligned with the current UI and add pytest coverage for critical FastAPI endpoints.
- **Data**: Audit duplicated endpoints in `backend/main.py` and standardize SQL access patterns.
- **Developer Experience**: Automate migrations across Railway/Supabase and standardize helper scripts in `backend/scripts`.
