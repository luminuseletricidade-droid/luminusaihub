-- ================================================
-- ADD EXTRACTED CONTRACT FIELDS
-- ================================================
-- This migration adds all fields that are extracted from PDF contracts
-- but may be missing from the contracts table

-- Add client information fields
DO $$
BEGIN
    -- client_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_name') THEN
        ALTER TABLE contracts ADD COLUMN client_name TEXT;
        RAISE NOTICE '✅ Added client_name column to contracts';
    END IF;

    -- client_legal_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_legal_name') THEN
        ALTER TABLE contracts ADD COLUMN client_legal_name TEXT;
        RAISE NOTICE '✅ Added client_legal_name column to contracts';
    END IF;

    -- client_cnpj
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_cnpj') THEN
        ALTER TABLE contracts ADD COLUMN client_cnpj TEXT;
        RAISE NOTICE '✅ Added client_cnpj column to contracts';
    END IF;

    -- client_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_email') THEN
        ALTER TABLE contracts ADD COLUMN client_email TEXT;
        RAISE NOTICE '✅ Added client_email column to contracts';
    END IF;

    -- client_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_phone') THEN
        ALTER TABLE contracts ADD COLUMN client_phone TEXT;
        RAISE NOTICE '✅ Added client_phone column to contracts';
    END IF;

    -- client_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_address') THEN
        ALTER TABLE contracts ADD COLUMN client_address TEXT;
        RAISE NOTICE '✅ Added client_address column to contracts';
    END IF;

    -- client_city
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_city') THEN
        ALTER TABLE contracts ADD COLUMN client_city TEXT;
        RAISE NOTICE '✅ Added client_city column to contracts';
    END IF;

    -- client_state
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_state') THEN
        ALTER TABLE contracts ADD COLUMN client_state TEXT;
        RAISE NOTICE '✅ Added client_state column to contracts';
    END IF;

    -- client_zip_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_zip_code') THEN
        ALTER TABLE contracts ADD COLUMN client_zip_code TEXT;
        RAISE NOTICE '✅ Added client_zip_code column to contracts';
    END IF;

    -- client_contact_person
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'client_contact_person') THEN
        ALTER TABLE contracts ADD COLUMN client_contact_person TEXT;
        RAISE NOTICE '✅ Added client_contact_person column to contracts';
    END IF;
END $$;

-- Add contract detail fields
DO $$
BEGIN
    -- proposal_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'proposal_number') THEN
        ALTER TABLE contracts ADD COLUMN proposal_number TEXT;
        RAISE NOTICE '✅ Added proposal_number column to contracts';
    END IF;

    -- contract_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'contract_date') THEN
        ALTER TABLE contracts ADD COLUMN contract_date DATE;
        RAISE NOTICE '✅ Added contract_date column to contracts';
    END IF;

    -- proposal_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'proposal_date') THEN
        ALTER TABLE contracts ADD COLUMN proposal_date DATE;
        RAISE NOTICE '✅ Added proposal_date column to contracts';
    END IF;

    -- duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'duration') THEN
        ALTER TABLE contracts ADD COLUMN duration TEXT;
        RAISE NOTICE '✅ Added duration column to contracts';
    END IF;

    -- duration_months
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'duration_months') THEN
        ALTER TABLE contracts ADD COLUMN duration_months INTEGER;
        RAISE NOTICE '✅ Added duration_months column to contracts';
    END IF;

    -- monthly_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'monthly_value') THEN
        ALTER TABLE contracts ADD COLUMN monthly_value DECIMAL(10, 2);
        RAISE NOTICE '✅ Added monthly_value column to contracts';
    END IF;
END $$;

-- Add equipment fields
DO $$
BEGIN
    -- equipment_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_type') THEN
        ALTER TABLE contracts ADD COLUMN equipment_type TEXT;
        RAISE NOTICE '✅ Added equipment_type column to contracts';
    END IF;

    -- equipment_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_model') THEN
        ALTER TABLE contracts ADD COLUMN equipment_model TEXT;
        RAISE NOTICE '✅ Added equipment_model column to contracts';
    END IF;

    -- equipment_brand
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_brand') THEN
        ALTER TABLE contracts ADD COLUMN equipment_brand TEXT;
        RAISE NOTICE '✅ Added equipment_brand column to contracts';
    END IF;

    -- equipment_power
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_power') THEN
        ALTER TABLE contracts ADD COLUMN equipment_power TEXT;
        RAISE NOTICE '✅ Added equipment_power column to contracts';
    END IF;

    -- equipment_voltage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_voltage') THEN
        ALTER TABLE contracts ADD COLUMN equipment_voltage TEXT;
        RAISE NOTICE '✅ Added equipment_voltage column to contracts';
    END IF;

    -- equipment_quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'equipment_quantity') THEN
        ALTER TABLE contracts ADD COLUMN equipment_quantity INTEGER;
        RAISE NOTICE '✅ Added equipment_quantity column to contracts';
    END IF;
END $$;

-- Add additional fields
DO $$
BEGIN
    -- services (as JSONB for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'services') THEN
        ALTER TABLE contracts ADD COLUMN services JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added services column to contracts';
    END IF;

    -- observations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'observations') THEN
        ALTER TABLE contracts ADD COLUMN observations TEXT;
        RAISE NOTICE '✅ Added observations column to contracts';
    END IF;

    -- payment_due_day
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'payment_due_day') THEN
        ALTER TABLE contracts ADD COLUMN payment_due_day INTEGER;
        RAISE NOTICE '✅ Added payment_due_day column to contracts';
    END IF;

    -- supplier_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'supplier_name') THEN
        ALTER TABLE contracts ADD COLUMN supplier_name TEXT;
        RAISE NOTICE '✅ Added supplier_name column to contracts';
    END IF;

    -- supplier_cnpj
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'supplier_cnpj') THEN
        ALTER TABLE contracts ADD COLUMN supplier_cnpj TEXT;
        RAISE NOTICE '✅ Added supplier_cnpj column to contracts';
    END IF;

    -- is_renewal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'is_renewal') THEN
        ALTER TABLE contracts ADD COLUMN is_renewal BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_renewal column to contracts';
    END IF;

    -- automatic_renewal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'automatic_renewal') THEN
        ALTER TABLE contracts ADD COLUMN automatic_renewal BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added automatic_renewal column to contracts';
    END IF;

    -- reajustment_index
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'reajustment_index') THEN
        ALTER TABLE contracts ADD COLUMN reajustment_index TEXT;
        RAISE NOTICE '✅ Added reajustment_index column to contracts';
    END IF;

    -- fines_late_payment_percentage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'fines_late_payment_percentage') THEN
        ALTER TABLE contracts ADD COLUMN fines_late_payment_percentage DECIMAL(5, 2);
        RAISE NOTICE '✅ Added fines_late_payment_percentage column to contracts';
    END IF;

    -- cancellation_fine_percentage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'cancellation_fine_percentage') THEN
        ALTER TABLE contracts ADD COLUMN cancellation_fine_percentage DECIMAL(5, 2);
        RAISE NOTICE '✅ Added cancellation_fine_percentage column to contracts';
    END IF;

    -- metadata (already exists in some migrations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'metadata') THEN
        ALTER TABLE contracts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added metadata column to contracts';
    END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
    -- Index on client_cnpj for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'contracts' AND indexname = 'idx_contracts_client_cnpj') THEN
        CREATE INDEX idx_contracts_client_cnpj ON contracts(client_cnpj);
        RAISE NOTICE '✅ Created index on client_cnpj';
    END IF;

    -- Index on client_name for search
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'contracts' AND indexname = 'idx_contracts_client_name') THEN
        CREATE INDEX idx_contracts_client_name ON contracts(client_name);
        RAISE NOTICE '✅ Created index on client_name';
    END IF;
END $$;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONTRACT FIELDS MIGRATION COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All extracted PDF fields have been added to contracts table.';
    RAISE NOTICE '========================================';
END $$;