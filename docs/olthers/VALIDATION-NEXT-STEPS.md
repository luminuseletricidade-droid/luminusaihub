# 🎯 Próximos Passos para Validação do Banco de Dados

## ✅ Trabalho Concluído

### Correções de Código Implementadas:
1. **Horário Fim da Manutenção** - `src/pages/Maintenances.tsx:690`
2. **Progresso do Checklist** - `src/components/MaintenanceChecklist.tsx:53-87`
3. **Melhorias de UX no Chat/IA** - `src/components/ModernContractChat.tsx`:
   - Verificação de sync antes de abrir relatórios (linhas 213-222)
   - Verificação de sync antes de enviar mensagens (linhas 913-921)
   - Botão de envio desabilitado durante sync (linhas 1740-1756)
   - Banner de status de sincronização (linhas 1459-1494)

### Documentação Criada:
- ✅ `docs/bug-fixes-2025-01.md` - Análise completa dos 7 problemas
- ✅ `supabase/migrations/99999999999999_data_cleanup_jan2025.sql` - Script de validação SQL **CORRIGIDO**
- ✅ `backend/scripts/database_validation.py` - Script Python (requer config adicional)
- ✅ `docs/database-validation-results.md` - Instruções detalhadas

---

## 🔍 Ação Manual Necessária: Validação do Banco

### Por que Manual?
O ambiente local não possui:
- Supabase CLI instalado
- Credenciais diretas do PostgreSQL configuradas
- Módulo psycopg2 instalado no Python

**Solução**: Executar via Supabase Dashboard (mais seguro e visual)

---

## ⚠️ IMPORTANTE: Schema Corrigido

### Serviços (contract_services)
O campo `services` **NÃO é um array na tabela `contracts`**.

Os serviços estão em uma tabela separada chamada `contract_services` com relação many-to-many:
- `contract_services.contract_id` → referencia `contracts.id`
- `contract_services.service_name` → nome do serviço
- `contract_services.description` → descrição do serviço

### Campos de Pagamento
A tabela `contracts` **NÃO possui** os campos:
- ❌ `payment_method` (não existe)
- ❌ `payment_status` (não existe)
- ❌ `billing_cycle` (não existe)
- ❌ `last_invoice_date` (não existe)
- ❌ `next_invoice_date` (não existe)

Campos de pagamento que **EXISTEM**:
- ✅ `payment_terms` (TEXT) - termos de pagamento
- ✅ `payment_due_day` (INTEGER) - dia de vencimento

**Todas as queries foram corrigidas** para usar apenas campos existentes.

---

## 📋 Passo a Passo - Execute AGORA

### 1️⃣ Acesse o Supabase Dashboard

```
URL: https://supabase.com/dashboard/project/fuepergwtyxhxtubxxux
```

Faça login e vá em: **SQL Editor** (menu lateral esquerdo)

---

### 2️⃣ Execute as Queries de Verificação (SEGURO - Apenas SELECT)

#### Query 1: Verificar Serviços com "teste"

```sql
SELECT
  c.id,
  c.contract_number,
  c.client_name,
  cs.service_name,
  cs.description,
  cs.created_at,
  cs.updated_at
FROM contracts c
INNER JOIN contract_services cs ON c.id = cs.contract_id
WHERE cs.service_name LIKE '%teste%'
   OR cs.description LIKE '%teste%'
ORDER BY cs.created_at DESC;
```

**O que procurar**:
- Se retornar 0 linhas → ✅ Nenhuma ação necessária
- Se retornar linhas → ⚠️ Há dados de teste para limpar

---

#### Query 2: Verificar Payment Terms Problemáticos

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

**O que procurar**:
- Quantos contratos têm `status = 'NULL'`
- Quantos têm `status = 'TEST_DATA'`
- Quantos têm `status = 'DEFAULT_VALUE'`

---

#### Query 3: Estatísticas Gerais

```sql
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
```

**Anote os números**:
- `with_test_services` → Quantos contratos têm "teste" em contract_services
- `with_test_payment_terms` → Quantos têm "teste" em payment_terms
- `without_payment_terms` → Quantos têm payment_terms NULL ou vazio

---

### 3️⃣ Decisão Baseada nos Resultados

#### Se `with_test_services > 0`:

**Criar Backup PRIMEIRO**:
```sql
CREATE TABLE IF NOT EXISTS contract_services_backup_jan2025 AS
SELECT * FROM contract_services
WHERE service_name LIKE '%teste%'
   OR description LIKE '%teste%';
```

**Executar Limpeza**:
```sql
DELETE FROM contract_services
WHERE service_name LIKE '%teste%'
   OR description LIKE '%teste%';
```

**Verificar Sucesso**:
```sql
SELECT COUNT(*) FROM contract_services
WHERE service_name LIKE '%teste%'
   OR description LIKE '%teste%';
-- Deve retornar 0
```

---

#### Se `without_payment_terms > 0`:

**Criar Backup PRIMEIRO**:
```sql
CREATE TABLE IF NOT EXISTS contracts_backup_jan2025 AS
SELECT * FROM contracts
WHERE payment_terms IS NULL
   OR payment_terms = ''
   OR payment_terms = 'não informado'
   OR payment_terms LIKE '%teste%';
```

**Normalizar NULL para String Vazia**:
```sql
UPDATE contracts
SET
  payment_terms = '',
  updated_at = NOW()
WHERE payment_terms IS NULL;
```

**Remover "não informado"**:
```sql
UPDATE contracts
SET
  payment_terms = '',
  updated_at = NOW()
WHERE payment_terms = 'não informado';
```

**Remover Dados de Teste**:
```sql
UPDATE contracts
SET
  payment_terms = '',
  updated_at = NOW()
WHERE payment_terms LIKE '%teste%';
```

**Verificar Normalização**:
```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN payment_terms IS NULL THEN 1 END) as nulls,
  COUNT(CASE WHEN payment_terms = '' THEN 1 END) as empties
FROM contracts;
-- nulls deve ser 0
```

---

### 4️⃣ Testar a Aplicação

Após executar as limpezas:

1. Abra a aplicação frontend
2. Vá em **Contratos**
3. Crie um novo contrato
4. Preencha:
   - Serviços Inclusos → Verificar se não aparece "teste"
   - Termos de Pagamento → Preencher e salvar
5. Recarregue a página (F5)
6. Abra o contrato novamente
7. **Verificar se os dados persistiram corretamente**

---

### 5️⃣ Testar Melhorias do Chat/IA

1. Abra um contrato
2. Clique em **Chat/IA**
3. **Verificar**:
   - ✅ Se aparecer banner "Sincronizando dados do contrato..." → AGUARDE
   - ✅ Botão de envio deve estar desabilitado com spinner
   - ✅ Após alguns segundos, banner muda para contexto do contrato
   - ✅ Botão de envio fica habilitado
   - ✅ Não deve aparecer erro "Ocorreu um erro ao buscar relatórios"

---

## 🔙 Rollback (Se Algo Der Errado)

### Restaurar contract_services deletados:
```sql
INSERT INTO contract_services
SELECT * FROM contract_services_backup_jan2025;
```

### Restaurar contratos modificados:
```sql
UPDATE contracts c
SET
  payment_terms = b.payment_terms,
  updated_at = b.updated_at
FROM contracts_backup_jan2025 b
WHERE c.id = b.id;
```

---

## 🧹 Após Confirmar que Tudo Está OK

Delete os backups:

```sql
DROP TABLE IF EXISTS contracts_backup_jan2025;
DROP TABLE IF EXISTS contract_services_backup_jan2025;
```

---

## 📊 Checklist Final

- [ ] Executar Query 1 (contract_services com "teste")
- [ ] Executar Query 2 (payment_terms problemáticos)
- [ ] Executar Query 3 (estatísticas gerais)
- [ ] Anotar os números
- [ ] Se necessário: criar backups
- [ ] Se necessário: executar limpezas
- [ ] Verificar que limpezas funcionaram (queries retornam 0)
- [ ] Testar criação de novo contrato
- [ ] Testar edição de contrato existente
- [ ] Testar Chat/IA (verificar loading states)
- [ ] Testar manutenção (horário fim + checklist)
- [ ] Se tudo OK: deletar backups

---

## 📞 Próximos Passos

**Imediato**:
1. Execute as 3 queries de verificação agora
2. Anote os resultados
3. Decida se precisa executar limpezas

**Se encontrar problemas**:
- Revise `docs/database-validation-results.md` para instruções detalhadas
- Revise `docs/bug-fixes-2025-01.md` para contexto dos problemas

**Arquivos de Referência**:
- Script SQL completo: `supabase/migrations/99999999999999_data_cleanup_jan2025.sql`
- Script Python (requer config): `backend/scripts/database_validation.py`

---

**Última atualização**: 2025-01-17 (Schema Corrigido - Todas as seções renumeradas)
**Status**: ✅ Pronto para validação manual com queries corretas

**Mudanças nesta versão**:
- Removida Seção 3 (campos de pagamento inexistentes)
- Renumeradas seções 4-9 para 3-8
- Adicionada documentação sobre campos que existem vs. não existem
- Queries da Seção 3 (Contratos Recentes) agora incluem JOIN com contract_services
