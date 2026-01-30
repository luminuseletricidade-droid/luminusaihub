-- Add ALL missing fields to contracts table
-- This migration adds all fields that are used in ContractDataEdit.tsx but missing in the schema
-- Created: 2025-10-03

-- Client snapshot fields (for historical record)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_legal_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_city VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_state VARCHAR(2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_zip_code VARCHAR(10);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contact_person VARCHAR(255);

-- Contract type and additional fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100);

-- Additional equipment fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_power VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_voltage VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_year TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_condition TEXT;

-- Maintenance and service fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS maintenance_frequency VARCHAR(50);

-- Additional contract terms and conditions
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS technical_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_conditions TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Add comments for documentation
COMMENT ON COLUMN contracts.client_name IS 'Client name snapshot at time of contract';
COMMENT ON COLUMN contracts.client_legal_name IS 'Client legal/company name snapshot';
COMMENT ON COLUMN contracts.client_cnpj IS 'Client CNPJ snapshot';
COMMENT ON COLUMN contracts.client_email IS 'Client email snapshot';
COMMENT ON COLUMN contracts.client_phone IS 'Client phone snapshot';
COMMENT ON COLUMN contracts.client_address IS 'Client address snapshot';
COMMENT ON COLUMN contracts.client_city IS 'Client city snapshot';
COMMENT ON COLUMN contracts.client_state IS 'Client state snapshot';
COMMENT ON COLUMN contracts.client_zip_code IS 'Client ZIP code snapshot';
COMMENT ON COLUMN contracts.client_contact_person IS 'Client contact person snapshot';
COMMENT ON COLUMN contracts.contract_type IS 'Type of contract (maintenance, rental, purchase, etc)';
COMMENT ON COLUMN contracts.equipment_power IS 'Equipment power rating (e.g., 150 kVA, 120 kW)';
COMMENT ON COLUMN contracts.equipment_voltage IS 'Equipment voltage (e.g., 220V, 380V, 440V)';
COMMENT ON COLUMN contracts.equipment_year IS 'Year of equipment manufacture';
COMMENT ON COLUMN contracts.equipment_condition IS 'Equipment condition (new, used, refurbished, etc)';
COMMENT ON COLUMN contracts.maintenance_frequency IS 'Frequency of maintenance (monthly, quarterly, etc)';
COMMENT ON COLUMN contracts.technical_notes IS 'Technical notes and specifications';
COMMENT ON COLUMN contracts.special_conditions IS 'Special contract conditions and clauses';
COMMENT ON COLUMN contracts.warranty_terms IS 'Warranty terms and conditions';
