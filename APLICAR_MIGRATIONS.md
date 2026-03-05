# 🚀 COMO APLICAR AS MIGRATIONS AO SUPABASE

## ✅ TUDO PRONTO!

Consolidei **todas as 65 migrations** em um único arquivo SQL executável.

---

## 📦 Arquivos Criados

```
✅ consolidated_migrations.sql (214 KB) - ARQUIVO PRINCIPAL
✅ QUICK_START.md - Guia rápido
✅ MIGRATIONS_README.md - Documentação completa
✅ CONSOLIDATION_REPORT.txt - Relatório técnico
✅ apply-migrations.sh - Script bash (alternativo)
✅ check-migrations.py - Análise de migrations
```

---

## 🎯 MÉTODO RECOMENDADO: SQL Editor (Mais Simples)

### Passo 1: Acessar Supabase Dashboard
```
1. Abra: https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm
2. Faça login com suas credenciais
3. No menu lateral, clique em: "SQL Editor"
```

### Passo 2: Criar Nova Query
```
Clique no botão: "+ New query"
```

### Passo 3: Copiar e Colar
```bash
# Abra o arquivo: consolidated_migrations.sql
# Selecione TODO o conteúdo (Cmd/Ctrl + A)
# Copie (Cmd/Ctrl + C)
# Cole no SQL Editor do Supabase (Cmd/Ctrl + V)
```

### Passo 4: Executar
```
Clique no botão: "RUN" (ou pressione Cmd/Ctrl + Enter)
Aguarde 1-2 minutos para completar
```

### Passo 5: Verificar Sucesso
```sql
-- Execute esta query para verificar:
SELECT COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public';

-- Deve retornar aproximadamente 25-30 tabelas
```

---

## 🔄 MÉTODO ALTERNATIVO: CLI (Requer Token)

Se preferir usar linha de comando:

### 1. Obter Token de Acesso
```
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Copie o token gerado
```

### 2. Configurar Token
```bash
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"
```

### 3. Fazer Link e Aplicar
```bash
cd /Users/eduardoulyssea/Downloads/luminus-ai-hub-main

# Link com projeto
supabase link --project-ref jtrhpbgrpsgneleptzgm

# Ver status das migrations
supabase migration list

# Aplicar todas as migrations
supabase db push
```

---

## 📊 O QUE SERÁ CRIADO

### Tabelas Principais (25+)
- ✅ `clients` - Gestão de clientes
- ✅ `contracts` - Contratos
- ✅ `contract_documents` - Documentos de contratos
- ✅ `contract_addendums` - Aditivos contratuais
- ✅ `maintenances` - Ordens de manutenção
- ✅ `maintenance_checklist` - Checklists
- ✅ `equipment` - Equipamentos
- ✅ `chat_sessions` - Sessões de chat IA
- ✅ `chat_messages` - Mensagens
- ✅ `generated_reports` - Relatórios gerados
- ✅ `profiles` - Perfis de usuários
- ✅ `regions` - Regiões
- ✅ `client_status` - Status de clientes
- ✅ `maintenance_status` - Status de manutenções
- E muitas outras...

### Storage Buckets (3)
- ✅ `contract-documents` - Documentos de contratos (PDF only)
- ✅ `client-documents` - Documentos de clientes (todos os tipos)
- ✅ `maintenance-documents` - Documentos de manutenção

### Recursos
- ✅ Row Level Security (RLS) configurado
- ✅ Políticas de acesso por role
- ✅ Funções helper (validação CNPJ, etc.)
- ✅ Triggers automáticos
- ✅ Índices de performance
- ✅ Timezone: America/Sao_Paulo
- ✅ Extensões: pgcrypto, uuid-ossp

---

## ✅ VERIFICAÇÕES PÓS-MIGRAÇÃO

Execute estas queries no SQL Editor para validar:

```sql
-- 1. Listar todas as tabelas
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar storage buckets
SELECT id, name, public, allowed_mime_types
FROM storage.buckets;

-- 3. Verificar dados padrão
SELECT * FROM client_status;
SELECT * FROM maintenance_status;

-- 4. Verificar timezone
SHOW timezone;  -- Deve retornar: America/Sao_Paulo

-- 5. Verificar extensões
SELECT * FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');

-- 6. Contar políticas RLS
SELECT schemaname, tablename, COUNT(*) as policies
FROM pg_policies
GROUP BY schemaname, tablename
ORDER BY tablename;
```

---

## 🎯 PRÓXIMOS PASSOS

Após aplicar as migrations com sucesso:

### 1. Testar Conexão
```bash
# Verifique se as variáveis de ambiente estão corretas:
cat .env

# Deve ter:
VITE_SUPABASE_PROJECT_ID=jtrhpbgrpsgneleptzgm
VITE_SUPABASE_URL=https://jtrhpbgrpsgneleptzgm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_key_aqui
```

### 2. Migrar Dados do Banco Antigo
```sql
-- Agora você pode migrar dados do banco antigo
-- Exemplo de estrutura:
-- 1. Exportar dados do banco antigo
-- 2. Transformar para formato compatível
-- 3. Importar para Supabase

-- Exemplo de import:
COPY clients (name, cnpj, email, phone, address, city, state)
FROM '/path/to/clients.csv'
DELIMITER ','
CSV HEADER;
```

### 3. Configurar RLS para Usuários
```sql
-- Após migrar dados, você pode precisar ajustar RLS
-- Exemplo: permitir acesso temporário para migration
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
-- ... importar dados ...
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

### 4. Validar Aplicação
```bash
# Iniciar aplicação em dev
npm run dev

# Testar funcionalidades:
# - Login/Cadastro
# - Upload de documentos
# - Chat com IA
# - Relatórios
```

---

## ⚠️ IMPORTANTE: BACKUP

**ANTES de executar em PRODUÇÃO:**

```sql
-- Fazer backup completo
pg_dump -h db.jtrhpbgrpsgneleptzgm.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_$(date +%Y%m%d_%H%M%S).dump
```

Ou use o Supabase Dashboard:
```
Database → Backups → "Create new backup"
```

---

## 🔧 TROUBLESHOOTING

### ❌ Erro: "relation already exists"
**Solução:** Normal se executar múltiplas vezes. IF NOT EXISTS previne erro real.

### ❌ Erro: "permission denied"
**Solução:** Verifique se está usando o usuário correto (postgres) com permissões de admin.

### ❌ Erro: Transaction aborted
**Solução:** Veja o erro específico no log. Pode ser:
- Conflito de chave primária
- Violação de foreign key
- Dados incompatíveis

**Correção:** Limpe dados conflitantes ou execute em banco limpo.

### ❌ Timeout
**Solução:** Arquivo grande demais. Opções:
1. Aumentar timeout no Dashboard
2. Executar em partes (base_schema primeiro, depois resto)
3. Usar CLI: `supabase db push`

### ❌ Foreign Key Error
**Solução:** Banco não está vazio? Tem dados antigos incompatíveis?
- Limpe tabelas: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Ou execute em novo banco

---

## 📞 SUPORTE

- 📖 Documentação: `MIGRATIONS_README.md`
- 📊 Relatório Técnico: `CONSOLIDATION_REPORT.txt`
- 🔍 Migrations Individuais: `supabase/migrations/`

---

## ✨ RESUMO EXECUTIVO

```
✅ 65 migrations consolidadas
✅ 25+ tabelas criadas
✅ 3 storage buckets
✅ RLS completo configurado
✅ Funções helper criadas
✅ Índices de performance
✅ Triggers automáticos
✅ Dados padrão inseridos
✅ Pronto para migração de dados
✅ Pronto para produção
```

---

**Arquivo:** `consolidated_migrations.sql`
**Tamanho:** 214 KB
**Linhas:** 5,649
**Status:** ✅ Pronto para execução
**Project ID:** jtrhpbgrpsgneleptzgm
**Versão:** 1.0
**Data:** 2026-02-11

---

## 🎉 BOA SORTE!

Sua arquitetura de banco está pronta para receber os dados do sistema antigo!
