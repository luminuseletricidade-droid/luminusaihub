# Database Documentation

## Overview
- **Engine**: PostgreSQL managed by Supabase  
- **Active schema**: `public` (staging schema scripts exist but are not in use)  
- **Access paths**:
  - Backend: direct PostgreSQL connection via `psycopg2` (`SupabaseDB`) using `SUPABASE_DB_URL`
  - Frontend/Edge: `@supabase/supabase-js` client for realtime, storage, and edge functions
- **Supabase features**: Realtime channels, Storage bucket (`contract-documents`), custom RLS policies defined in migrations

## Schema Highlights
The schema is captured in `src/integrations/supabase/types.ts` and aligns with the SQL migrations.

### Core Tables

#### `clients`
- Master data (name, CNPJ, contact, address, status)
- Relationships: `contracts`, `client_documents`, `client_users`

#### `contracts`
- Key fields: `contract_number`, `contract_type`, `start_date`, `end_date`, `value`, `status`, `services` (JSON), `equipment_*`
- Relationships: `clients` (FK `client_id`), `maintenances`, `contract_documents`, `ai_predictions`

#### `maintenances`
- Fields: `scheduled_date`, `status`, `type`, `priority`, `notes`, `contract_id`
- Relationships: `contracts`, `equipment`, `maintenance_logs`

#### `equipment`
- Fields: `model`, `brand`, `power`, `voltage`, `installation_date`, `contract_id`
- Relationships: `contracts`, `ai_predictions`

#### `generated_reports`
- Stores AI outputs (HTML/Markdown, metadata, filters, status)
- Relationships: `contracts`, `clients`, `users`

#### `chat_sessions` / `chat_messages`
- Sessions: `agent_id`, `contract_id`, `user_id`
- Messages: `role`, `content`, `metadata`, `session_id`
- RLS adjusted by multiple migrations (`00039`–`00042`) to fix permissions

#### `ai_agents`, `ai_generated_plans`, `ai_predictions`
- Store agent configurations, generated plans, and predictive insights
- `ai_generated_plans` references `contracts`, `user_id`, `plan_type`

#### `client_documents`, `contract_documents`
- Supabase Storage metadata (name, category, path, size, uploader)
- Default bucket configured in `src/integrations/supabase/client.ts`

### Additional Entities
- `users`, `client_users` (user ↔ client relationships)
- Lookup tables: `maintenance_status`, `status_tables`
- Analytics tables: `document_analysis`, `contract_analyses`, `data_charts`, `dashboard_metrics`

## Migrations
- Located in `supabase/migrations/00000_*.sql` through `00044_*`
- Frequent RLS adjustments (`00022`, `00023`, `00035`, `00039`, etc.)
- Python helpers (`backend/migrate.py`, `apply_staging_migrations.py`) run migrations via direct SQL
- `_old_migrations` contains deprecated scripts; root-level `fix_*.sql` patches apply emergency fixes

### Execution Strategy
1. Apply migrations locally or in CI with `python backend/migrate.py migrate`.
2. Additional staging/manual scripts live under `backend/scripts/database/*`.
3. Supabase edge function `apply-migrations` can be deployed if remote automation is needed.

## Optimization Notes
- Initial migrations add indexes on primary keys and foreign keys.
- Review JSONB-heavy columns (`services`, `metadata`) for GIN indexes if query patterns demand it.
- Realtime filters rely on `user_id`/`contract_id`; ensure those columns remain indexed.

## Row-Level Security
- RLS policies have been revised repeatedly for `chat_sessions`, `client_documents`, `contracts`.
- Some migrations temporarily disable RLS (`00043_disable_rls_problematic_tables.sql`); confirm policies are re-enabled in production.
- Security reviews should include Supabase’s policy inspector to validate access rules.

## Storage Strategy
- Buckets: `contract-documents` (default) with optional staging bucket configured via environment variables.
- Frontend uploads via Supabase Storage; backend jobs process and enrich metadata.
- Categories tracked in `contract_documents.category` for filtering and organization.

## Backup & Maintenance
- Scripts such as `backend/reset_database.py` and `setup_staging_schema.py` support local maintenance.
- Supabase provides managed backups; document retention policies should be reviewed with stakeholders.
- `backend/scripts/testing/check_status_tables.py` verifies auxiliary tables and status records.

## Data Dictionary (selected fields)
| Field | Description |
|-------|-------------|
| `contract_number` | Human-readable contract identifier |
| `contract_type` | Text enum (`maintenance`, `rental`, `hybrid`) |
| `maintenance_frequency` | Declared frequency of maintenance visits |
| `services` | JSON array detailing contracted services |
| `operational_status` | Operational indicator (`on_schedule`, `delayed`, `pending`) |
| `plan_type` | Type of AI-generated plan (`technical_analysis`, `operational_calendar`, etc.) |
| `status_tables` | Lookup used for dashboard color/label mappings |

## Pending Actions
- Produce a formal ERD (Supabase Studio export or DBML) for onboarding and maintenance.
- Refresh `src/integrations/supabase/types.ts` whenever new migrations add columns or tables.
- Validate environment-specific schemas (ensure production and staging point to the intended schema).
