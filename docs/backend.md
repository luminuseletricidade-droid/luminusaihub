# Backend Documentation

## Overview
The FastAPI backend centralizes authentication, contract and maintenance CRUD, PDF processing, and AI agent orchestration. It currently behaves as a monolith (`backend/main.py`) backed by helper modules for database access, agents, and operational scripts.

## Framework & Entry Point
- **Framework**: FastAPI 0.112
- **Entry module**: `main.py` (initializes the `FastAPI` app, middlewares, and routes)
- **Server**: Uvicorn (`uvicorn main:app --host 0.0.0.0 --port 8000`)
- **Documentation**: Swagger UI available at `/docs`

## Project Structure
```
backend/
├── main.py                    # API, middlewares, endpoints
├── auth.py                    # JWT helpers, user creation/authentication
├── database.py                # psycopg2 wrapper with serialization helpers
├── agno_system_optimized.py   # AI orchestration (OpenAI/Gemini)
├── agno_agents/               # Specialized agents (PDF, chat, reports, schedules)
├── agno_workflows/            # Orchestrated workflows (contracts, maintenance)
├── utils/                     # PDF extractor, business-day helpers, prompt loader
├── scripts/                   # Testing, maintenance, migration helpers
├── prompts/                   # YAML prompts consumed by agents
└── config.py                  # App configuration (CORS, timeouts, logging)
```

## Architecture Layers
1. **API Layer**  
   - Routes under `/api/*`, stream endpoints (`/api/progress-stream/{session_id}`), and admin routes (`/admin/*`).  
   - Middlewares: permissive CORS (development), optional TrustedHost middleware.  
   - Security: `HTTPBearer` dependency + `verify_token` for JWT validation.
2. **Service Layer**  
   - Most business logic lives inline in `main.py`, operating directly on the database wrapper.  
   - AI features invoke `DocumentGeneratorFactory` and the shared Agno system instance.
3. **Data Layer**  
   - `SupabaseDB` (psycopg2) executes SQL with retry logic and serializes datetimes/decimals.  
   - Direct SQL is used instead of an ORM; queries must enforce user scoping manually.
4. **AI Layer**  
   - `OptimizedAgnoSystem` handles prompt orchestration, caching, and AI client wiring.  
   - Agents include PDF processing, maintenance planning, reporting, scheduling, and chat.

## Request / Response Flow
1. Requests include a bearer token that `verify_token` decodes and validates.  
2. Handlers obtain a `SupabaseDB` instance via `get_db()`.  
3. SQL queries run directly against PostgreSQL; results are serialized for JSON responses.  
4. AI-heavy routes call Agno agents or factories before returning results.  
5. Long-running tasks (PDF/OCR) currently block the request thread; no job queue is configured.

## Middleware & Utilities
- `CORSMiddleware` respects origins defined in `Config.CORS_ORIGINS` (currently broad).  
- Trusted host middleware is imported but not enabled.  
- Timeouts are synchronized with the frontend through `Config.TIMEOUT_CONFIG`.  
- Logging uses Python’s standard logging module, outputting to `backend/backend.log`.

## Error Handling
- Custom handlers for 404 and 500 responses provide consistent JSON payloads.  
- AI and PDF routines log detailed errors but rely on generic exception handling.  
- SSE endpoints return domain-specific errors such as `timeout` or `network` conditions.  
- Standardizing error responses via Pydantic models is recommended.

## Logging & Monitoring
- Rich logging (emoji-based) is sprinkled throughout `main.py`.  
- Operational scripts (e.g., `backend/scripts/testing/test_system.py`) provide ad-hoc health checks.  
- There is no centralized monitoring or tracing; consider integrating Sentry or OpenTelemetry.

## Performance & Scaling
- CPU-intensive work (PDF parsing, AI calls) executes synchronously, delaying responses.  
- Consider offloading to background workers (Celery/RQ) or Supabase edge functions with callbacks.  
- `OptimizedAgnoSystem` caches processed PDFs by hash; persistence beyond runtime is not available.

## Background Jobs
- No built-in scheduler; maintenance scripts under `backend/scripts/maintenance` must be triggered manually.  
- Several Supabase edge functions handle asynchronous workloads for document processing and AI.

## Admin & Metrics
- `/admin/table-stats` and `/admin/detailed-metrics` expose table statistics, row counts, and storage usage.  
- Utilities like `check_status_tables.py` and `apply_staging_migrations.py` validate operational readiness.

## PDF Processing Stack
- `utils/pdf_extractor.PDFExtractor` detects available libraries (pdfplumber, PyPDF2, pdfminer, OCR) and applies fallbacks.  
- Supabase functions (e.g., `extract-contract-data`) call external services like PDF.co and supply structured output.  
- `test_pdf_optimization.py` validates the local extraction pipeline.

## Authentication
- Refer to [docs/authentication.md](authentication.md) for details.  
- JWT tokens must be supplied on each request; ensure `JWT_SECRET` is configured securely.

## Areas for Improvement
- Split `main.py` into domain-specific routers and services.  
- Introduce Pydantic request/response schemas instead of raw dict manipulation.  
- Add asynchronous/background execution for heavy AI/PDF tasks.  
- Implement automated tests with `FastAPI TestClient` and pytest.  
- Enforce rate limiting and stricter CORS policies for production.  
- Move secrets into a dedicated secret manager and remove permissive defaults.
