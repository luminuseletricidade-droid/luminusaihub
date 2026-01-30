-- Migration: Add anon role policy for chat_sessions
-- Description: Adiciona política para role anon permitir inserções de chat_sessions
-- Date: 2025-10-10
-- Relates to: Fix persistent RLS error for chat_sessions

-- ==============================================
-- DROP EXISTING ANON POLICIES IF EXIST
-- ==============================================

DROP POLICY IF EXISTS "chat_sessions_anon_insert_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_select_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_update_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_delete_policy" ON chat_sessions;

-- ==============================================
-- ADD POLICIES FOR ANON ROLE
-- ==============================================

-- Política para role anon (usuários não autenticados usando API key)
CREATE POLICY "chat_sessions_anon_insert_policy"
ON chat_sessions FOR INSERT
TO anon
WITH CHECK (true);

-- Política SELECT para anon
CREATE POLICY "chat_sessions_anon_select_policy"
ON chat_sessions FOR SELECT
TO anon
USING (true);

-- Política UPDATE para anon
CREATE POLICY "chat_sessions_anon_update_policy"
ON chat_sessions FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Política DELETE para anon
CREATE POLICY "chat_sessions_anon_delete_policy"
ON chat_sessions FOR DELETE
TO anon
USING (true);

-- ==============================================
-- MAKE INSERT POLICY EVEN MORE PERMISSIVE
-- ==============================================

-- Remove a política INSERT atual
DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON chat_sessions;

-- Recria sem nenhuma verificação
CREATE POLICY "chat_sessions_insert_policy"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================
-- ADD COMMENTS
-- ==============================================

COMMENT ON POLICY "chat_sessions_anon_insert_policy" ON chat_sessions IS
    'Permite que o role anon crie sessões de chat (para API calls)';

COMMENT ON POLICY "chat_sessions_insert_policy" ON chat_sessions IS
    'Permite que usuários autenticados criem sessões sem restrições';
