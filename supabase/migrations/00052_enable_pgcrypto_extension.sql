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
END $$;

-- Test that the functions are available
DO $$
DECLARE
    test_hash text;
BEGIN
    -- Test gen_salt function
    test_hash := gen_salt('bf');

    -- Test crypt function
    test_hash := crypt('test', gen_salt('bf'));

    RAISE NOTICE 'pgcrypto extension installed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'pgcrypto functions not working properly: %', SQLERRM;
END $$;