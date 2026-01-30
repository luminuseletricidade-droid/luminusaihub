-- =====================================================
-- SCRIPT DE VALIDAÇÃO E LIMPEZA DE DADOS - Janeiro 2025
-- =====================================================
-- Este script contém queries de VERIFICAÇÃO e LIMPEZA
-- Execute as queries de verificação primeiro
-- Só execute as queries de limpeza após revisar os resultados
-- =====================================================

-- =====================================================
-- SEÇÃO 1: VERIFICAÇÃO - Serviços Inclusos
-- =====================================================

-- 1.1 Verificar contratos com "teste" em contract_services
SELECT
  c.id,
  c.contract_number,
  c.client_name,
  cs.service_name,
  cs.created_at,
  cs.updated_at
FROM contracts c
INNER JOIN contract_services cs ON c.id = cs.contract_id
WHERE cs.service_name LIKE '%teste%'
   OR cs.description LIKE '%teste%'
ORDER BY cs.created_at DESC;

-- 1.2 Verificar contratos sem services cadastrados
SELECT
  c.id,
  c.contract_number,
  c.client_name,
  COUNT(cs.id) as services_count,
  c.created_at
FROM contracts c
LEFT JOIN contract_services cs ON c.id = cs.contract_id
GROUP BY c.id, c.contract_number, c.client_name, c.created_at
HAVING COUNT(cs.id) = 0
ORDER BY c.created_at DESC
LIMIT 20;

-- =====================================================
-- SEÇÃO 2: VERIFICAÇÃO - Termos de Pagamento
-- =====================================================

-- 2.1 Verificar payment_terms NULL ou vazios
SELECT
  id,
  contract_number,
  client_name,
  payment_terms,
  CASE
    WHEN payment_terms IS NULL THEN 'NULL'
    WHEN payment_terms = '' THEN 'EMPTY_STRING'
    WHEN payment_terms = 'não informado' THEN 'DEFAULT_VALUE'
    WHEN payment_terms LIKE '%teste%' THEN 'TEST_DATA'
    ELSE 'HAS_VALUE'
  END as status,
  length(payment_terms) as length,
  created_at,
  updated_at
FROM contracts
WHERE payment_terms IS NULL
   OR payment_terms = ''
   OR payment_terms = 'não informado'
   OR payment_terms LIKE '%teste%'
ORDER BY created_at DESC;

-- 2.2 Verificar todos os valores únicos de payment_terms
SELECT
  payment_terms,
  COUNT(*) as count,
  CASE
    WHEN payment_terms IS NULL THEN 'NULL'
    WHEN payment_terms = '' THEN 'EMPTY'
    ELSE 'VALUE'
  END as type
FROM contracts
GROUP BY payment_terms
ORDER BY count DESC, payment_terms;

-- =====================================================
-- SEÇÃO 3: VERIFICAÇÃO - Contratos Recentes
-- =====================================================

-- 3.1 Últimos 20 contratos criados (overview completo)
SELECT
  c.id,
  c.contract_number,
  c.client_name,
  c.contract_type,
  c.payment_terms,
  c.payment_due_day,
  COUNT(cs.id) as services_count,
  c.created_at,
  c.updated_at
FROM contracts c
LEFT JOIN contract_services cs ON c.id = cs.contract_id
GROUP BY c.id, c.contract_number, c.client_name, c.contract_type, c.payment_terms, c.payment_due_day, c.created_at, c.updated_at
ORDER BY c.created_at DESC
LIMIT 20;

-- =====================================================
-- SEÇÃO 4: LIMPEZA - Serviços Inclusos (CUIDADO!)
-- =====================================================
-- ⚠️ ATENÇÃO: Só execute após revisar os resultados da seção 1
-- ⚠️ Remova os comentários (--) apenas se confirmar que quer limpar

-- 4.1 LIMPEZA: Deletar serviços com "teste" em service_name ou description
-- DELETE FROM contract_services
-- WHERE service_name LIKE '%teste%'
--    OR description LIKE '%teste%';

-- 4.2 VERIFICAÇÃO PÓS-LIMPEZA: Confirmar que "teste" foi removido
-- SELECT
--   c.id,
--   c.contract_number,
--   cs.service_name,
--   cs.description
-- FROM contracts c
-- INNER JOIN contract_services cs ON c.id = cs.contract_id
-- WHERE cs.service_name LIKE '%teste%'
--    OR cs.description LIKE '%teste%';

-- =====================================================
-- SEÇÃO 5: NORMALIZAÇÃO - Termos de Pagamento (CUIDADO!)
-- =====================================================
-- ⚠️ ATENÇÃO: Só execute após revisar os resultados da seção 2
-- ⚠️ Remova os comentários (--) apenas se confirmar que quer normalizar

-- 5.1 NORMALIZAÇÃO: Converter NULL para string vazia
-- UPDATE contracts
-- SET
--   payment_terms = '',
--   updated_at = NOW()
-- WHERE payment_terms IS NULL;

-- 5.2 NORMALIZAÇÃO: Remover valor padrão "não informado"
-- UPDATE contracts
-- SET
--   payment_terms = '',
--   updated_at = NOW()
-- WHERE payment_terms = 'não informado';

-- 5.3 NORMALIZAÇÃO: Remover dados de teste em payment_terms
-- UPDATE contracts
-- SET
--   payment_terms = '',
--   updated_at = NOW()
-- WHERE payment_terms LIKE '%teste%';

-- 5.4 VERIFICAÇÃO PÓS-NORMALIZAÇÃO: Confirmar normalização
-- SELECT
--   id,
--   contract_number,
--   payment_terms,
--   CASE
--     WHEN payment_terms IS NULL THEN 'NULL (PROBLEMA!)'
--     WHEN payment_terms = '' THEN 'EMPTY (OK)'
--     ELSE 'HAS_VALUE'
--   END as status,
--   updated_at
-- FROM contracts
-- WHERE payment_terms IS NULL
--    OR payment_terms = ''
--    OR payment_terms = 'não informado'
-- LIMIT 50;

-- =====================================================
-- SEÇÃO 6: ESTATÍSTICAS GERAIS
-- =====================================================

-- 6.1 Estatísticas de contratos
SELECT
  COUNT(DISTINCT c.id) as total_contracts,
  COUNT(DISTINCT CASE WHEN cs.id IS NOT NULL THEN c.id END) as with_services,
  COUNT(DISTINCT CASE WHEN cs.id IS NULL THEN c.id END) as without_services,
  COUNT(DISTINCT CASE WHEN c.payment_terms IS NOT NULL AND c.payment_terms != '' THEN c.id END) as with_payment_terms,
  COUNT(DISTINCT CASE WHEN c.payment_terms IS NULL OR c.payment_terms = '' THEN c.id END) as without_payment_terms,
  COUNT(DISTINCT CASE WHEN cs.service_name LIKE '%teste%' OR cs.description LIKE '%teste%' THEN c.id END) as with_test_services,
  COUNT(DISTINCT CASE WHEN c.payment_terms LIKE '%teste%' THEN c.id END) as with_test_payment_terms
FROM contracts c
LEFT JOIN contract_services cs ON c.id = cs.contract_id;

-- 6.2 Contratos criados por mês (últimos 6 meses)
SELECT
  DATE_TRUNC('month', c.created_at) as month,
  COUNT(DISTINCT c.id) as contracts_created,
  COUNT(DISTINCT CASE WHEN cs.id IS NOT NULL THEN c.id END) as with_services,
  COUNT(DISTINCT CASE WHEN c.payment_terms IS NOT NULL AND c.payment_terms != '' THEN c.id END) as with_payment_terms
FROM contracts c
LEFT JOIN contract_services cs ON c.id = cs.contract_id
WHERE c.created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', c.created_at)
ORDER BY month DESC;

-- =====================================================
-- SEÇÃO 7: BACKUP (OPCIONAL)
-- =====================================================
-- Criar tabelas de backup antes de fazer alterações

-- 7.1 CRIAR BACKUP dos contratos que serão alterados
-- CREATE TABLE IF NOT EXISTS contracts_backup_jan2025 AS
-- SELECT * FROM contracts
-- WHERE payment_terms IS NULL
--    OR payment_terms = ''
--    OR payment_terms = 'não informado'
--    OR payment_terms LIKE '%teste%';

-- 7.2 CRIAR BACKUP dos contract_services que serão deletados
-- CREATE TABLE IF NOT EXISTS contract_services_backup_jan2025 AS
-- SELECT * FROM contract_services
-- WHERE service_name LIKE '%teste%'
--    OR description LIKE '%teste%';

-- 7.3 VERIFICAR BACKUPS criados
-- SELECT
--   'contracts' as table_name,
--   COUNT(*) as backed_up_records,
--   MIN(created_at) as oldest,
--   MAX(created_at) as newest
-- FROM contracts_backup_jan2025
-- UNION ALL
-- SELECT
--   'contract_services' as table_name,
--   COUNT(*) as backed_up_records,
--   MIN(created_at) as oldest,
--   MAX(created_at) as newest
-- FROM contract_services_backup_jan2025;

-- =====================================================
-- SEÇÃO 8: ROLLBACK (EMERGÊNCIA)
-- =====================================================
-- Se algo der errado, use estas queries para reverter

-- 8.1 RESTAURAR contratos do backup
-- UPDATE contracts c
-- SET
--   payment_terms = b.payment_terms,
--   updated_at = b.updated_at
-- FROM contracts_backup_jan2025 b
-- WHERE c.id = b.id;

-- 8.2 RESTAURAR contract_services deletados
-- INSERT INTO contract_services
-- SELECT * FROM contract_services_backup_jan2025;

-- 8.3 DELETAR tabelas de backup (após confirmar que tudo está OK)
-- DROP TABLE IF EXISTS contracts_backup_jan2025;
-- DROP TABLE IF EXISTS contract_services_backup_jan2025;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Execute SEÇÕES 1-3 (VERIFICAÇÃO) primeiro
-- 2. Revise os resultados cuidadosamente
-- 3. Crie backup (SEÇÃO 7) se quiser segurança extra
-- 4. Remova comentários das queries de LIMPEZA (SEÇÕES 4-5)
--    APENAS se confirmar que quer executar
-- 5. Execute as queries de limpeza UMA POR UMA
-- 6. Execute as queries de VERIFICAÇÃO PÓS-LIMPEZA
-- 7. Verifique ESTATÍSTICAS GERAIS (SEÇÃO 6)
-- 8. Se tudo OK, delete o backup (SEÇÃO 8.3)
-- 9. Se algo deu errado, use ROLLBACK (SEÇÃO 8.1-8.2)
-- =====================================================
