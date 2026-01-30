-- Migration: Enhance Client-User Relationship Table
-- Description: Adiciona campos e funcionalidades à tabela client_users (tabela já criada no 00000_base_schema.sql)
-- Date: 2025-10-02

-- Adicionar coluna role se não existir
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner';
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_users_client_id_user_id_key'
    ) THEN
        ALTER TABLE client_users ADD CONSTRAINT client_users_client_id_user_id_key UNIQUE (client_id, user_id);
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_role ON client_users(role);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
    BEFORE UPDATE ON client_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios relacionamentos
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
CREATE POLICY "Users can view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Usuários podem criar relacionamentos para si mesmos
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
CREATE POLICY "Users can create their client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Apenas owners podem deletar relacionamentos
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;
CREATE POLICY "Owners can delete client relationships"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- Migrar dados existentes: criar relacionamento para clientes já existentes
INSERT INTO client_users (client_id, user_id, role)
SELECT id, user_id, 'owner'
FROM clients
WHERE user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Atualizar a constraint de CNPJ único para permitir compartilhamento
-- Remove a constraint única de CNPJ se existir
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_cnpj_key;

-- Criar índice não-único para CNPJ (permite duplicatas)
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj) WHERE cnpj IS NOT NULL;

-- Comentários para documentação
COMMENT ON TABLE client_users IS 'Relacionamento many-to-many entre clientes e usuários (multi-tenant)';
COMMENT ON COLUMN client_users.role IS 'Papel do usuário: owner (criador), editor (pode editar), viewer (apenas visualizar)';
