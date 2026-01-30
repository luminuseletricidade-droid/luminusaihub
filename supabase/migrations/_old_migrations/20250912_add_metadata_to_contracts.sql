-- Add metadata column to contracts table if it doesn't exist
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment to document the field
COMMENT ON COLUMN contracts.metadata IS 'Stores additional metadata like selected agents, report generation status, etc.';

-- Create index for better performance on metadata queries
CREATE INDEX IF NOT EXISTS idx_contracts_metadata ON contracts USING GIN (metadata);