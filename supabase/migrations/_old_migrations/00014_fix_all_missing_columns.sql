-- Migration: Fix All Missing Columns
-- Description: Adiciona todas as colunas faltantes nas tabelas principais
-- Date: 2025-10-02

-- ==============================================
-- CONTRACT_DOCUMENTS TABLE
-- ==============================================
-- Adicionar colunas que o código espera mas podem não existir
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS content_extracted TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS uploaded_by UUID;

-- Atualizar document_name baseado em file_name se estiver vazio
UPDATE contract_documents
SET document_name = file_name
WHERE document_name IS NULL AND file_name IS NOT NULL;

-- ==============================================
-- EQUIPMENT TABLE
-- ==============================================
-- Verificar se a tabela equipment existe, se não, criar
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    power_kw DECIMAL(10, 2),
    voltage VARCHAR(50),
    location TEXT,
    installation_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- Índices para equipment
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON equipment(contract_id);
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);

-- ==============================================
-- CONTRACTS TABLE
-- ==============================================
-- Garantir que todas as colunas existem
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Manutenção';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- ==============================================
-- CLIENTS TABLE
-- ==============================================
-- Garantir que todas as colunas existem
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_contract_documents_document_name ON contract_documents(document_name);
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON contract_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
