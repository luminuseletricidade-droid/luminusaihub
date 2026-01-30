-- Add missing columns to generated_reports table
-- These columns are used by the Reports page to store additional report information

-- Add data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'data'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added data column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column data already exists in generated_reports';
    END IF;
END $$;

-- Add charts column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'charts'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN charts JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added charts column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column charts already exists in generated_reports';
    END IF;
END $$;

-- Add period_start column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'period_start'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN period_start DATE;
        RAISE NOTICE '✅ Added period_start column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column period_start already exists in generated_reports';
    END IF;
END $$;

-- Add period_end column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'period_end'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN period_end DATE;
        RAISE NOTICE '✅ Added period_end column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column period_end already exists in generated_reports';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_reports_data ON generated_reports USING gin(data);
CREATE INDEX IF NOT EXISTS idx_generated_reports_charts ON generated_reports USING gin(charts);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period_start ON generated_reports(period_start);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period_end ON generated_reports(period_end);
