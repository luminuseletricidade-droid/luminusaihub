-- Migration: Add Contract Type Column
-- Description: Adiciona coluna contract_type na tabela contracts
-- Date: 2025-10-02

-- Adicionar coluna contract_type se não existir
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Manutenção';

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
