-- Migration: Fix Chat Sessions Contract Id
-- Description: Altera contract_id de UUID para TEXT para permitir identificadores especiais como 'ai-agents'
-- Date: 2025-10-02

-- Remover a constraint de foreign key se existir
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_contract_id_fkey;

-- Alterar o tipo da coluna de UUID para TEXT
ALTER TABLE chat_sessions
ALTER COLUMN contract_id TYPE TEXT USING contract_id::TEXT;

-- Documentação
COMMENT ON COLUMN chat_sessions.contract_id IS 'ID do contrato (UUID) ou identificador especial (ex: ai-agents)';
