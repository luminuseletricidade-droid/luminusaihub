-- Migration: Add Missing Client Columns
-- Description: Adiciona colunas faltantes na tabela clients
-- Date: 2025-10-02

-- Adicionar coluna contact_person
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- Adicionar coluna cnpj se não existir (algumas versões antigas não têm)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- Adicionar coluna status_id para relacionar com client_status
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);

-- Documentação
COMMENT ON COLUMN clients.contact_person IS 'Nome da pessoa de contato no cliente';
COMMENT ON COLUMN clients.status_id IS 'Referência para o status do cliente';
