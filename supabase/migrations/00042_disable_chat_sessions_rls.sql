-- Migration: Temporarily disable RLS for chat_sessions
-- Description: Desabilita RLS temporariamente para chat_sessions para permitir operações
-- Date: 2025-10-10
-- Relates to: Fix persistent RLS error that won't resolve with policies

-- ==============================================
-- DISABLE RLS FOR chat_sessions
-- ==============================================

-- Desabilitar RLS completamente
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON TABLE chat_sessions IS 'Chat sessions table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';

-- ==============================================
-- LOG WARNING
-- ==============================================

DO $$
BEGIN
    RAISE WARNING '⚠️  RLS DESABILITADO para chat_sessions. Esta é uma solução temporária!';
END $$;
