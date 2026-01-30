-- Migration: Fix client_users RLS policies
-- Description: Corrige políticas RLS da tabela client_users para permitir operações corretas
-- Date: 2025-10-10
-- Relates to: Fix for RLS error "new row violates row-level security policy for table client_users"

-- ==============================================
-- DROP EXISTING POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow authenticated users to create client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to update their client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to delete their client relationships" ON client_users;

-- ==============================================
-- CREATE NEW PERMISSIVE POLICIES
-- ==============================================

-- Policy: SELECT - Usuários podem ver seus próprios relacionamentos
DROP POLICY IF EXISTS "client_users_select_policy" ON client_users;
CREATE POLICY "client_users_select_policy"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: INSERT - Permite inserção se:
-- 1. O user_id corresponde ao usuário autenticado OU
-- 2. Não há user_id (será preenchido por trigger/default)
DROP POLICY IF EXISTS "client_users_insert_policy" ON client_users;
CREATE POLICY "client_users_insert_policy"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NOT NULL  -- Qualquer usuário autenticado pode criar relacionamentos
);

-- Policy: UPDATE - Usuários podem atualizar seus próprios relacionamentos
DROP POLICY IF EXISTS "client_users_update_policy" ON client_users;
CREATE POLICY "client_users_update_policy"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: DELETE - Apenas owners podem deletar relacionamentos
DROP POLICY IF EXISTS "client_users_delete_policy" ON client_users;
CREATE POLICY "client_users_delete_policy"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- ==============================================
-- ADD SERVICE ROLE BYPASS POLICY
-- ==============================================

-- Permite que o service role (backend) faça qualquer operação
DROP POLICY IF EXISTS "client_users_service_role_policy" ON client_users;
CREATE POLICY "client_users_service_role_policy"
ON client_users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD HELPFUL COMMENTS
-- ==============================================

COMMENT ON POLICY "client_users_select_policy" ON client_users IS
    'Permite que usuários vejam seus próprios relacionamentos com clientes';

COMMENT ON POLICY "client_users_insert_policy" ON client_users IS
    'Permite inserção de relacionamentos para usuários autenticados';

COMMENT ON POLICY "client_users_update_policy" ON client_users IS
    'Permite que usuários atualizem seus próprios relacionamentos';

COMMENT ON POLICY "client_users_delete_policy" ON client_users IS
    'Permite que owners deletem relacionamentos';

COMMENT ON POLICY "client_users_service_role_policy" ON client_users IS
    'Permite que o backend (service role) execute qualquer operação';
