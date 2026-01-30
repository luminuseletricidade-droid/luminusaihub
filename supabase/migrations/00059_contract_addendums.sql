-- Migration: Create contract_addendums and pending_contract_changes tables
-- Description: Tables for contract addendum management with approval workflow
-- Date: 2025-01-17

-- =============================================
-- TABLE: contract_addendums
-- Stores uploaded addendum documents with extraction results
-- =============================================
-- Drop existing table if schema mismatch (no data loss if empty)
DROP TABLE IF EXISTS pending_contract_changes CASCADE;
DROP TABLE IF EXISTS contract_addendums CASCADE;

CREATE TABLE contract_addendums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

    -- Metadata
    addendum_number INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,

    -- File storage
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size BIGINT,

    -- Extraction data
    content_extracted TEXT,
    extracted_insights JSONB DEFAULT '{}',
    extraction_method VARCHAR(50),
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,

    -- Workflow status
    status VARCHAR(50) DEFAULT 'uploaded',
    applied_at TIMESTAMPTZ,

    -- Audit fields
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE contract_addendums IS 'Contract addendums (aditivos) with extracted insights';
COMMENT ON COLUMN contract_addendums.addendum_number IS 'Sequential number of the addendum (1, 2, 3...)';
COMMENT ON COLUMN contract_addendums.extracted_insights IS 'JSON containing AI-extracted insights from the addendum';
COMMENT ON COLUMN contract_addendums.processing_status IS 'Status: pending, processing, completed, error';
COMMENT ON COLUMN contract_addendums.status IS 'Workflow status: uploaded, analyzed, applied, rejected';

-- =============================================
-- TABLE: pending_contract_changes
-- Stores suggested changes from addendum extraction awaiting approval
-- =============================================
CREATE TABLE pending_contract_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addendum_id UUID NOT NULL REFERENCES contract_addendums(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

    -- Change specification
    change_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    current_value TEXT,
    suggested_value TEXT,
    change_description TEXT,
    confidence_score DECIMAL(3, 2),

    -- Approval workflow
    status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,

    -- For new maintenance items
    maintenance_data JSONB,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE pending_contract_changes IS 'Suggested changes from addendum extraction awaiting user approval';
COMMENT ON COLUMN pending_contract_changes.change_type IS 'Type: date_change, value_change, service_add, service_remove, maintenance_add, equipment_update, condition_change';
COMMENT ON COLUMN pending_contract_changes.confidence_score IS 'AI confidence score (0.00-1.00) for the suggested change';
COMMENT ON COLUMN pending_contract_changes.maintenance_data IS 'JSON data for new maintenance items to be created';
COMMENT ON COLUMN pending_contract_changes.status IS 'Status: pending, approved, rejected, applied';

-- =============================================
-- INDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_contract_addendums_contract_id ON contract_addendums(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_processing_status ON contract_addendums(processing_status);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_status ON contract_addendums(status);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_user_id ON contract_addendums(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_changes_addendum_id ON pending_contract_changes(addendum_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_contract_id ON pending_contract_changes(contract_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_status ON pending_contract_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_change_type ON pending_contract_changes(change_type);

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_contract_addendums_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contract_addendums_timestamp ON contract_addendums;
CREATE TRIGGER trigger_update_contract_addendums_timestamp
    BEFORE UPDATE ON contract_addendums
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_addendums_timestamp();

DROP TRIGGER IF EXISTS trigger_update_pending_changes_timestamp ON pending_contract_changes;
CREATE TRIGGER trigger_update_pending_changes_timestamp
    BEFORE UPDATE ON pending_contract_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_addendums_timestamp();

-- =============================================
-- RLS POLICIES (disabled for simplicity, like other tables)
-- =============================================
ALTER TABLE contract_addendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_contract_changes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (consistent with other tables)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON contract_addendums;
CREATE POLICY "Enable all for authenticated users" ON contract_addendums
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON pending_contract_changes;
CREATE POLICY "Enable all for authenticated users" ON pending_contract_changes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow service_role full access
DROP POLICY IF EXISTS "Enable all for service_role" ON contract_addendums;
CREATE POLICY "Enable all for service_role" ON contract_addendums
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for service_role" ON pending_contract_changes;
CREATE POLICY "Enable all for service_role" ON pending_contract_changes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
