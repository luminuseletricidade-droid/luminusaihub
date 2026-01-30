-- Add role column to profiles table
-- This migration adds role-based access control to the system
-- Profiles table has 1:1 relationship with auth.users

-- Add role column with default 'user'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

-- Add check constraint to ensure only valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
          CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing profiles to have 'user' role by default
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Comment on the column
COMMENT ON COLUMN profiles.role IS 'User role: admin or user. Controls access to admin features.';
