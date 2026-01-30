-- Migration: Add year and condition columns to equipment table
-- Description: Adiciona colunas year e condition na tabela equipment para armazenar informações de equipamentos
-- Date: 2025-10-10
-- Relates to: Fix for equipment fields not being saved properly

-- Add year column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS year VARCHAR(50);

-- Add condition column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS condition VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN equipment.year IS 'Year of equipment manufacture';
COMMENT ON COLUMN equipment.condition IS 'Equipment condition (new, used, refurbished, etc)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_year ON equipment(year);
CREATE INDEX IF NOT EXISTS idx_equipment_condition ON equipment(condition);
