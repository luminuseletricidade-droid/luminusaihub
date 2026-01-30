-- ⚠️ ATENÇÃO: Este script limpa TODOS os dados do banco, exceto o usuário atual
-- Execute com cuidado! Isso removerá TODOS os dados de teste

-- Função auxiliar para limpar tabela se ela existir
CREATE OR REPLACE FUNCTION truncate_if_exists(table_name text) 
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = truncate_if_exists.table_name
    ) THEN
        EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
        RAISE NOTICE 'Tabela % limpa com sucesso', table_name;
    ELSE
        RAISE NOTICE 'Tabela % não existe, pulando...', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Limpar todas as tabelas que existirem
DO $$
BEGIN
    -- Limpar dados de chat
    PERFORM truncate_if_exists('chat_messages');
    PERFORM truncate_if_exists('chat_sessions');
    
    -- Limpar dados de documentos
    PERFORM truncate_if_exists('documents');
    PERFORM truncate_if_exists('contract_documents');
    
    -- Limpar manutenções
    PERFORM truncate_if_exists('maintenances');
    
    -- Limpar serviços e equipamentos
    PERFORM truncate_if_exists('contract_services');
    PERFORM truncate_if_exists('contract_equipments');
    
    -- Limpar contratos
    PERFORM truncate_if_exists('contracts');
    
    -- Limpar clientes
    PERFORM truncate_if_exists('clients');
    
    RAISE NOTICE 'Banco de dados limpo com sucesso! Todos os dados foram removidos, exceto usuários.';
END $$;

-- Limpar função temporária
DROP FUNCTION IF EXISTS truncate_if_exists(text);

-- Mensagem de confirmação
SELECT 'Banco de dados limpo com sucesso! Todos os dados foram removidos, exceto usuários.' as message;