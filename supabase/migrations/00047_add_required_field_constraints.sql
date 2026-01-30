-- Add NOT NULL constraints to required fields in contracts table
ALTER TABLE contracts
  ALTER COLUMN contract_number SET NOT NULL,
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add NOT NULL constraints to required fields in maintenances table
ALTER TABLE maintenances
  ALTER COLUMN contract_id SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN scheduled_date SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add NOT NULL constraints to required fields in maintenance_checklist
ALTER TABLE maintenance_checklist
  ALTER COLUMN maintenance_id SET NOT NULL;

-- Create function to validate contract before insertion/update
CREATE OR REPLACE FUNCTION validate_contract_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    RAISE EXCEPTION 'contract_number é obrigatório';
  END IF;

  IF NEW.client_name IS NULL OR NEW.client_name = '' THEN
    RAISE EXCEPTION 'client_name é obrigatório';
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    RAISE EXCEPTION 'status é obrigatório';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract validation
DROP TRIGGER IF EXISTS check_contract_required_fields ON contracts;
CREATE TRIGGER check_contract_required_fields
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION validate_contract_required_fields();

-- Create function to validate maintenance before insertion/update
CREATE OR REPLACE FUNCTION validate_maintenance_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_id IS NULL THEN
    RAISE EXCEPTION 'contract_id é obrigatório';
  END IF;

  IF NEW.type IS NULL OR NEW.type = '' THEN
    RAISE EXCEPTION 'type (tipo de manutenção) é obrigatório';
  END IF;

  IF NEW.scheduled_date IS NULL THEN
    RAISE EXCEPTION 'scheduled_date é obrigatório';
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    RAISE EXCEPTION 'status é obrigatório';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintenance validation
DROP TRIGGER IF EXISTS check_maintenance_required_fields ON maintenances;
CREATE TRIGGER check_maintenance_required_fields
  BEFORE INSERT OR UPDATE ON maintenances
  FOR EACH ROW
  EXECUTE FUNCTION validate_maintenance_required_fields();
