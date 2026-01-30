-- Migration: Add contract_value column to contracts table
-- This column stores the total contract value (as distinct from monthly_value)

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_value DECIMAL(15, 2) DEFAULT 0;

-- Add comment explaining the difference between value, monthly_value, and contract_value
COMMENT ON COLUMN contracts.contract_value IS 'Total contract value (valor total do contrato)';
COMMENT ON COLUMN contracts.value IS 'Legacy value field - use contract_value for total value';
COMMENT ON COLUMN contracts.monthly_value IS 'Monthly payment value (valor mensal/mensalidade)';

-- Update contract_value from existing value field where contract_value is null or 0
UPDATE contracts
SET contract_value = COALESCE(value, 0)
WHERE contract_value IS NULL OR contract_value = 0;
