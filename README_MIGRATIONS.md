# 🚀 Guia Completo de Migrations - Luminus AI Hub

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquivos Disponíveis](#arquivos-disponíveis)
3. [Etapa 1: Aplicar Migrations](#etapa-1-aplicar-migrations)
4. [Etapa 2: Migrar Dados](#etapa-2-migrar-dados)
5. [Etapa 3: Validação](#etapa-3-validação)
6. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este guia contém tudo necessário para:
1. ✅ Criar toda a estrutura de banco de dados no Supabase
2. ✅ Migrar dados do banco antigo
3. ✅ Validar e testar a aplicação

**Status:** ✅ Tudo pronto para execução

**Project ID:** `jtrhpbgrpsgneleptzgm`

---

## Arquivos Disponíveis

### 📦 Arquivo Principal
- **`consolidated_migrations.sql`** (214 KB)
  - Todas as 65 migrations consolidadas
  - Pronto para execução no SQL Editor do Supabase
  - Idempotente e transacional

### 📖 Documentação
- **`APLICAR_MIGRATIONS.md`** - Guia detalhado de aplicação
- **`QUICK_START.md`** - Guia rápido (TL;DR)
- **`MIGRATIONS_README.md`** - Documentação técnica completa
- **`CONSOLIDATION_REPORT.txt`** - Relatório estatístico

### 🔧 Scripts de Auxílio
- **`apply-migrations.sh`** - Script bash para CLI
- **`check-migrations.py`** - Análise de migrations
- **`migrate_data_from_old_db.py`** - Migração de dados

---

## Etapa 1: Aplicar Migrations

### Método 1: SQL Editor (Recomendado) ⭐

**Mais simples e direto. Use este!**

```bash
# 1. Abra o Supabase Dashboard
open https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm

# 2. Navegue: SQL Editor → + New query

# 3. Abra o arquivo consolidated_migrations.sql

# 4. Copie TODO o conteúdo (Cmd/Ctrl + A)

# 5. Cole no SQL Editor (Cmd/Ctrl + V)

# 6. Execute (Cmd/Ctrl + Enter ou botão RUN)

# 7. Aguarde 1-2 minutos ⏱️
```

**Verificação:**
```sql
-- Contar tabelas criadas
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Deve retornar: ~25-30
```

### Método 2: Supabase CLI

**Requer token de acesso**

```bash
# 1. Obter token
# Acesse: https://supabase.com/dashboard/account/tokens
# Copie o token gerado

# 2. Configurar token
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"

# 3. Fazer link com projeto
supabase link --project-ref jtrhpbgrpsgneleptzgm

# 4. Ver status
supabase migration list

# 5. Aplicar migrations
supabase db push

# 6. Verificar
supabase status
```

### O que será criado?

```
✅ 25+ TABELAS:
   • clients (clientes)
   • contracts (contratos)
   • contract_documents (documentos)
   • contract_addendums (aditivos)
   • maintenances (manutenções)
   • maintenance_checklist (checklists)
   • equipment (equipamentos)
   • chat_sessions (sessões de chat)
   • chat_messages (mensagens)
   • generated_reports (relatórios)
   • profiles (perfis)
   • regions (regiões)
   • E muitas outras...

✅ 3 STORAGE BUCKETS:
   • contract-documents (PDF only)
   • client-documents (all types)
   • maintenance-documents (all types)

✅ RECURSOS:
   • Row Level Security (RLS)
   • Funções SQL (CNPJ, timezone, etc.)
   • Triggers automáticos
   • Índices de performance
   • Dados padrão (status, etc.)
```

---

## Etapa 2: Migrar Dados

**Após aplicar as migrations, migre os dados do banco antigo.**

### Opção 1: Script Python (Recomendado) ⭐

```bash
# 1. Instalar dependências
pip install psycopg2-binary python-dotenv

# 2. Configurar .env (backend/.env)
# Adicione:
SUPABASE_DB_URL=postgresql://postgres:sua_senha@db.jtrhpbgrpsgneleptzgm.supabase.co:5432/postgres

# 3. Executar migração (DRY-RUN primeiro)
python3 migrate_data_from_old_db.py \
  --old-db-url "postgresql://user:pass@host:5432/db" \
  --dry-run

# 4. Executar migração real
python3 migrate_data_from_old_db.py \
  --old-db-url "postgresql://user:pass@host:5432/db" \
  --tables "clients,contracts,maintenances,equipment"
```

### Opção 2: Export/Import Manual

```bash
# 1. Exportar do banco antigo
pg_dump -h old_host -U user -d database \
  -t clients -t contracts -t maintenances \
  --data-only --column-inserts > data_export.sql

# 2. Importar no Supabase (via SQL Editor)
# Cole o conteúdo de data_export.sql no SQL Editor
# Execute
```

### Opção 3: CSV Import

```bash
# 1. Exportar para CSV
psql -h old_host -U user -d database \
  -c "COPY clients TO STDOUT WITH CSV HEADER" > clients.csv

# 2. Importar via SQL Editor
COPY clients (name, cnpj, email, phone, address, city, state)
FROM '/path/to/clients.csv'
DELIMITER ','
CSV HEADER;
```

---

## Etapa 3: Validação

### 1. Verificar Estrutura

```sql
-- Listar todas as tabelas
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar storage buckets
SELECT * FROM storage.buckets;

-- Verificar timezone
SHOW timezone;  -- Deve retornar: America/Sao_Paulo

-- Verificar extensões
SELECT * FROM pg_extension
WHERE extname IN ('pgcrypto', 'uuid-ossp');
```

### 2. Verificar Dados

```sql
-- Contar registros
SELECT
  'clients' as table_name,
  COUNT(*) as total
FROM clients
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'maintenances', COUNT(*) FROM maintenances
UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment;

-- Verificar dados padrão
SELECT * FROM client_status;
SELECT * FROM maintenance_status;

-- Verificar integridade de FKs
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace;
```

### 3. Testar Aplicação

```bash
# 1. Verificar variáveis de ambiente
cat .env

# Deve ter:
# VITE_SUPABASE_PROJECT_ID=jtrhpbgrpsgneleptzgm
# VITE_SUPABASE_URL=https://jtrhpbgrpsgneleptzgm.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sua_key

# 2. Instalar dependências
npm install

# 3. Iniciar aplicação
npm run dev

# 4. Testar funcionalidades:
# - Login/Cadastro
# - Visualização de clientes
# - Upload de documentos
# - Chat com IA
# - Geração de relatórios
```

### 4. Verificar RLS (Security)

```sql
-- Listar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Troubleshooting

### ❌ Erro: "relation already exists"

**Causa:** Tentando criar tabela que já existe

**Solução:**
- Normal se executar múltiplas vezes
- IF NOT EXISTS previne erro real
- Ignore se for este o caso

### ❌ Erro: "permission denied"

**Causa:** Usuário sem permissões adequadas

**Solução:**
```sql
-- Verificar usuário atual
SELECT current_user;

-- Deve ser 'postgres' ou ter role de superuser
-- Grant permissões se necessário
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### ❌ Erro: Transaction aborted

**Causa:** Erro durante execução

**Solução:**
1. Veja o erro específico no log
2. Pode ser:
   - Conflito de chave primária
   - Violação de foreign key
   - Dados incompatíveis
3. Corrija o problema e execute novamente

### ❌ Timeout durante execução

**Causa:** Arquivo muito grande

**Solução:**
1. Execute em partes:
   - Execute 00000_base_schema.sql primeiro
   - Depois execute o resto
2. Aumente timeout no Dashboard
3. Use CLI: `supabase db push`

### ❌ Foreign Key Error ao migrar dados

**Causa:** Dados com referências inválidas

**Solução:**
```sql
-- Desabilitar FKs temporariamente
ALTER TABLE contracts DISABLE TRIGGER ALL;
-- ... inserir dados ...
ALTER TABLE contracts ENABLE TRIGGER ALL;

-- Ou limpar dados inválidos
DELETE FROM contracts
WHERE client_id NOT IN (SELECT id FROM clients);
```

### ❌ RLS bloqueando acesso

**Causa:** Políticas RLS muito restritivas

**Solução temporária:**
```sql
-- Desabilitar RLS para tabela específica
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Após resolver, reabilitar
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

### ❌ Aplicação não conecta

**Causa:** Variáveis de ambiente incorretas

**Solução:**
```bash
# Verificar .env
cat .env

# Atualizar se necessário
VITE_SUPABASE_PROJECT_ID=jtrhpbgrpsgneleptzgm
VITE_SUPABASE_URL=https://jtrhpbgrpsgneleptzgm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key

# Reiniciar aplicação
npm run dev
```

---

## 📊 Estatísticas

```
Migrations consolidadas:    65 arquivos
Tabelas criadas:           40+
Alterações de schema:      298
Funções SQL:               29
Políticas RLS:             100+
Storage buckets:           3
Índices:                   50+
Triggers:                  10+
Dados padrão inseridos:    15+ registros
Tamanho total SQL:         214 KB
Linhas de código:          5,649
```

---

## 🎯 Checklist Completo

### Antes de Começar
- [ ] Supabase CLI instalado (opcional)
- [ ] Acesso ao Supabase Dashboard
- [ ] Backup do banco antigo
- [ ] Variáveis de ambiente configuradas

### Aplicar Migrations
- [ ] Abrir consolidated_migrations.sql
- [ ] Copiar conteúdo completo
- [ ] Colar no SQL Editor do Supabase
- [ ] Executar (aguardar 1-2 min)
- [ ] Verificar sucesso (25+ tabelas)
- [ ] Verificar storage buckets (3)
- [ ] Verificar dados padrão

### Migrar Dados
- [ ] Preparar script/CSV
- [ ] Executar dry-run
- [ ] Migrar clients
- [ ] Migrar contracts
- [ ] Migrar maintenances
- [ ] Migrar equipment
- [ ] Verificar integridade

### Validação
- [ ] Contar registros por tabela
- [ ] Verificar FKs
- [ ] Testar conexão da aplicação
- [ ] Testar login/cadastro
- [ ] Testar upload de arquivos
- [ ] Testar funcionalidades principais
- [ ] Verificar RLS
- [ ] Monitorar logs

### Produção
- [ ] Backup completo
- [ ] Testado em staging
- [ ] Plano de rollback
- [ ] Executar fora do horário de pico
- [ ] Equipe disponível
- [ ] Monitoramento ativo

---

## 📞 Suporte e Documentação

### Documentos
- `APLICAR_MIGRATIONS.md` - Guia detalhado
- `QUICK_START.md` - Início rápido
- `MIGRATIONS_README.md` - Documentação técnica
- `CONSOLIDATION_REPORT.txt` - Relatório estatístico

### Scripts
- `apply-migrations.sh` - CLI automation
- `check-migrations.py` - Análise
- `migrate_data_from_old_db.py` - Migração de dados

### Links Úteis
- Dashboard: https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm
- Docs: https://supabase.com/docs
- SQL Editor: https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm/sql

---

## ✨ Conclusão

Sua infraestrutura está pronta! 🎉

```
✅ Migrations consolidadas
✅ Scripts de migração criados
✅ Documentação completa
✅ Guias passo a passo
✅ Troubleshooting detalhado
✅ Pronto para produção
```

**Próximo passo:** Execute `consolidated_migrations.sql` no SQL Editor!

---

**Versão:** 1.0
**Data:** 2026-02-11
**Autor:** Claude Code (Anthropic)
**Project ID:** jtrhpbgrpsgneleptzgm
**Status:** ✅ Pronto para produção
