# Testing Strategy

## Current Coverage
- **Frontend**
  - Vitest + Testing Library (`npm run test`)
  - `src/pages/Dashboard.test.tsx` and `hooks/useAuth.test.tsx`
  - Test utilities under `src/test/test-utils.tsx`
  - Note: existing specs reference legacy components and fail against the current UI
- **Backend**
  - Manual scripts in `backend/scripts/testing/`
    - `test_system.py` (health, root, chat, PDF libraries, Agno system)
    - `test_extraction.py`, `check_ai_agents.py`, `check_contracts.py`, etc.
  - No pytest or FastAPI `TestClient` coverage
- **Supabase Edge Functions**
  - No automated tests; validation relies on CLI logs or manual calls

## Tooling
- Frontend: Vitest (`npm run test`, `npm run test:ui`)
- Linting: `npm run lint` (ESLint 9)
- Backend: Python scripts using `requests`
- CI: No pipeline configured yet

## Identified Gaps
- Frontend tests are outdated and should be rewritten or temporarily disabled.
- Backend lacks automated unit/integration tests (0% test coverage).
- Manual scripts are not tied to deployment pipelines.
- Edge functions have no test harness, increasing the risk of silent regressions.
- Integrations with OpenAI/Gemini lack mocks, making automated testing difficult.

## Recommendations
1. **Frontend**
   - Update dashboard specs to cover `IntelligentMetrics`, `AIInsights`, and other current components.
   - Add tests for `AuthContext` covering login/logout happy paths.
   - Exercise critical hooks (`useOptimizedRealtimeSync`, `useContractExtraction`) with mocked services.
2. **Backend**
   - Introduce a pytest suite using `TestClient`.
   - Mock `SupabaseDB` and AI clients to isolate logic.
   - Add route coverage for `/api/contracts`, `/api/maintenances`, `/api/chat`.
3. **Edge Functions**
   - Use `deno test` or a custom harness with `supabase/functions serve`.
   - Validate success and failure paths for functions like `generate-maintenance-plan`.
4. **Automation**
   - Configure GitHub Actions (or Railway pipelines) to run lint + tests on every PR.
   - Publish coverage results and block merges on failure.

## Manual QA Checklist
- Authentication (`/auth`) login and sign-up flows
- Dashboard loading metrics without console errors
- Contract CRUD (create, edit, delete, upload documents)
- AI plan/report generation workflows
- Chat experience (send messages, view history, create sessions)
- Admin pages `/app/admin` for table metrics
- Realtime updates: maintenance changes reflected in dashboards
- Large PDF uploads: verify SSE progress and timeout handling

## Testing Artifacts
- Console output from scripts in `backend/scripts/testing`
- Prompts and fixtures maintained in `backend/prompts`
- `frontend.log` and `backend/backend.log` provide useful diagnostics after test runs
