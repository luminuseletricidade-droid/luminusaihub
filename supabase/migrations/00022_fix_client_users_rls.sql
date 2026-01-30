-- Migration: Fix Client Users RLS Policies
-- Description: Corrige políticas RLS para permitir criação de relacionamentos
-- Date: 2025-10-02

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;

-- Policy: Usuários podem ver seus próprios relacionamentos
CREATE POLICY "Users can view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Usuários autenticados podem criar relacionamentos para si mesmos
-- IMPORTANTE: user_id no INSERT deve ser igual ao auth.uid() atual
CREATE POLICY "Users can create their client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
);

-- Policy: Usuários podem atualizar seus relacionamentos
DROP POLICY IF EXISTS "Users can update their client relationships" ON client_users;
CREATE POLICY "Users can update their client relationships"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Apenas owners podem deletar relacionamentos
CREATE POLICY "Owners can delete client relationships"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- Comentários para documentação
COMMENT ON POLICY "Users can create their client relationships" ON client_users IS
'Permite que usuários autenticados criem relacionamentos apenas para si mesmos. O user_id no INSERT deve ser igual ao auth.uid() atual.';
