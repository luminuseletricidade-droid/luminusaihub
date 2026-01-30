-- Add content field to contract_documents table for storing generated HTML content
ALTER TABLE public.contract_documents 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN public.contract_documents.content IS 'HTML content of generated documents';
COMMENT ON COLUMN public.contract_documents.file_name IS 'Original filename for download';

-- Update existing records without file_name to use name field
UPDATE public.contract_documents 
SET file_name = name || '.html' 
WHERE file_name IS NULL AND category IN ('manutencao', 'documentacao', 'cronogramas', 'relatorios');