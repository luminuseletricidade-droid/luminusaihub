-- MANUAL SCRIPT TO FIX CNPJ DUPLICATES
-- Execute this in Supabase SQL editor to resolve duplicate CNPJ issue

-- Step 1: Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION clean_cnpj(cnpj_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(COALESCE(cnpj_text, ''), '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Check for duplicates (for information only)
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
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 3: For each duplicate, keep the most recent and remove others
-- This is the problematic CNPJ: 00346076000173 for user 46bf24ba-6716-44e0-93de-7fed0e601d7b

-- Find specific duplicate clients for this CNPJ
SELECT 
    id,
    name,
    cnpj,
    created_at,
    user_id
FROM clients 
WHERE user_id = '46bf24ba-6716-44e0-93de-7fed0e601d7b'
AND clean_cnpj(cnpj) = '00346076000173'
ORDER BY created_at DESC;

-- Manual fix: Keep the most recent client, remove others
-- (Replace with actual IDs from the query above)
-- UPDATE contracts SET client_id = 'KEEP_THIS_CLIENT_ID' WHERE client_id IN ('DELETE_THESE_CLIENT_IDS');
-- UPDATE client_documents SET client_id = 'KEEP_THIS_CLIENT_ID' WHERE client_id IN ('DELETE_THESE_CLIENT_IDS');
-- DELETE FROM clients WHERE id IN ('DELETE_THESE_CLIENT_IDS');

-- Step 4: After resolving duplicates, create the unique index
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_cnpj_per_user 
-- ON clients (user_id, clean_cnpj(cnpj)) 
-- WHERE cnpj IS NOT NULL 
--   AND cnpj != '' 
--   AND LENGTH(clean_cnpj(cnpj)) = 14
--   AND user_id IS NOT NULL;