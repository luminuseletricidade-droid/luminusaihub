# Setup Guide

## 1. Clone and Prepare the Environment
```bash
git clone <repo>
cd luminus-ai-hub
```

### Requirements
- Node.js 18+
- npm (or Bun 1.0+, as `bun.lock` is present)
- Python 3.9+ with `venv`
- Supabase project (URL + anon/service role keys)
- Accessible PostgreSQL database via `SUPABASE_DB_URL`
- API keys: `OPENAI_API_KEY`, optional `GEMINI_API_KEY`, and `JWT_SECRET`

## 2. Environment Variables

### Frontend (`.env`)
Create a new file based on the template below:
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_CONTRACTS_BUCKET=contract-documents
```

### Backend (`backend/.env`)
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
SUPABASE_DB_URL=postgres://user:pass@host:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=change-me
ENVIRONMENT=development
LOG_LEVEL=INFO
TIMEZONE=America/Sao_Paulo
```

> **Important**: Set a strong `JWT_SECRET`; never rely on the fallback value.

## 3. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Database
1. Configure `SUPABASE_DB_URL` (Supabase connection string or local PostgreSQL).
2. Apply migrations:
   ```bash
   cd backend
   source venv/bin/activate
   python migrate.py migrate
   ```
3. Optional: run validation scripts (`python scripts/database/check_status_tables.py`).

## 5. Development Servers
```bash
# Terminal 1 – frontend
npm run dev    # http://localhost:5173

# Terminal 2 – backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Ensure `VITE_API_URL` in the frontend `.env` points to `http://localhost:8000`.

## 6. Testing (Optional)
```bash
npm run lint
npm run test

cd backend
source venv/bin/activate
python scripts/testing/test_system.py
```

## 7. Supabase Edge Functions
- Keep edge functions in sync (`supabase/functions`)
- Configure environment via `supabase/config.toml`
- Deploy with the Supabase CLI:
  ```bash
  supabase functions deploy generate-maintenance-plan
  ```
  Repeat for additional functions as needed.

## 8. Serverless Functions (`/api`)
- Used by Lovable/Vercel deployments
- Provide `VITE_API_URL` pointing to the correct backend instance
- Ensure dependencies (`pdf-parse`, `express`, etc.) are available in the hosting environment

## 9. Logs & Debugging
- **Frontend**: `frontend.log`
- **Backend**: `backend/backend.log`
- Set `LOG_LEVEL=DEBUG` in `.env` for verbose backend logs during troubleshooting

## 10. Final Checklist
- [ ] `.env` configured at project root and within `backend/`
- [ ] Migrations applied successfully
- [ ] Backend accessible at `http://localhost:8000/health`
- [ ] Frontend accessible at `http://localhost:5173`
- [ ] Supabase realtime subscriptions confirmed in the console (`✅ Subscribed...`)
