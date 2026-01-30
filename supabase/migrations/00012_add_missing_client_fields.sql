-- Migration: Add Missing Client Fields
-- Description: Adiciona colunas que faltam na tabela clients
-- Date: 2025-10-02

-- Adicionar colunas que podem estar faltando
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state);
