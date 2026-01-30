-- Migration: Fix maintenance_checklist schema
-- Description: Ensures maintenance_checklist table exists with correct structure
-- Date: 2025-01-27

-- Create maintenance_checklist table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_maintenance_id 
ON maintenance_checklist(maintenance_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_is_completed 
ON maintenance_checklist(is_completed);

-- Enable RLS
ALTER TABLE maintenance_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can view maintenance checklist" 
ON maintenance_checklist FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can insert maintenance checklist" 
ON maintenance_checklist FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can update maintenance checklist" 
ON maintenance_checklist FOR UPDATE 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can delete maintenance checklist" 
ON maintenance_checklist FOR DELETE 
USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenance_checklist_updated_at ON maintenance_checklist;
CREATE TRIGGER update_maintenance_checklist_updated_at
    BEFORE UPDATE ON maintenance_checklist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
