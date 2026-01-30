# Architecture Documentation

## Overview
The system follows a hybrid architecture:
- **React SPA** (Vite + React + TanStack Query) consuming the FastAPI backend and Supabase realtime streams.
- **FastAPI backend** acting as a monolith handling REST endpoints, PDF ingestion, and AI orchestration.
- **Supabase** providing PostgreSQL, Realtime, Storage, and Edge Functions.
- **Serverless functions** (Vercel-style) for specialized PDF/document processing scenarios.

## Architecture Type
- **Frontend**: Modular SPA
- **Backend**: FastAPI monolith responsible for REST, PDF processing, and AI workloads
- **Data Layer**: PostgreSQL (Supabase) accessed both directly from FastAPI and through Supabase clients/functions
- **AI Orchestration**: Agno + LangChain + OpenAI/Gemini without a dedicated microservice layer

## System Design

### High-Level Architecture
```
[React SPA] --HTTP--> [FastAPI Backend] --psycopg2--> [Supabase PostgreSQL]
     |                         |                        ^
     |                         |                        |
     |                         +---- async tasks ----+  |
     |                         |                     |  |
     +--Realtime (Supabase)--> |                     |  |
     +--Storage Uploads------> |                     |  |
     +--Edge Functions (fetch)---------------------------+
                                 |
                                 +--> OpenAI / Gemini APIs
                                 +--> PDF libraries (pdfplumber, PyPDF2, pdfminer)
```

### Components
- **Frontend**
  - Routes in `src/pages/*`, domain components in `src/components/*`
  - Specialized hooks (`useOptimizedRealtimeSync`, `useContractExtraction`, `useVisionAI`)
  - REST services centralized in `src/services/api.ts`
- **Backend**
  - `main.py`: routing, authentication, AI endpoints, SSE, admin routes
  - `database.py`: psycopg2 wrapper with serialization helpers
  - `agno_agents/` & `agno_workflows/`: AI agents and orchestrations
  - `utils/`: PDF extraction, business-day utilities, prompt loader
  - `scripts/`: maintenance, migrations, testing helpers
- **Supabase**
  - `migrations/`: schema evolution for contracts, clients, documents, AI metadata
  - `functions/`: Deno functions for OpenAI/PDF workflows, report generation, chat
- **Infrastructure**
  - Railway deployment (`backend/nixpacks.toml`, `Procfile`)
  - Local logs (`backend/backend.log`, `frontend.log`)

### Data Flow
1. User authenticates through `/api/auth/signin`; JWT is stored in `localStorage`.
2. The SPA loads dashboard data via `dashboardApi.getMetrics()` hitting FastAPI.
3. Realtime hooks subscribe to Supabase channels and invalidate React Query caches.
4. PDF uploads call `/api/process-base64-pdf`, which delegates to agents or edge functions.
5. AI report/plan generation triggers `/api/generate-*` endpoints or Supabase functions.
6. Data is persisted either by the backend (direct PostgreSQL access) or through Supabase APIs.

## Design Patterns

### Applied Patterns
- **Container/Presenter**: Pages consume hooks and render specialized components (`src/pages/Contracts.tsx`).
- **Repository-like**: `src/services/api.ts` centralizes REST calls behind a consistent interface.
- **Adapter**: The frontend `supabase` wrapper mimics the Supabase API while delegating to backend endpoints when needed.
- **Strategy / Fallback**: `backend/utils/pdf_extractor.PDFExtractor` switches between extraction libraries.
- **Observer**: Supabase realtime channels feed into hooks that trigger cache invalidation.

### Anti-Patterns
- **God Module**: `backend/main.py` mixes authentication, AI workflows, CRUD, and streaming logic.
- **Duplicate Routes**: Multiple handlers exist for `/api/chat-sessions` and `/api/generate-report`.
- **Secret Leakage**: Default Supabase anon key ships with the frontend client.
- **Tight Coupling**: Frontend depends on both direct Supabase access and backend endpoints.
- **Inconsistent Error Handling**: Responses mix `JSONResponse`, `StreamingResponse`, and ad-hoc dicts.

## Architectural Principles (TRY & SOLID)
- **Transparency (TRY)**: Detailed logging helps, but the lack of centralized monitoring limits traceability.
- **Reliability (TRY)**: Realtime + multiple PDF strategies raise resilience; missing automated tests and invalid AI models reduce trust.
- **Yield (TRY)**: React Query caching improves UX; backend needs async processing for heavy PDF jobs.
- **Single Responsibility (S)**: Violated in `main.py` and large frontend components such as `Contracts.tsx`.
- **Open/Closed (O)**: Hooks and agents support extension; duplicated endpoints hinder safe evolution.
- **Interface Segregation (I)**: Frontend services are cohesive, but backend routes expose overlapping functionality.
- **Dependency Inversion (D)**: Frontend depends directly on concrete implementations (Supabase client, fetch) instead of abstracted services.

## Technical Debt
- Split FastAPI routes into dedicated routers (auth, contracts, maintenances, pdf, ai).
- Replace invalid AI model references in edge functions.
- Harden JWT authentication (secret rotation, refresh tokens, secure storage).
- Update Vitest specs to reflect current components or retire them temporarily.
- Introduce a service layer in the backend to avoid manipulating dictionaries across handlers.
- Consolidate the PDF upload pipeline (single ingestion path instead of parallel Vercel + FastAPI flows).

## Improvement Opportunities
- Introduce a background queue (Celery, RQ, or Supabase functions) for heavy PDF/AI workloads.
- Build shared backend services (contracts, maintenances, documents) with automated tests.
- Strengthen the existing JWT authentication or evaluate Supabase Auth for future requirements.
- Adopt OpenRouter as the unified gateway for AI providers.
- Add observability (Sentry, OpenTelemetry, or centralized Supabase logs).
