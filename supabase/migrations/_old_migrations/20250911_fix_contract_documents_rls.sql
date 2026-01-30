-- Fix RLS policies for contract_documents to allow users to access documents from their own contracts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can insert contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can update their contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can delete their contract documents" ON contract_documents;

-- Create improved RLS policies that check contract ownership
CREATE POLICY "Users can view documents from their contracts" ON contract_documents
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_documents.contract_id 
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents to their contracts" ON contract_documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_documents.contract_id 
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents from their contracts" ON contract_documents
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_documents.contract_id 
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents from their contracts" ON contract_documents
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_documents.contract_id 
      AND contracts.user_id = auth.uid()
    )
  );

-- Add comment explaining the RLS policies
COMMENT ON TABLE contract_documents IS 'Stores additional documents attached to contracts. RLS policies ensure users can only access documents from their own contracts.';