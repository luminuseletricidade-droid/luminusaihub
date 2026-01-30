-- ⚠️ SCRIPT SIMPLES: Limpa apenas as tabelas principais
-- Execute cada linha individualmente se preferir

-- Limpar manutenções
TRUNCATE TABLE maintenances CASCADE;

-- Limpar sessões de chat
TRUNCATE TABLE chat_sessions CASCADE;

-- Limpar mensagens de chat
TRUNCATE TABLE chat_messages CASCADE;

-- Limpar contratos (isso limpa relacionamentos)
TRUNCATE TABLE contracts CASCADE;

-- Limpar clientes
TRUNCATE TABLE clients CASCADE;

-- Confirmação
SELECT 'Tabelas principais limpas com sucesso!' as message;