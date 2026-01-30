-- Migration: Add end_time column to maintenances
-- Description: Adiciona coluna end_time para horário final da manutenção
-- Date: 2025-10-02

ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS end_time TIME;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_maintenances_end_time ON maintenances(end_time);
