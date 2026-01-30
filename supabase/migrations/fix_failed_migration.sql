-- Remover registros de migrations que falharam
DELETE FROM schema_migrations
WHERE migration_name IN (
    '00026_set_default_timezone.sql',
    '00027_fix_client_documents_storage_rls.sql'
);

-- Verificar migrations restantes
SELECT migration_name, executed_at
FROM schema_migrations
ORDER BY executed_at DESC
LIMIT 10;

-- Resultado esperado:
-- Deverá mostrar apenas as migrations que foram executadas com sucesso
