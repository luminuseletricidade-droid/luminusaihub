-- Migration: Add name column to contract_documents
-- Description: Adiciona coluna name para compatibilidade
-- Date: 2025-10-02

-- Adicionar coluna name (alias para document_name)
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Sincronizar dados entre name e document_name
UPDATE contract_documents
SET name = document_name
WHERE name IS NULL AND document_name IS NOT NULL;

UPDATE contract_documents
SET document_name = name
WHERE document_name IS NULL AND name IS NOT NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contract_documents_name ON contract_documents(name);
