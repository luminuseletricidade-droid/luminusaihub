# Quick Start - Consolidated Migrations

## TL;DR - Execução Rápida

```bash
# 1. Abra Supabase Dashboard
# 2. Navegue: SQL Editor → New Query
# 3. Copie TODO o conteúdo de: consolidated_migrations.sql
# 4. Cole no editor
# 5. Execute (Cmd/Ctrl + Enter)
# 6. Aguarde ~1-2 minutos
# 7. Verifique logs para sucesso ✅
```

## O que você precisa saber

### Arquivo Principal
- **Nome:** `consolidated_migrations.sql`
- **Tamanho:** 214 KB (5,649 linhas)
- **Conteúdo:** 65 migrations (00000 até 00063)
- **Status:** Pronto para execução

### Segurança
- ✅ **Idempotente** - Pode executar múltiplas vezes
- ✅ **Transacional** - BEGIN/COMMIT (tudo ou nada)
- ✅ **Seguro** - IF NOT EXISTS previne erros
- ✅ **Testado** - Migrations já validadas individualmente

### O que será criado
- 25+ tabelas (clients, contracts, maintenances, etc.)
- 3 storage buckets (documentos)
- Dezenas de políticas RLS (segurança)
- Funções helper (CNPJ, timezone, etc.)
- Índices de performance
- Triggers automáticos
- Dados padrão (status, etc.)

## Passo a Passo Detalhado

### 1. Abrir Supabase
```
https://app.supabase.com/
→ Selecione seu projeto
→ Menu lateral: SQL Editor
```

### 2. Nova Query
```
Clique em: "New Query"
ou
Pressione: Cmd/Ctrl + N
```

### 3. Copiar Arquivo
```bash
# Abra: consolidated_migrations.sql
# Selecione tudo: Cmd/Ctrl + A
# Copie: Cmd/Ctrl + C
```

### 4. Colar no Editor
```
# Cole no SQL Editor: Cmd/Ctrl + V
# Verifique se copiou TUDO (5,649 linhas)
# Primeira linha deve ser: -- ====...LUMINUS AI HUB...
# Última linha deve ser: -- END OF FILE
```

### 5. Executar
```
Clique em: "Run"
ou
Pressione: Cmd/Ctrl + Enter
```

### 6. Aguardar
```
Tempo estimado: 1-2 minutos
Não feche a janela durante execução
Acompanhe os logs na parte inferior
```

### 7. Verificar Sucesso
```sql
-- Procure por estas mensagens no log:
-- ✅ Starting Luminus AI Hub consolidated migrations
-- ✅ Migration completed successfully!

-- Execute esta query para confirmar:
SELECT COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public';

-- Deve retornar ~25+ tabelas
```

## Verificação Rápida

Execute estas queries após a migração:

```sql
-- Tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Storage buckets
SELECT * FROM storage.buckets;

-- Status padrão
SELECT * FROM client_status;
SELECT * FROM maintenance_status;

-- Timezone configurado
SHOW timezone;  -- Deve retornar: America/Sao_Paulo
```

## Troubleshooting Rápido

### Erro: "relation already exists"
**Normal.** IF NOT EXISTS previne erro real. Continue.

### Erro: Transaction aborted
**Problema.** Veja o erro específico no log. Corrija e execute novamente.

### Nada acontece
**Timeout?** Arquivo muito grande? Execute em partes ou aumente timeout.

### Erro de Foreign Key
**Banco não vazio?** Limpe dados incompatíveis ou execute em banco novo.

## Arquivos de Documentação

- `QUICK_START.md` - Este arquivo (início rápido)
- `MIGRATIONS_README.md` - Documentação completa (11 KB)
- `CONSOLIDATION_REPORT.txt` - Relatório detalhado (15 KB)
- `consolidated_migrations.sql` - Arquivo SQL (214 KB)

## Próximos Passos

Após executar as migrations:

1. ✅ Verifique que todas as tabelas foram criadas
2. ✅ Teste a conexão da aplicação
3. ✅ Valide RLS policies (segurança)
4. ✅ Teste upload de arquivos (storage)
5. ✅ Configure variáveis de ambiente
6. ✅ Execute testes da aplicação

## Suporte

- 📖 Leia `MIGRATIONS_README.md` para detalhes
- 📊 Veja `CONSOLIDATION_REPORT.txt` para estatísticas
- 🔍 Examine migrations individuais em `supabase/migrations/`
- 💬 Entre em contato com a equipe de desenvolvimento

## Checklist de Execução

Antes de executar em PRODUÇÃO:

- [ ] Backup do banco de dados completo
- [ ] Testado em desenvolvimento/staging
- [ ] Revisão das migrations críticas
- [ ] Plano de rollback preparado
- [ ] Executar fora do horário de pico
- [ ] Equipe de suporte disponível
- [ ] Monitoramento ativo

---

**Versão:** 1.0
**Data:** 2026-02-11
**Autor:** Claude Code (Anthropic)
