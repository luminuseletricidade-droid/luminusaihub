-- Migration: Add Missing Equipment Fields
-- Description: Adiciona campos de equipamento que faltam na tabela contracts
-- Date: 2025-10-09

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_serial VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_year VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_condition VARCHAR(100);

-- Índice para performance em busca por número de série
CREATE INDEX IF NOT EXISTS idx_contracts_equipment_serial ON contracts(equipment_serial);
