-- Migration: Add Contract Document Fields
-- Description: Adiciona campos de processamento em contract_documents
-- Date: 2025-10-02

-- Adicionar campos de processamento
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS content_extracted TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Índice para buscar documentos por status
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status ON contract_documents(processing_status);

-- Comentários
COMMENT ON COLUMN contract_documents.content_extracted IS 'Conteúdo extraído e processado do documento';
COMMENT ON COLUMN contract_documents.processing_status IS 'Status: pending, processing, completed, error';
