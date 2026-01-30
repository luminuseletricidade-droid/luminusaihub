-- ⚠️ ATENÇÃO: Este script limpa TODOS os dados do banco, exceto o usuário atual
-- Execute com cuidado! Isso removerá TODOS os dados de teste

-- Começar uma transação
BEGIN;

-- Limpar dados de chat (ordem correta para evitar violação de FK)
DELETE FROM chat_messages;
DELETE FROM chat_sessions;

-- Limpar documentos anexados (se a tabela existir)
DELETE FROM contract_documents WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_documents'
);

-- Limpar dados de documentos
DELETE FROM documents;

-- Limpar manutenções
DELETE FROM maintenances;

-- Limpar serviços dos contratos (se a tabela existir)
DELETE FROM contract_services WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_services'
);

-- Limpar equipamentos dos contratos (se a tabela existir)
DELETE FROM contract_equipments WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_equipments'
);

-- Limpar todos os contratos
DELETE FROM contracts;

-- Limpar todos os clientes
DELETE FROM clients;

-- Resetar sequências se existirem
-- (Adicione aqui se você tiver sequências personalizadas)

-- Confirmar transação
COMMIT;

-- Mensagem de confirmação
SELECT 'Banco de dados limpo com sucesso! Todos os dados foram removidos, exceto usuários.' as message;