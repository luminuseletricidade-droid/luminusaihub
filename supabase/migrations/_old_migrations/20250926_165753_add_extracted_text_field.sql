-- Add extracted_text field to contracts table to store full OCR text
-- This will help with future searches and data recovery

-- Add the new column to store the full extracted text from PDFs
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Add comment to explain the field purpose
COMMENT ON COLUMN contracts.extracted_text IS 'Full text extracted from the PDF document by OCR/text extraction process';

-- Create an index for full-text search capabilities
CREATE INDEX IF NOT EXISTS idx_contracts_extracted_text_search
ON contracts
USING gin(to_tsvector('portuguese', extracted_text));

-- Add extraction metadata column for tracking extraction details
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}';

-- Add comment for extraction metadata
COMMENT ON COLUMN contracts.extraction_metadata IS 'Metadata about the extraction process (method, date, completeness score, etc)';

-- Create index on extraction metadata for querying
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_metadata
ON contracts
USING gin(extraction_metadata);

-- Update existing contracts to have empty extracted_text if null
UPDATE contracts
SET extracted_text = ''
WHERE extracted_text IS NULL;

-- Update existing contracts to have empty extraction_metadata if null
UPDATE contracts
SET extraction_metadata = '{}'
WHERE extraction_metadata IS NULL;