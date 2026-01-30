-- Remover registro da migração que falhou para poder executar novamente
DELETE FROM schema_migrations
WHERE migration_name = '00011_ensure_client_status.sql';
