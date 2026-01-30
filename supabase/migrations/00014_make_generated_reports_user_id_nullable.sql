-- Make user_id nullable in generated_reports table
-- This allows reports to be generated even when user context is not available
ALTER TABLE generated_reports
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN generated_reports.user_id IS 'User who generated the report. Can be NULL for system-generated reports.';
