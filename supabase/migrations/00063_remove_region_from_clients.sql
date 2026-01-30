-- Migration: Remove region_id from clients table
-- Description: Move region association exclusively to maintenances table
-- Date: 2025-01-20

-- =============================================
-- REMOVE REGION_ID FROM CLIENTS
-- =============================================

-- Remove the index first
DROP INDEX IF EXISTS idx_clients_region_id;

-- Remove the foreign key constraint (if exists)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_region_id_fkey;

-- Remove the column
ALTER TABLE clients DROP COLUMN IF EXISTS region_id;

-- =============================================
-- LOG
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00063: region_id removed from clients table';
    RAISE NOTICE '📍 Region is now managed exclusively in maintenances table';
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE clients IS 'Client information - region is managed per maintenance, not per client';
