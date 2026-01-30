-- Fix CASCADE DELETE for maintenances when deleting contracts
-- This ensures all maintenances are deleted when a contract is deleted

-- First, drop the existing constraint if exists
ALTER TABLE maintenances 
  DROP CONSTRAINT IF EXISTS maintenances_contract_id_fkey;

-- Recreate with CASCADE DELETE
ALTER TABLE maintenances 
  ADD CONSTRAINT maintenances_contract_id_fkey 
  FOREIGN KEY (contract_id) 
  REFERENCES contracts(id) 
  ON DELETE CASCADE;

-- Only update tables that exist, using DO blocks for conditional execution
DO $$ 
BEGIN
  -- Check and update equipment table if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment') THEN
    ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_contract_id_fkey;
    ALTER TABLE equipment ADD CONSTRAINT equipment_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and update contract_services if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_services') THEN
    ALTER TABLE contract_services DROP CONSTRAINT IF EXISTS contract_services_contract_id_fkey;
    ALTER TABLE contract_services ADD CONSTRAINT contract_services_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and update ai_generated_plans if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_generated_plans') THEN
    ALTER TABLE ai_generated_plans DROP CONSTRAINT IF EXISTS ai_generated_plans_contract_id_fkey;
    ALTER TABLE ai_generated_plans ADD CONSTRAINT ai_generated_plans_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and update contract_documents if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_documents') THEN
    ALTER TABLE contract_documents DROP CONSTRAINT IF EXISTS contract_documents_contract_id_fkey;
    ALTER TABLE contract_documents ADD CONSTRAINT contract_documents_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and update contract_analyses if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_analyses') THEN
    ALTER TABLE contract_analyses DROP CONSTRAINT IF EXISTS contract_analyses_contract_id_fkey;
    ALTER TABLE contract_analyses ADD CONSTRAINT contract_analyses_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create or replace function to delete all related maintenances when deleting a client
CREATE OR REPLACE FUNCTION delete_client_maintenances()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all maintenances from all contracts of this client
  DELETE FROM maintenances 
  WHERE contract_id IN (
    SELECT id FROM contracts WHERE client_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to delete maintenances before deleting client
DROP TRIGGER IF EXISTS delete_client_maintenances_trigger ON clients;
CREATE TRIGGER delete_client_maintenances_trigger
  BEFORE DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION delete_client_maintenances();

-- Also ensure contracts cascade delete when client is deleted
ALTER TABLE contracts 
  DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;

ALTER TABLE contracts 
  ADD CONSTRAINT contracts_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Create index for better performance on cascade deletes
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);

-- Create indexes only for tables that exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment') THEN
    CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON equipment(contract_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_services') THEN
    CREATE INDEX IF NOT EXISTS idx_contract_services_contract_id ON contract_services(contract_id);
  END IF;
END $$;

COMMENT ON TRIGGER delete_client_maintenances_trigger ON clients IS 'Ensures all maintenances are deleted when a client is deleted';