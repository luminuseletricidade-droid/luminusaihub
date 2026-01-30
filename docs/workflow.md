# Development Workflow

## Branching & Commits
- Follow a lightweight Git flow (`main` plus feature branches).
- Use Conventional Commit messages (`feat:`, `fix:`, `chore:`).
- Rebase against `origin/main` before starting new work.

## Daily Flow
1. **Plan** – Review [docs/project-overview.md](project-overview.md) and [docs/architecture.md](architecture.md) to understand impact areas.
2. **Branch** – `git checkout -b feat/feature-name`.
3. **Environment** – Run setup scripts as needed (see [docs/setup.md](setup.md)).
4. **Develop**
   - Frontend: reuse existing hooks/components; avoid duplicating business logic.
   - Backend: prefer new routers/modules instead of expanding `main.py`.
   - AI: document new prompts under `backend/prompts/` and update [docs/ai.md](ai.md).
5. **Test**
   - `npm run lint`
   - `npm run test` (when applicable)
   - `python backend/scripts/testing/test_system.py`
6. **Document**
   - Update `docs/` if flows change.
   - Consider new or updated playbooks in `agents/`.
7. **Commit & Push**
   - `git add`
   - `git commit -m "feat: short message"`
   - `git push origin feat/feature-name`
8. **Pull Request**
   - Describe the impact, attach screenshots/logs, and list test results.
   - Call out follow-up tasks or technical debt.

## Data Synchronization
- **Realtime**: use `useOptimizedRealtimeSync` to invalidate relevant queries.
- **Mutations**: centralize REST calls in `services/api.ts` or dedicated wrappers.
- **Migrations**: generate via `python backend/create_migration.py <name>` and apply with `python backend/migrate.py migrate`.
- **Edge Functions**: after changes, run `supabase functions serve <function>` locally before deploying.

## Code Review Checklist
- Is the endpoint protected by the correct authentication/authorization?
- Do React Query hooks invalidate the right cache keys?
- Does the UI follow Tailwind/shadcn conventions?
- Are AI prompt or agent updates reflected in the documentation?
- Are secrets kept out of the codebase and commit history?

## Deployment Preparation
- Update production `.env` files with new variables or changed values.
- Verify migrations with `python backend/migrate.py status`.
- Run smoke tests and health checks before and after deployment.
- Review `backend/backend.log` and runtime logs post-release.

## Incident Response
- Use scripts in `backend/scripts/maintenance` for quick fixes.
- Diagnose issues with `backend/scripts/testing/*`.
- Record incidents, follow-up actions, and update related improvement prompts.
