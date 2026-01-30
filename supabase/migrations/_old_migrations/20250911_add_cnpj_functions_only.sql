-- Add CNPJ helper functions without creating unique index yet
-- This migration only creates the helper functions needed for CNPJ validation

-- Create a function to clean CNPJ (remove non-numeric characters)
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

-- Add check constraint for CNPJ format validation (if not exists)
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

-- Create a view to help identify duplicate CNPJs
CREATE OR REPLACE VIEW duplicate_cnpj_clients AS
SELECT 
    user_id,
    clean_cnpj(cnpj) as cleaned_cnpj,
    string_agg(name, ', ') as client_names,
    array_agg(id ORDER BY created_at DESC) as client_ids,
    COUNT(*) as duplicate_count
FROM clients 
WHERE cnpj IS NOT NULL 
AND cnpj != '' 
AND LENGTH(clean_cnpj(cnpj)) = 14
AND user_id IS NOT NULL
GROUP BY user_id, clean_cnpj(cnpj)
HAVING COUNT(*) > 1;

COMMENT ON VIEW duplicate_cnpj_clients IS 'View to identify clients with duplicate CNPJs per user';

-- Note: The unique index will be created in a separate migration after duplicates are resolved