-- Migration: Add category column to contract_documents
-- Description: Adiciona coluna category para categorizar documentos
-- Date: 2025-10-02

-- Adicionar coluna category
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contract_documents_category ON contract_documents(category);

-- Atualizar category baseado em metadata se existir
UPDATE contract_documents
SET category = (metadata->>'category')::varchar
WHERE metadata IS NOT NULL
  AND metadata->>'category' IS NOT NULL
  AND (category IS NULL OR category = 'general');
