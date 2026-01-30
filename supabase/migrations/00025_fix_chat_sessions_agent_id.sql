-- Migration: Fix Chat Sessions Agent ID Type
-- Description: Muda agent_id de UUID para VARCHAR para suportar IDs como "contract-extractor"
-- Date: 2025-10-02

-- Primeiro, remover a foreign key constraint se existir
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_agent_id_fkey;

-- Alterar o tipo de agent_id de UUID para VARCHAR
ALTER TABLE chat_sessions
ALTER COLUMN agent_id TYPE VARCHAR(100) USING agent_id::VARCHAR;

-- Remover índice antigo se existir e criar novo
DROP INDEX IF EXISTS idx_chat_sessions_agent_id;
CREATE INDEX idx_chat_sessions_agent_id ON chat_sessions(agent_id);

-- Comentário explicativo
COMMENT ON COLUMN chat_sessions.agent_id IS
'ID do agente usado na sessão. Pode ser um identificador string como "contract-extractor" ou "general-chat". Não há FK pois agents não são armazenados no banco.';
