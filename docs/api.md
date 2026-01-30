# API Documentation

## Overview
The FastAPI backend exposes REST endpoints under `/api/*` secured by JWT bearer tokens. Supabase edge functions and Vercel-style `/api` routes complement the backend for document and AI workflows. This document summarizes the primary contracts identified in `backend/main.py` (March 2025 snapshot).

## Base URLs
```
Development: http://localhost:8000
Production (Railway): https://luminus-ai-hub-back-production.up.railway.app
```
Unless noted otherwise, endpoints are prefixed with `/api`.

## Authentication
- **Method**: JWT bearer (`Authorization: Bearer <token>`)
- **Issuance**: `POST /api/auth/signin` returns `{ success, token, user }`
- **Validation**: `verify_token` in `backend/main.py`; no refresh flow currently
- **Storage**: Tokens are stored client-side (localStorage) via `AuthContext`

## Endpoints

### Auth (`tags=["auth"]`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/signup` | Create a user record via `SupabaseDB.create_user` |
| POST | `/auth/signin` | Authenticate and issue JWT |
| POST | `/auth/signout` | Client-triggered logout (no server revocation) |
| GET  | `/auth/user` | Return the authenticated user |
| PUT  | `/auth/update-profile` | Update user profile fields |
| PUT  | `/auth/change-password` | Change user password |

### Contracts (`tags=["contracts"]`)
| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/contracts` | List contracts scoped by `user_id` |
| POST   | `/contracts` | Create a contract (metadata, services, equipment) |
| PUT    | `/contracts/{id}` | Update a contract |
| DELETE | `/contracts/{id}` | Delete a contract |

> Frontend hooks still read from Supabase directly; ensure caches stay in sync after backend updates.

### Maintenances (`tags=["maintenances"]`)
| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/maintenances` | List maintenances for the user/contract |
| POST   | `/maintenances` | Create maintenance entries |
| PUT    | `/maintenances/{id}` | Update maintenance records |
| DELETE | `/maintenances/{id}` | Delete maintenance records |
| POST   | `/generate-maintenance` | Generate maintenance schedule (AI) |
| POST   | `/generate-maintenance-plan` | Duplicate AI plan endpoint; needs consolidation |

### Clients (`tags=["clients"]`)
| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/clients` | List clients |
| POST   | `/clients` | Create client |
| PUT    | `/clients/{id}` | Update client |
| DELETE | `/clients/{id}` | Delete client (with optional document cleanup) |

### Dashboard & Admin
- `GET /dashboard-metrics` – Aggregates contracts, revenue, overdue maintenances, projections.
- `/admin/table-stats` (outside `/api`) – Table counts and storage metrics.
- `/admin/detailed-metrics` – Detailed breakdown of system metrics.

### PDF & Documents (`tags=["pdf"]`, `tags=["reports"]`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/process-base64-pdf` | Process base64 PDF (PDFExtractor + AI) |
| POST | `/process-pdf-storage` | Process PDF fetched from storage URL |
| POST | `/process-pdf` | Legacy processing endpoint |
| POST | `/process-pdf-fallback` | Fallback pipeline for PDF processing |
| POST | `/extract-pdf` | Extract structured contract data |
| POST | `/extract-text` | Extract raw text |
| POST | `/generate-document` | Generate AI-driven document |
| POST | `/generate-ai-reports` | Produce AI reports via `DocumentGeneratorFactory` |
| POST | `/generated-reports` | Persist metadata for generated reports |

### Chat & AI (`tags=["chat"]`, `tags=["ai-agents"]`)
| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/ai-agents` | List available AI agents |
| GET  | `/chat-sessions` | List chat sessions (duplicated handlers exist) |
| POST | `/chat-sessions` | Create a chat session |
| GET  | `/chat-sessions/{session_id}` | Retrieve a specific session |
| GET  | `/chat-messages/{session_id}` | List messages for a session |
| POST | `/chat-messages` | Append a message to a session |
| POST | `/chat` | AI chat endpoint |
| GET  | `/agno-status` | Returns Agno system status |

### Uploads & Jobs (`tags=["upload"]`, `tags=["jobs"]`)
- `POST /start-upload-session` and `GET /progress-stream/{session_id}` – SSE-based upload progress.
- `GET /job-status/{job_id}` – Poll long-running job status.
- `POST /log-error` – Client-side error logging gateway.

### Health & Config
- `GET /health` – Public health check.
- `GET /api/health` – Alias for internal checks.
- `GET /api/timeout-config` – Returns synchronized timeout configuration.
- `GET /` – Service metadata.

## Supabase Edge & Serverless Functions
- Edge functions under `supabase/functions/*` power contract processing, maintenance plans, chat, etc. Replace unsupported models (`gpt-5-mini-2025-08-07`) with available alternatives.
- `/api/*.ts` on the frontend (Vercel-style) currently return mocked responses; they require further integration.

## Request/Response Conventions
- Successful responses typically use `{ "success": true, "data": ... }` or direct payloads (not always consistent).
- Errors: `JSONResponse` with `detail` or `message`; frontend parses `detail/message/error`.
- SSE endpoints stream `text/event-stream` updates.
- PDF uploads use JSON (base64) today; consider migrating to `multipart/form-data`.

## Error Handling
- Frontend `handleApiError` maps 408/network/server errors.
- Backend custom handlers cover 404/500 but lack structured logging in some cases.
- Standardize responses with Pydantic models and consistent logging.

## Rate Limiting
- No native rate limiting is implemented. Hooks like `useRateLimit` only manage UI behavior. Add backend rate limiting before production hardening.

## Testing
- `backend/scripts/testing/test_system.py` covers `/health`, `/`, PDF libs, Agno, and chat.
- No unit tests exist for individual endpoints—plan FastAPI TestClient coverage.
