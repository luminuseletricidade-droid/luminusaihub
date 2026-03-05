-- Enable pgcrypto extension for password hashing functions
-- This is required for crypt() and gen_salt() functions

-- Create the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify that the extension is installed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'pgcrypto extension failed to install';
    END IF;

    RAISE NOTICE 'pgcrypto extension verified successfully';
END $$;
