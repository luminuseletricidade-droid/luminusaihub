-- Migration: Create maintenance_checklist_meta
-- Description: Stores progress and required counters per maintenance_id
-- Date: 2025-10-28

CREATE TABLE IF NOT EXISTS maintenance_checklist_meta (
  maintenance_id UUID PRIMARY KEY REFERENCES maintenances(id) ON DELETE CASCADE,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  required_total INTEGER NOT NULL DEFAULT 0,
  required_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups (redundant with PK but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_meta_maintenance_id
ON maintenance_checklist_meta (maintenance_id);

-- Enable RLS
ALTER TABLE maintenance_checklist_meta ENABLE ROW LEVEL SECURITY;

-- Permissive policies (align with existing maintenance_checklist policies)
DROP POLICY IF EXISTS "Users can view maintenance checklist meta" ON maintenance_checklist_meta;
CREATE POLICY "Users can view maintenance checklist meta"
ON maintenance_checklist_meta FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can upsert maintenance checklist meta" ON maintenance_checklist_meta;
CREATE POLICY "Users can upsert maintenance checklist meta"
ON maintenance_checklist_meta FOR ALL
USING (true) WITH CHECK (true);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_maintenance_checklist_meta_updated_at ON maintenance_checklist_meta;
CREATE TRIGGER update_maintenance_checklist_meta_updated_at
  BEFORE UPDATE ON maintenance_checklist_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notice
DO $$ BEGIN
  RAISE NOTICE '✅ Migration 00049_create_maintenance_checklist_meta.sql applied';
END $$;


