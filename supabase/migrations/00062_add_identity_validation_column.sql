-- Migration: Add identity_validation column to store AI validation results
-- This column stores the result of validating if a document belongs to the correct contract

-- Add identity_validation to contract_addendums
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_addendums' AND column_name = 'identity_validation'
    ) THEN
        ALTER TABLE contract_addendums
        ADD COLUMN identity_validation JSONB DEFAULT NULL;

        COMMENT ON COLUMN contract_addendums.identity_validation IS 'AI validation result checking if document belongs to the correct contract';
    END IF;
END $$;

-- Add identity_validation to contract_documents (for general documents)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'identity_validation'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN identity_validation JSONB DEFAULT NULL;

        COMMENT ON COLUMN contract_documents.identity_validation IS 'AI validation result checking if document belongs to the correct contract';
    END IF;
END $$;

-- Create index for querying by validation status
CREATE INDEX IF NOT EXISTS idx_contract_addendums_validation_status
ON contract_addendums ((identity_validation->>'validation_status'))
WHERE identity_validation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_documents_validation_status
ON contract_documents ((identity_validation->>'validation_status'))
WHERE identity_validation IS NOT NULL;
