# Technology Stack

## Overview
The solution combines a React SPA with a FastAPI monolith, Supabase for database/realtime/edge functions, and AI agents powered by OpenAI and Gemini. Vite handles bundling, and production runs on Railway with Nixpacks.

## Frontend
**Framework**: React 18.3 + TypeScript  
**Build Tool**: Vite 5 (`@vitejs/plugin-react-swc`)  
**State & Data**
- TanStack Query 5 for caching, invalidation, retries
- React contexts (`AuthContext`, `OptimizedQueryProvider`)
- Custom hooks for realtime sync, uploads, AI tasks
**UI/UX**
- shadcn/ui with Radix primitives (accordion, dialog, dropdown, tabs, toast)
- Tailwind CSS with custom tokens defined in `tailwind.config.ts`
- `lucide-react` icons
**Forms & Validation**
- `react-hook-form` + `zod` (`@hookform/resolvers`)
**Routing**: `react-router-dom` 6  
**Charts & Calendars**: `recharts`, `react-big-calendar`, `react-day-picker`  
**Documents**: `react-quill`, `html2canvas`, `jspdf`, `xlsx`

## Backend
**Runtime**: Python 3.9+  
**Framework**: FastAPI 0.112 + Uvicorn  
**AI & Agents**
- `openai>=1.101.0` via `openai.OpenAI`
- Google Gemini (`google-genai`)
- Agno agents/workflows under `backend/agno_agents` and `backend/agno_workflows`
- Prompt loader in `backend/utils/prompt_loader.py`
**PDF Processing**
- `pdfplumber`, `PyPDF2`, `pdfminer.six`, `pdf2image`, `pytesseract`
- Supabase edge fallbacks (PDF.co integration)
**Auth & Security**
- JWT with `PyJWT`, password hashing via `bcrypt`, `passlib`
- Direct PostgreSQL access using `psycopg2-binary`
- Supabase RLS managed through SQL migrations
**Configuration & Utilities**
- `python-dotenv`, `pydantic` for configuration
- `psutil`, `requests/httpx` for system checks and HTTP integrations

## Database
- **Engine**: Supabase PostgreSQL
- **Schema**: `public` (staging schema scripted but unused)
- **Data Access**: Direct SQL via `psycopg2`; no ORM in use
- **Migrations**: SQL files under `supabase/migrations/*.sql` executed by `backend/migrate.py`

## Infrastructure
- **Backend Hosting**: Railway using `backend/nixpacks.toml` and `Procfile`
- **Frontend Hosting**: Lovable static deploy (pipeline pending automation)
- **Serverless**
  - Supabase edge functions (Deno) for PDF extraction, AI reports, chat workflows
  - `/api/*.ts` (Vercel-style) functions with permissive CORS; currently return mocked payloads
- **Realtime/Storage**: Supabase realtime channels and Storage buckets (`contract-documents`)

## Development Tooling
- **Linting**: ESLint 9 (`eslint.config.js`) with React Hooks/Refresh plugins
- **Formatting**: Tailwind + PostCSS; Prettier not configured
- **Testing**
  - Frontend: Vitest + Testing Library (limited, outdated coverage)
  - Backend: Python scripts under `backend/scripts/testing/*`
- **Bundling**: Vite manual chunk splitting (see `vite.config.ts`) with Terser minification
- **Component Tagging**: `lovable-tagger` active in development mode

## Key Dependencies
- Production: `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, `@langchain/*`, `express`, `pdf-parse`, `jspdf`, `html2canvas`, `moment`, `date-fns`
- Development: `vitest`, `@vitest/ui`, `@testing-library/*`, `jsdom`, `@eslint/js`, `typescript-eslint`, `tailwindcss`, `autoprefixer`, `postcss`

## Version Compatibility
- Node >= 18 (per `package.json` engines)
- Supabase PostgREST 12.2.3 (see `src/integrations/supabase/types.ts`)
- Python 3.9+ (per Nixpacks configuration)
- AI integrations require valid OpenAI and Google API keys
- References to `gpt-5-mini-2025-08-07` are invalid and must be replaced

## Trade-offs
- **Dual Supabase access**: Frontend retains Supabase client for realtime/storage, increasing exposure while backend also accesses the DB directly.
- **Direct SQL**: Offers performance control but demands careful serialization and manual validation.
- **Edge vs Backend overlap**: Some AI/PDF flows exist in both edge functions and FastAPI, increasing maintenance cost.
- **No ORM**: Reduces overhead but pushes data validation/serialization to custom code.
- **Custom Auth**: Provides independence but lacks refresh logic and hardened storage.

## Recommendations
- Centralize AI usage through an OpenRouter-backed client and configure supported models.
- Remove Supabase keys from the frontend bundle; route sensitive operations through the backend.
- Modularize the backend into FastAPI routers and consider `SQLModel`/`SQLAlchemy` for complex queries.
- Standardize date utilities (phase out `moment` in favor of `date-fns`).
- Introduce CI pipelines for linting/tests and monitor dependency vulnerabilities.
- Strengthen the custom JWT auth (secret rotation, refresh tokens, secure storage) or evaluate Supabase Auth for advanced requirements.
