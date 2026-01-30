-- Migration: Create regions table and add region_id to clients and maintenances
-- Date: 2025-12-12

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',  -- Hex color for visual identification (default: indigo)
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_regions_user_id ON regions(user_id);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- 3. Add region_id to clients table (optional field)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_region_id ON clients(region_id);

-- 4. Add region_id to maintenances table (optional field)
ALTER TABLE maintenances
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenances_region_id ON maintenances(region_id);

-- 5. Enable RLS on regions table
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for regions
DROP POLICY IF EXISTS "Users can view their own regions" ON regions;
CREATE POLICY "Users can view their own regions" ON regions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own regions" ON regions;
CREATE POLICY "Users can insert their own regions" ON regions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own regions" ON regions;
CREATE POLICY "Users can update their own regions" ON regions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own regions" ON regions;
CREATE POLICY "Users can delete their own regions" ON regions
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_regions_updated_at ON regions;
CREATE TRIGGER trigger_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_regions_updated_at();

-- 8. Add comment to tables
COMMENT ON TABLE regions IS 'Stores region/area definitions for organizing clients and maintenances';
COMMENT ON COLUMN regions.color IS 'Hex color code for visual identification in reports and badges';
COMMENT ON COLUMN clients.region_id IS 'Optional reference to region for client organization';
COMMENT ON COLUMN maintenances.region_id IS 'Optional reference to region, can be inherited from client';
