# Deployment Guide

## Overview
Current deployment setup:
- **Backend**: Railway (PaaS) using Nixpacks
- **Frontend**: Lovable static hosting (pipeline should be revisited)
- **Supabase**: Database, storage, and edge functions
- **Serverless**: Vercel-style functions under `/api` for auxiliary tasks

## Backend (Railway)
1. **Configuration**
   - `backend/railway.toml` defines the service
   - `backend/nixpacks.toml` installs Python, pip, and project requirements
   - `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port 8000`
2. **Required Environment Variables**
   - `OPENAI_API_KEY`, optional `GEMINI_API_KEY`
   - `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`, `LOG_LEVEL`, `ENVIRONMENT`
3. **Pipeline**
   - Railway detects the repo, installs dependencies, executes `python3 migrate.py migrate` (via Nixpacks), then starts Uvicorn.
   - Monitor deployment output through the Railway dashboard or `railway.json`.
4. **Post-Deploy Verification**
   - Call `GET /health`.
   - Call `GET /admin/table-stats` with a valid token.
   - Review logs in the Railway console.

## Frontend
- Lovable currently handles builds (`npm run build`) and hosting.
- Manual verification:
  ```bash
  npm run build
  npm run preview -- --host 0.0.0.0 --port 3000
  ```
- Ensure `VITE_API_URL` in the deployed environment points to the correct backend.
- Consider moving to Vercel/Netlify with a GitHub Actions pipeline.

## Supabase
1. **Migrations**
   - Run `python backend/migrate.py migrate` during backend deployment.
   - Alternatively, use Supabase CLI (`supabase db push`).
2. **Edge Functions**
   ```bash
   supabase functions deploy generate-maintenance-plan
   supabase functions deploy extract-contract-data
   # ...add the remaining functions from supabase/functions
   ```
3. **Environment Variables**
   - Configure `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`, etc. via the Supabase dashboard (Project Settings → Functions).

## Serverless `/api`
- Files under `api/*.ts` (Express handlers) are used by Lovable/Vercel deployments.
- Confirm `package.json` includes required dependencies (`express`, `pdf-parse`, etc.).
- If deploying to Vercel directly, add a `vercel.json` or equivalent configuration.

## Deployment Checklist
- [ ] Migrations applied successfully (check Railway logs).
- [ ] Edge functions deployed (`supabase functions list`).
- [ ] Environment variables configured for all services.
- [ ] Secrets not exposed in the frontend build.
- [ ] Health check returns OK (`/health`).
- [ ] Logs monitored post-release (Railway and Supabase).

## Rollback
- Railway supports rolling back to a previous deployment via the UI.
- Migrations should be reversible; implement `backend/migrate.py downgrade <version>` if needed (currently missing).
- Edge functions: redeploy the last known good version using the Supabase CLI.

## Observability
- No integration with Sentry/Datadog yet. Recommended:
  - Structured JSON logging or forwarding to a log aggregation service.
  - HTTP uptime monitoring (Statuspage, BetterUptime) targeting `/health`.

## Future Improvements
- Automate a GitHub Actions pipeline:
  1. Lint + tests
  2. Build frontend
  3. Deploy backend (Railway CLI) and frontend (Vercel/Lovable)
  4. Run smoke tests post-deploy (`python backend/scripts/testing/test_system.py`)
- Introduce feature flags via environment variables for auth improvements and OpenRouter rollout.
