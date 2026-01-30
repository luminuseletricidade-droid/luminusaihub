-- Migration: Complete Schema Fix - All Missing Fields
-- Description: Adiciona TODOS os campos que faltam em todas as tabelas do sistema
-- Date: 2025-10-02
-- Author: Complete system analysis

-- ==============================================
-- CLIENTS TABLE - 12 insert fields, 8 update fields
-- ==============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- CONTRACTS TABLE - 45 insert fields + metadata
-- ==============================================
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_legal_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_city VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_state VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_zip_code VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contact_person VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS value DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Manutenção';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_number VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_model VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_location TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_brand VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_power VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_voltage VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_quantity INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS automatic_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reajustment_index VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fines_late_payment_percentage DECIMAL(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_fine_percentage DECIMAL(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- EQUIPMENT TABLE - 9 insert fields
-- ==============================================
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    type VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    location TEXT,
    manufacturer VARCHAR(255),
    observations TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se a tabela já existir
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- CONTRACT_DOCUMENTS TABLE - 8 insert fields
-- ==============================================
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS content_extracted TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Manter compatibilidade com nomes antigos se existirem
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Sincronizar dados entre colunas antigas e novas se necessário
UPDATE contract_documents SET document_name = file_name WHERE document_name IS NULL AND file_name IS NOT NULL;
UPDATE contract_documents SET storage_path = file_path WHERE storage_path IS NULL AND file_path IS NOT NULL;
UPDATE contract_documents SET document_type = file_type WHERE document_type IS NULL AND file_type IS NOT NULL;

-- ==============================================
-- MAINTENANCES TABLE - 11 insert fields
-- ==============================================
CREATE TABLE IF NOT EXISTS maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID,
    type VARCHAR(100),
    description TEXT,
    scheduled_date DATE,
    scheduled_time TIME,
    status VARCHAR(50) DEFAULT 'pending',
    technician VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se a tabela já existir
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS technician VARCHAR(255);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_client_cnpj ON contracts(client_cnpj);

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON equipment(contract_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);

-- Contract Documents
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON contract_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_contract_documents_document_type ON contract_documents(document_type);

-- Maintenances
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON maintenances(scheduled_date);

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================

-- Function para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_documents_updated_at ON contract_documents;
CREATE TRIGGER update_contract_documents_updated_at
    BEFORE UPDATE ON contract_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenances_updated_at ON maintenances;
CREATE TRIGGER update_maintenances_updated_at
    BEFORE UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
