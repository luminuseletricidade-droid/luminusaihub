-- ================================================
-- ADD MISSING COLUMNS TO TABLES
-- ================================================
-- This migration adds missing columns that are being used by the application

-- ================================================
-- 1. Add content_extracted to contract_documents
-- ================================================
DO $$
BEGIN
    -- Check if column exists, if not, add it
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'content_extracted'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN content_extracted TEXT;

        RAISE NOTICE '✅ Added content_extracted column to contract_documents';
    ELSE
        RAISE NOTICE '⚠️ Column content_extracted already exists in contract_documents';
    END IF;
END $$;

-- ================================================
-- 2. Add other potentially missing columns
-- ================================================
DO $$
BEGIN
    -- Add content column if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'content'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN content TEXT;

        RAISE NOTICE '✅ Added content column to contract_documents';
    ELSE
        RAISE NOTICE '⚠️ Column content already exists in contract_documents';
    END IF;

    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE '✅ Added metadata column to contract_documents';
    ELSE
        RAISE NOTICE '⚠️ Column metadata already exists in contract_documents';
    END IF;

    -- Add processing_status column if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'processing_status'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN processing_status TEXT DEFAULT 'pending';

        RAISE NOTICE '✅ Added processing_status column to contract_documents';
    ELSE
        RAISE NOTICE '⚠️ Column processing_status already exists in contract_documents';
    END IF;
END $$;

-- ================================================
-- 3. Check if generated_reports table exists and has proper columns
-- ================================================
DO $$
BEGIN
    -- Check if generated_reports table exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'generated_reports'
    ) THEN
        -- Create the table if it doesn't exist
        CREATE TABLE generated_reports (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
            agent_type TEXT NOT NULL,
            title TEXT,
            content TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create index for faster queries
        CREATE INDEX idx_generated_reports_contract_id ON generated_reports(contract_id);
        CREATE INDEX idx_generated_reports_agent_type ON generated_reports(agent_type);

        RAISE NOTICE '✅ Created generated_reports table';
    ELSE
        RAISE NOTICE '⚠️ Table generated_reports already exists';

        -- Check for missing columns in existing table
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'generated_reports'
            AND column_name = 'agent_type'
        ) THEN
            ALTER TABLE generated_reports
            ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'unknown';

            RAISE NOTICE '✅ Added agent_type column to generated_reports';
        END IF;
    END IF;
END $$;

-- ================================================
-- 4. Show current structure of contract_documents
-- ================================================
SELECT
    '========================================' as separator;

SELECT
    'CONTRACT_DOCUMENTS TABLE STRUCTURE' as title;

SELECT
    '========================================' as separator;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contract_documents'
ORDER BY ordinal_position;

-- ================================================
-- 5. Show current structure of generated_reports (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'generated_reports'
    ) THEN
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'GENERATED_REPORTS TABLE STRUCTURE';
        RAISE NOTICE '========================================';
    END IF;
END $$;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'generated_reports'
ORDER BY ordinal_position;

-- ================================================
-- FINAL MESSAGE
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MISSING COLUMNS MIGRATION COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All necessary columns have been added.';
    RAISE NOTICE 'The application should now work properly.';
    RAISE NOTICE '========================================';
END $$;