-- Migration: Fix Contract Services Schema
-- Description: Adiciona colunas faltantes na tabela contract_services
-- Date: 2025-10-02

-- Adicionar coluna service_name se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- Adicionar coluna description se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar coluna frequency se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS frequency VARCHAR(100);

-- Adicionar coluna duration se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Atualizar service_name para contratos existentes que não têm
UPDATE contract_services
SET service_name = 'Serviço não especificado'
WHERE service_name IS NULL OR service_name = '';

-- Criar índice para service_name
CREATE INDEX IF NOT EXISTS idx_contract_services_service_name ON contract_services(service_name);

-- Comentários
COMMENT ON COLUMN contract_services.service_name IS 'Nome do serviço incluído no contrato';
COMMENT ON COLUMN contract_services.description IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN contract_services.frequency IS 'Frequência de execução do serviço (mensal, trimestral, etc)';
COMMENT ON COLUMN contract_services.duration IS 'Duração estimada do serviço em minutos';
