# Validação do Banco de Dados - Instruções

## Status da Validação

⚠️ A validação automática via script Python requer credenciais diretas do PostgreSQL que não estão configuradas localmente.

## Como Executar a Validação

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Abra o arquivo: `supabase/migrations/99999999999999_data_cleanup_jan2025.sql`
5. Execute as queries de VERIFICAÇÃO (Seções 1-4) uma por uma
6. Anote os resultados

### Opção 2: Via Supabase CLI Local

```bash
cd "luminus-ai-hub"

# Conectar ao projeto
supabase link

# Executar queries de verificação
supabase db execute < supabase/migrations/99999999999999_data_cleanup_jan2025.sql
```

### Opção 3: Via psql (se tiver credenciais)

```bash
# Obter URL de conexão do Supabase Dashboard
# Settings > Database > Connection string

psql "postgresql://..." -f supabase/migrations/99999999999999_data_cleanup_jan2025.sql
```

## Queries Prioritárias para Executar

### 1. Verificar Dados de Teste em Services

```sql
SELECT
  id,
  contract_number,
  client_name,
  services,
  created_at
FROM contracts
WHERE 'teste' = ANY(services)
ORDER BY created_at DESC;
```

**O que procurar**: Contratos com a palavra "teste" no array de services

### 2. Verificar Payment Terms Problemáticos

```sql
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
  created_at
FROM contracts
WHERE payment_terms IS NULL
   OR payment_terms = ''
   OR payment_terms = 'não informado'
   OR payment_terms LIKE '%teste%'
ORDER BY created_at DESC
LIMIT 20;
```

**O que procurar**: Contratos com payment_terms NULL, vazio ou com "teste"

### 3. Estatísticas Gerais

```sql
SELECT
  COUNT(*) as total_contracts,
  COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
  COUNT(CASE WHEN services IS NULL OR array_length(services, 1) IS NULL THEN 1 END) as without_services,
  COUNT(CASE WHEN payment_terms IS NOT NULL AND payment_terms != '' THEN 1 END) as with_payment_terms,
  COUNT(CASE WHEN payment_terms IS NULL OR payment_terms = '' THEN 1 END) as without_payment_terms,
  COUNT(CASE WHEN 'teste' = ANY(services) THEN 1 END) as with_test_services,
  COUNT(CASE WHEN payment_terms LIKE '%teste%' THEN 1 END) as with_test_payment_terms
FROM contracts;
```

**O que procurar**: Números de contratos em cada categoria

## Ações Baseadas nos Resultados

### Se encontrar contratos com "teste" em services:

1. **Criar backup primeiro** (Seção 8.1 do script SQL):
   ```sql
   CREATE TABLE IF NOT EXISTS contracts_backup_jan2025 AS
   SELECT * FROM contracts
   WHERE 'teste' = ANY(services);
   ```

2. **Executar limpeza** (Seção 5.1):
   ```sql
   UPDATE contracts
   SET
     services = array_remove(services, 'teste'),
     updated_at = NOW()
   WHERE 'teste' = ANY(services);
   ```

3. **Verificar limpeza**:
   ```sql
   SELECT COUNT(*) FROM contracts WHERE 'teste' = ANY(services);
   -- Deve retornar 0
   ```

### Se encontrar payment_terms NULL ou com "teste":

1. **Criar backup primeiro** (já criado acima ou criar separado)

2. **Normalizar NULL para string vazia** (Seção 6.1):
   ```sql
   UPDATE contracts
   SET
     payment_terms = '',
     updated_at = NOW()
   WHERE payment_terms IS NULL;
   ```

3. **Remover "não informado"** (Seção 6.2):
   ```sql
   UPDATE contracts
   SET
     payment_terms = '',
     updated_at = NOW()
   WHERE payment_terms = 'não informado';
   ```

4. **Remover dados de teste** (Seção 6.3):
   ```sql
   UPDATE contracts
   SET
     payment_terms = '',
     updated_at = NOW()
   WHERE payment_terms LIKE '%teste%';
   ```

5. **Verificar normalização**:
   ```sql
   SELECT
     COUNT(*) as total,
     COUNT(CASE WHEN payment_terms IS NULL THEN 1 END) as nulls,
     COUNT(CASE WHEN payment_terms = '' THEN 1 END) as empties
   FROM contracts;
   -- nulls deve ser 0
   ```

## Rollback em Caso de Problema

Se algo der errado, restaure do backup:

```sql
UPDATE contracts c
SET
  services = b.services,
  payment_terms = b.payment_terms,
  updated_at = b.updated_at
FROM contracts_backup_jan2025 b
WHERE c.id = b.id;
```

## Após Confirmar que Tudo Está OK

Delete a tabela de backup:

```sql
DROP TABLE IF EXISTS contracts_backup_jan2025;
```

## Checklist de Validação

- [ ] Conectar ao Supabase Dashboard
- [ ] Executar query 1 (verificar services com "teste")
- [ ] Executar query 2 (verificar payment_terms problemáticos)
- [ ] Executar query 3 (estatísticas gerais)
- [ ] Anotar quantidades encontradas
- [ ] Se encontrou problemas: criar backup
- [ ] Se encontrou problemas: executar limpezas apropriadas
- [ ] Verificar que limpezas funcionaram
- [ ] Testar aplicação para confirmar que nada quebrou
- [ ] Deletar backup se tudo OK

## Resultados Esperados

Após a limpeza:

- ✅ 0 contratos com "teste" em services
- ✅ 0 contratos com "teste" em payment_terms
- ✅ 0 contratos com payment_terms NULL
- ✅ Contratos com payment_terms vazios ("") ao invés de NULL

## Documentação Relacionada

- Script SQL completo: `supabase/migrations/99999999999999_data_cleanup_jan2025.sql`
- Relatório de bugs: `docs/bug-fixes-2025-01.md`
- Código corrigido:
  - `src/pages/Maintenances.tsx` (linha 690)
  - `src/components/MaintenanceChecklist.tsx` (linhas 53-87)
  - `src/components/MaintenanceCard.tsx` (linha 345)
  - `src/components/ModernContractChat.tsx` (várias linhas - melhorias UX)

---

**Última atualização**: 2025-01-17
