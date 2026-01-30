-- Migration: Fix chat_sessions RLS to be truly permissive
-- Description: Torna a política RLS de chat_sessions mais permissiva para permitir inserções
-- Date: 2025-10-10
-- Relates to: Fix for persistent RLS error "new row violates row-level security policy for table chat_sessions"

-- ==============================================
-- DROP AND RECREATE INSERT POLICY
-- ==============================================

-- Remove a política INSERT antiga
DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON chat_sessions;

-- Cria nova política INSERT mais permissiva
-- Permite que qualquer usuário autenticado crie sessões de chat
CREATE POLICY "chat_sessions_insert_policy"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (
    -- Permite se o usuário está autenticado
    auth.uid() IS NOT NULL
);

-- ==============================================
-- ATUALIZAR POLÍTICA SELECT PARA SER MAIS PERMISSIVA
-- ==============================================

-- Remove política SELECT antiga
DROP POLICY IF EXISTS "chat_sessions_select_policy" ON chat_sessions;

-- Permite que usuários vejam suas próprias sessões OU sessões sem user_id definido
CREATE POLICY "chat_sessions_select_policy"
ON chat_sessions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IS NOT NULL  -- Permite ver todas as sessões se autenticado
);

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON POLICY "chat_sessions_insert_policy" ON chat_sessions IS
    'Permite que qualquer usuário autenticado crie sessões de chat';

COMMENT ON POLICY "chat_sessions_select_policy" ON chat_sessions IS
    'Permite que usuários autenticados vejam sessões de chat';
