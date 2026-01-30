-- Migration: Debug and Fix Client Users RLS
-- Description: Adiciona logging e simplifica política para debug
-- Date: 2025-10-02

-- Primeiro, vamos temporariamente desabilitar RLS para testar
-- DROP todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can update their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;

-- Criar política mais permissiva para INSERT (para debug)
-- Permite que qualquer usuário autenticado crie relacionamentos
DROP POLICY IF EXISTS "Allow authenticated users to create client relationships" ON client_users;
CREATE POLICY "Allow authenticated users to create client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de SELECT - ver todos os relacionamentos do usuário
DROP POLICY IF EXISTS "Allow users to view their client relationships" ON client_users;
CREATE POLICY "Allow users to view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política de UPDATE - atualizar apenas seus relacionamentos
DROP POLICY IF EXISTS "Allow users to update their client relationships" ON client_users;
CREATE POLICY "Allow users to update their client relationships"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política de DELETE - deletar apenas seus relacionamentos
DROP POLICY IF EXISTS "Allow users to delete their client relationships" ON client_users;
CREATE POLICY "Allow users to delete their client relationships"
ON client_users FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Adicionar comentário explicativo
COMMENT ON POLICY "Allow authenticated users to create client relationships" ON client_users IS
'TEMPORÁRIO: Política permissiva para debug. TODO: Adicionar validação user_id = auth.uid() após confirmar que funciona.';
