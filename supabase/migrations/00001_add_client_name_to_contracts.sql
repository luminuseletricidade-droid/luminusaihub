-- Migration: Add Client Name To Contracts
-- Description: Adiciona coluna client_name na tabela contracts para facilitar queries
-- Date: 2025-10-02

-- Adicionar coluna client_name se não existir
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Criar índice para busca por nome do cliente
CREATE INDEX IF NOT EXISTS idx_contracts_client_name ON contracts(client_name);

-- Documentação
COMMENT ON COLUMN contracts.client_name IS 'Nome do cliente (denormalizado para performance)';
