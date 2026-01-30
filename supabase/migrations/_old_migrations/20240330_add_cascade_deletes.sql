-- Add CASCADE delete to all contract relationships

-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE maintenances 
  DROP CONSTRAINT IF EXISTS maintenances_contract_id_fkey,
  ADD CONSTRAINT maintenances_contract_id_fkey 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;

ALTER TABLE contract_equipments 
  DROP CONSTRAINT IF EXISTS contract_equipments_contract_id_fkey,
  ADD CONSTRAINT contract_equipments_contract_id_fkey 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;

ALTER TABLE contract_services 
  DROP CONSTRAINT IF EXISTS contract_services_contract_id_fkey,
  ADD CONSTRAINT contract_services_contract_id_fkey 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_contract_id_fkey,
  ADD CONSTRAINT documents_contract_id_fkey 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;

ALTER TABLE chat_sessions 
  DROP CONSTRAINT IF EXISTS chat_sessions_contract_id_fkey,
  ADD CONSTRAINT chat_sessions_contract_id_fkey 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;

ALTER TABLE chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey,
  ADD CONSTRAINT chat_messages_session_id_fkey 
    FOREIGN KEY (session_id) 
    REFERENCES chat_sessions(id) 
    ON DELETE CASCADE;

-- Create function to clean up orphaned clients (clients without contracts)
CREATE OR REPLACE FUNCTION clean_orphaned_clients()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete client if they have no more contracts
  DELETE FROM clients 
  WHERE id = OLD.client_id 
    AND NOT EXISTS (
      SELECT 1 FROM contracts 
      WHERE client_id = OLD.client_id 
      AND id != OLD.id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean orphaned clients after contract deletion
DROP TRIGGER IF EXISTS clean_orphaned_clients_trigger ON contracts;
CREATE TRIGGER clean_orphaned_clients_trigger
  AFTER DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION clean_orphaned_clients();

-- Add deleted_at column to clients if not exists for soft delete
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on deleted_at
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);

-- Update RLS policies to exclude soft deleted clients
DROP POLICY IF EXISTS "Users can view their clients" ON clients;
CREATE POLICY "Users can view their non-deleted clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp - if set, client is considered deleted';