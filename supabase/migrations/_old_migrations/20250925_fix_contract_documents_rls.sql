-- Fix RLS policies for contract_documents table
-- Allow authenticated users to insert, update and delete their own documents

-- First, ensure RLS is enabled
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can insert contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can update contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can delete contract documents" ON contract_documents;

-- Create new policies
-- View policy: Users can view documents from contracts they own
CREATE POLICY "Users can view contract documents"
ON contract_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = contract_documents.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Insert policy: Users can insert documents for contracts they own
CREATE POLICY "Users can insert contract documents"
ON contract_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = contract_documents.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Update policy: Users can update documents from contracts they own
CREATE POLICY "Users can update contract documents"
ON contract_documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = contract_documents.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Delete policy: Users can delete documents from contracts they own
CREATE POLICY "Users can delete contract documents"
ON contract_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = contract_documents.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Also fix the ai_contract_documents table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_contract_documents') THEN
        ALTER TABLE ai_contract_documents ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can insert ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can update ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can delete ai contract documents" ON ai_contract_documents;

        -- Create new policies
        CREATE POLICY "Users can view ai contract documents"
        ON ai_contract_documents FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can insert ai contract documents"
        ON ai_contract_documents FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update ai contract documents"
        ON ai_contract_documents FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete ai contract documents"
        ON ai_contract_documents FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );
    END IF;
END $$;