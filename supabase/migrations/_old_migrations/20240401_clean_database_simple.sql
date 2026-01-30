-- ⚠️ ATENÇÃO: Este script limpa TODOS os dados do banco, exceto o usuário atual
-- Execute com cuidado! Isso removerá TODOS os dados de teste

-- Versão simplificada sem verificações condicionais
-- Execute cada comando individualmente se houver erros

-- Limpar dados de chat
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;

-- Limpar dados de documentos
TRUNCATE TABLE documents CASCADE;

-- Limpar manutenções
TRUNCATE TABLE maintenances CASCADE;

-- Limpar todos os contratos (isso também limpa dados relacionados se CASCADE estiver configurado)
TRUNCATE TABLE contracts CASCADE;

-- Limpar todos os clientes
TRUNCATE TABLE clients CASCADE;

-- Mensagem de confirmação
SELECT 'Banco de dados limpo com sucesso! Todos os dados foram removidos, exceto usuários.' as message;