-- Create maintenance_checklist_templates table
CREATE TABLE IF NOT EXISTS maintenance_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    maintenance_type VARCHAR(100),
    items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_user_id
ON maintenance_checklist_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_is_active
ON maintenance_checklist_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_maintenance_type
ON maintenance_checklist_templates(maintenance_type);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenance_checklist_templates_updated_at ON maintenance_checklist_templates;

CREATE TRIGGER update_maintenance_checklist_templates_updated_at
    BEFORE UPDATE ON maintenance_checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE maintenance_checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_checklist_templates_insert_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_insert_policy ON maintenance_checklist_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS maintenance_checklist_templates_select_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_select_policy ON maintenance_checklist_templates
    FOR SELECT
    USING (auth.uid() = user_id OR is_active = true);

DROP POLICY IF EXISTS maintenance_checklist_templates_update_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_update_policy ON maintenance_checklist_templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS maintenance_checklist_templates_delete_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_delete_policy ON maintenance_checklist_templates
    FOR DELETE
    USING (auth.uid() = user_id);
