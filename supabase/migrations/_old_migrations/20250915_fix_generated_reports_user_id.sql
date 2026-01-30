-- Fix generated_reports table to use user_id instead of generated_by
-- This migration ensures the table has the correct column names

-- Add user_id column if it doesn't exist
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- If there's a generated_by column, migrate data and drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'generated_reports' 
               AND column_name = 'generated_by') THEN
        
        -- Copy data from generated_by to user_id if user_id is null
        UPDATE generated_reports 
        SET user_id = generated_by::UUID 
        WHERE user_id IS NULL AND generated_by IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE generated_reports DROP COLUMN generated_by;
    END IF;
END $$;

-- Create index for user_id if not exists
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id 
ON generated_reports(user_id);

-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can view their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON generated_reports;

-- Recreate RLS policies with user_id
CREATE POLICY "Users can view their own reports" ON generated_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" ON generated_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON generated_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON generated_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Make sure RLS is enabled
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;