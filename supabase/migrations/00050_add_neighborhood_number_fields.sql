-- Migration: Add neighborhood and number fields to address
-- Description: Adiciona campos de bairro e número separados para endereços
-- Date: 2025-01-27
-- Purpose: Separar endereço em campos mais específicos (bairro, número)

-- ==============================================
-- CLIENTS TABLE - Add neighborhood and number fields
-- ==============================================

-- Adicionar campo de bairro
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

-- Adicionar campo de número
ALTER TABLE clients ADD COLUMN IF NOT EXISTS number VARCHAR(20);

-- ==============================================
-- CONTRACTS TABLE - Add neighborhood and number fields
-- ==============================================

-- Adicionar campo de bairro do cliente
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_neighborhood VARCHAR(100);

-- Adicionar campo de número do cliente
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_number VARCHAR(20);

-- ==============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON COLUMN clients.neighborhood IS 'Bairro do cliente';
COMMENT ON COLUMN clients.number IS 'Número do endereço do cliente';

COMMENT ON COLUMN contracts.client_neighborhood IS 'Bairro do cliente (snapshot no momento do contrato)';
COMMENT ON COLUMN contracts.client_number IS 'Número do endereço do cliente (snapshot no momento do contrato)';

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_clients_neighborhood ON clients(neighborhood);
CREATE INDEX IF NOT EXISTS idx_contracts_client_neighborhood ON contracts(client_neighborhood);
