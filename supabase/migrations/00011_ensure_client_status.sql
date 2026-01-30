-- Migration: Enhance Client Status Table
-- Description: Adiciona campos adicionais à tabela client_status
-- Date: 2025-10-02

-- Adicionar colunas que faltam (tabela já foi criada no 00000_base_schema.sql)
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS color VARCHAR(7);
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar constraint UNIQUE em name se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_status_name_key'
    ) THEN
        ALTER TABLE client_status ADD CONSTRAINT client_status_name_key UNIQUE (name);
    END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_client_status_name ON client_status(name);

-- Habilitar RLS
ALTER TABLE client_status ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view client status" ON client_status;
DROP POLICY IF EXISTS "Users can insert client status" ON client_status;
DROP POLICY IF EXISTS "Users can update client status" ON client_status;
DROP POLICY IF EXISTS "Users can delete client status" ON client_status;
DROP POLICY IF EXISTS "All users can view client status" ON client_status;
DROP POLICY IF EXISTS "Only admins can manage client status" ON client_status;
DROP POLICY IF EXISTS "Authenticated users can view client status" ON client_status;
DROP POLICY IF EXISTS "Authenticated users can manage client status" ON client_status;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can view client status"
ON client_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage client status"
ON client_status FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Inserir status padrão se não existirem
INSERT INTO client_status (name, color, description, is_active)
SELECT 'Ativo', '#10B981', 'Cliente ativo', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Ativo')
UNION ALL
SELECT 'Inativo', '#EF4444', 'Cliente inativo', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Inativo')
UNION ALL
SELECT 'Prospecto', '#F59E0B', 'Cliente em prospecção', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Prospecto');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_client_status_updated_at ON client_status;
CREATE TRIGGER update_client_status_updated_at
    BEFORE UPDATE ON client_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
