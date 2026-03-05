-- Migration: Set default timezone for Supabase database
-- Description: Configura timezone padrão para America/Sao_Paulo (UTC-3)
-- Created: 2025-01-03

-- ==============================================================================
-- CONFIGURAÇÃO DE TIMEZONE PADRÃO
-- ==============================================================================

-- 1. Configurar timezone padrão do banco de dados para America/Sao_Paulo
-- NOTA: Esta configuração afeta todas as sessões novas
ALTER DATABASE postgres SET timezone = 'America/Sao_Paulo';

-- 2. Aplicar timezone na sessão atual
SET timezone = 'America/Sao_Paulo';

-- 3. Criar função helper para garantir timezone em queries
CREATE OR REPLACE FUNCTION set_session_timezone()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE 'SET timezone = ''America/Sao_Paulo''';
END;
$$;

COMMENT ON FUNCTION set_session_timezone() IS
'Helper function para garantir que timezone está configurado corretamente na sessão';

-- 4. Verificar timezone atual (para debug)
DO $$
DECLARE
    current_tz text;
BEGIN
    SHOW timezone INTO current_tz;
    RAISE NOTICE '✅ Timezone configurado: %', current_tz;
END;
$$;

-- ==============================================================================
-- FUNÇÕES UTILITÁRIAS DE DATA/HORA COM TIMEZONE
-- ==============================================================================

-- Função para obter timestamp atual no timezone local
CREATE OR REPLACE FUNCTION now_local()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
    SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$$;

COMMENT ON FUNCTION now_local() IS
'Retorna timestamp atual no timezone America/Sao_Paulo';

-- Função para converter timestamp para timezone local
CREATE OR REPLACE FUNCTION to_local(ts timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
    SELECT ts AT TIME ZONE 'America/Sao_Paulo';
$$;

COMMENT ON FUNCTION to_local(timestamp with time zone) IS
'Converte timestamp para timezone America/Sao_Paulo';

-- Função para formatar data no formato brasileiro
CREATE OR REPLACE FUNCTION format_date_br(dt date)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT TO_CHAR(dt, 'DD/MM/YYYY');
$$;

COMMENT ON FUNCTION format_date_br(date) IS
'Formata data no formato brasileiro (DD/MM/YYYY)';

-- Função para formatar datetime no formato brasileiro
CREATE OR REPLACE FUNCTION format_datetime_br(ts timestamp with time zone)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT TO_CHAR(ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
$$;

COMMENT ON FUNCTION format_datetime_br(timestamp with time zone) IS
'Formata timestamp no formato brasileiro (DD/MM/YYYY HH24:MI:SS) no timezone America/Sao_Paulo';

-- ==============================================================================
-- TRIGGERS PARA GARANTIR TIMEZONE EM CREATED_AT/UPDATED_AT
-- ==============================================================================

-- Função trigger para garantir que timestamps usem timezone correto
CREATE OR REPLACE FUNCTION ensure_timezone_on_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Garantir que created_at use timezone correto
    IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
        NEW.created_at := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- Sempre atualizar updated_at com timezone correto
    IF TG_TABLE_NAME != 'clients' OR TG_OP != 'INSERT' THEN
        NEW.updated_at := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_timezone_on_timestamps() IS
'Trigger function para garantir que created_at e updated_at usem timezone America/Sao_Paulo';

-- ==============================================================================
-- VIEW PARA VERIFICAR TIMEZONE DAS TABELAS
-- ==============================================================================

-- View para verificar configuração de timezone em colunas
CREATE OR REPLACE VIEW v_timezone_info AS
SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    a.attname as column_name,
    t.typname as data_type,
    CASE
        WHEN t.typname LIKE '%timestamp%' THEN '✅ Usa timezone'
        WHEN t.typname = 'date' THEN '⚠️ Sem timezone (apenas data)'
        WHEN t.typname = 'time' THEN '⚠️ Sem timezone (apenas hora)'
        ELSE 'N/A'
    END as timezone_support
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_type t ON a.atttypid = t.oid
WHERE
    n.nspname = 'public'
    AND c.relkind = 'r'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND t.typname IN ('timestamp', 'timestamptz', 'date', 'time', 'timetz')
ORDER BY n.nspname, c.relname, a.attname;

COMMENT ON VIEW v_timezone_info IS
'View para verificar quais colunas de data/hora usam timezone';

-- ==============================================================================
-- DOCUMENTAÇÃO E VERIFICAÇÃO
-- ==============================================================================

-- Criar tabela de metadata para documentar configuração de timezone
CREATE TABLE IF NOT EXISTS _timezone_config (
    id serial PRIMARY KEY,
    timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
    description text,
    configured_at timestamp with time zone DEFAULT NOW(),
    configured_by text DEFAULT current_user
);

COMMENT ON TABLE _timezone_config IS
'Metadata sobre configuração de timezone do banco de dados';

-- Inserir configuração padrão
INSERT INTO _timezone_config (timezone, description)
VALUES (
    'America/Sao_Paulo',
    'Timezone padrão configurado para Horário de Brasília (UTC-3).
    Todas as operações de data/hora no banco usarão este timezone.
    Para queries, use: SET timezone = ''America/Sao_Paulo'';
    Para funções, use: now_local(), to_local(), format_datetime_br()'
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- QUERIES DE VERIFICAÇÃO (COMENTADAS)
-- ==============================================================================

-- Para verificar timezone atual:
-- SHOW timezone;

-- Para verificar todas as configurações de timezone:
-- SELECT name, setting, context FROM pg_settings WHERE name LIKE '%timezone%';

-- Para verificar colunas que usam timestamp:
-- SELECT * FROM v_timezone_info;

-- Para testar funções:
-- SELECT now_local();
-- SELECT to_local(NOW());
-- SELECT format_date_br(CURRENT_DATE);
-- SELECT format_datetime_br(NOW());

-- ==============================================================================
-- NOTAS IMPORTANTES
-- ==============================================================================

/*
NOTAS SOBRE TIMEZONE:

1. TIMESTAMP vs TIMESTAMP WITH TIME ZONE:
   - TIMESTAMP: Não armazena timezone (naive)
   - TIMESTAMPTZ: Armazena timezone (aware) - RECOMENDADO

2. CONFIGURAÇÃO DO BANCO:
   - ALTER DATABASE: Afeta todas as novas sessões
   - SET timezone: Afeta apenas a sessão atual
   - Aplicações devem configurar timezone na conexão

3. CONVERSÃO DE TIMEZONE:
   - AT TIME ZONE 'America/Sao_Paulo': Converte para timezone específico
   - NOW(): Retorna timestamp em UTC (se não configurado)
   - CURRENT_TIMESTAMP: Retorna timestamp no timezone da sessão

4. MELHORES PRÁTICAS:
   - Sempre usar TIMESTAMP WITH TIME ZONE para created_at/updated_at
   - Configurar timezone na conexão: SET timezone = 'America/Sao_Paulo'
   - Usar funções helper: now_local(), to_local()
   - Armazenar em UTC, converter para exibição

5. BACKEND INTEGRATION:
   - Python: Usar timezone_config.py
   - PostgreSQL: Esta migration configura timezone
   - Frontend: Usar timezone.config.ts

6. HORÁRIO DE VERÃO:
   - Brasil não usa mais horário de verão desde 2019
   - America/Sao_Paulo sempre UTC-3
*/

-- ==============================================================================
-- FIM DA MIGRATION
-- ==============================================================================

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00026_set_default_timezone.sql aplicada com sucesso';
    RAISE NOTICE '🌍 Timezone padrão: America/Sao_Paulo (UTC-3)';
    RAISE NOTICE '📝 Use: SELECT * FROM _timezone_config; para ver configuração';
    RAISE NOTICE '🔍 Use: SELECT * FROM v_timezone_info; para verificar colunas';
END;
$$;
