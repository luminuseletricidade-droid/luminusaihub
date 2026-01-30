-- Migration: Add power and voltage columns to equipment table
-- Description: Adiciona colunas power e voltage na tabela equipment para armazenar potência e tensão
-- Date: 2025-10-10
-- Relates to: Fix for equipment fields (Potência e Tensão) not being saved properly

-- Add power column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power VARCHAR(100);

-- Add voltage column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS voltage VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN equipment.power IS 'Equipment power specification (e.g., 450kVA)';
COMMENT ON COLUMN equipment.voltage IS 'Equipment voltage specification (e.g., 220V, 380V)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_power ON equipment(power);
CREATE INDEX IF NOT EXISTS idx_equipment_voltage ON equipment(voltage);
