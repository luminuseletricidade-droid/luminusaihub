-- Fix CNPJ duplicates before creating unique index

-- First, create the clean_cnpj function if it doesn't exist
CREATE OR REPLACE FUNCTION clean_cnpj(cnpj_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-numeric characters and return only digits
  RETURN REGEXP_REPLACE(COALESCE(cnpj_text, ''), '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a validation function to check CNPJ format
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if CNPJ has exactly 14 digits after cleaning
  RETURN LENGTH(clean_cnpj(cnpj_text)) = 14;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 1: Identify and handle duplicate CNPJs
-- We'll keep the most recently created client for each duplicate CNPJ per user
DO $$
DECLARE
    duplicate_record RECORD;
    clients_to_delete UUID[];
BEGIN
    -- Find duplicate CNPJs for the same user
    FOR duplicate_record IN
        SELECT 
            user_id,
            clean_cnpj(cnpj) as clean_cnpj_value,
            array_agg(id ORDER BY created_at DESC) as client_ids,
            COUNT(*) as duplicate_count
        FROM clients 
        WHERE cnpj IS NOT NULL 
        AND cnpj != '' 
        AND LENGTH(clean_cnpj(cnpj)) = 14
        AND user_id IS NOT NULL
        GROUP BY user_id, clean_cnpj(cnpj)
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (most recent) client, mark others for deletion
        clients_to_delete := duplicate_record.client_ids[2:array_length(duplicate_record.client_ids, 1)];
        
        RAISE NOTICE 'Found % duplicates for user % with CNPJ %. Keeping client %, removing %', 
            duplicate_record.duplicate_count,
            duplicate_record.user_id,
            duplicate_record.clean_cnpj_value,
            duplicate_record.client_ids[1],
            clients_to_delete;
        
        -- Before deleting clients, we need to handle foreign key relationships
        -- Update contracts to point to the kept client
        UPDATE contracts 
        SET client_id = duplicate_record.client_ids[1]
        WHERE client_id = ANY(clients_to_delete);
        
        -- Update client_documents to point to the kept client  
        UPDATE client_documents 
        SET client_id = duplicate_record.client_ids[1]
        WHERE client_id = ANY(clients_to_delete);
        
        -- Now we can safely delete the duplicate clients
        DELETE FROM clients 
        WHERE id = ANY(clients_to_delete);
        
        RAISE NOTICE 'Removed % duplicate clients', array_length(clients_to_delete, 1);
    END LOOP;
END $$;

-- Step 2: Now create the unique index since duplicates are resolved
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_cnpj_per_user 
ON clients (user_id, clean_cnpj(cnpj)) 
WHERE cnpj IS NOT NULL 
  AND cnpj != '' 
  AND LENGTH(clean_cnpj(cnpj)) = 14
  AND user_id IS NOT NULL;

-- Add constraint comment
COMMENT ON INDEX idx_clients_unique_cnpj_per_user IS 'Ensures unique CNPJ per user, excluding NULL/empty values and invalid CNPJs';

-- Step 3: Add check constraint for CNPJ format validation
DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cnpj_format') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT chk_cnpj_format 
        CHECK (cnpj IS NULL OR cnpj = '' OR validate_cnpj(cnpj));
    END IF;
END $$;

-- Add comment on constraint
COMMENT ON CONSTRAINT chk_cnpj_format ON clients IS 'Validates that CNPJ has exactly 14 digits when provided';