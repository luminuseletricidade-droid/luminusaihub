# Database Migrations

Este diretório contém as migrations SQL do banco de dados PostgreSQL (Railway).

## 🚀 Quick Start

### Executar Migrations

```bash
cd backend
python3 migrate.py migrate
```

### Criar Nova Migration

```bash
cd backend
python3 create_migration.py add_new_feature
# Edite o arquivo criado
# Execute: python3 migrate.py migrate
```

### Ver Status

```bash
cd backend
python3 migrate.py status
```

## 📋 Migrations Disponíveis

### v0 - Schema Base
- `v0_initial_schema.sql` - **Schema inicial completo com todas as tabelas**
  - Tabelas: clients, contracts, maintenances, ai_agents, chat_sessions, chat_messages, generated_reports, document_analysis, maintenance_status
  - Índices otimizados
  - Triggers de updated_at
  - Status padrão de manutenção

### Próximas Migrations
As próximas migrations seguirão o padrão: `00001_descricao.sql`, `00002_descricao.sql`, etc.

## 📁 Estrutura

```
migrations/
├── v0_initial_schema.sql      # Schema base (versão 0)
├── 00001_*.sql                # Primeira mudança após v0
├── 00002_*.sql                # Segunda mudança
└── _old_migrations/           # Backup de migrations antigas
```

## 📖 Documentação Completa

Veja [MIGRATIONS.md](../../MIGRATIONS.md) na raiz do projeto para guia completo.

## ⚠️ Regras Importantes

1. **NUNCA** edite `v0_initial_schema.sql` após executar em produção
2. **SEMPRE** use `IF NOT EXISTS` / `IF EXISTS` nas migrations
3. **TESTE** localmente antes de fazer deploy
4. **DOCUMENTE** mudanças complexas com comentários
5. **INCREMENTE** o número sequencial (00001, 00002, etc)

## 🔄 Workflow

1. **Criar migration**: `python3 backend/create_migration.py minha_mudanca`
2. **Editar SQL**: Adicione suas mudanças no arquivo criado
3. **Testar local**: `python3 backend/migrate.py migrate`
4. **Verificar**: `python3 backend/migrate.py status`
5. **Commit**: `git add supabase/migrations/00XXX_*.sql && git commit`
6. **Deploy**: Railway executará automaticamente

## 📊 Tabelas do Schema v0

| Tabela | Descrição |
|--------|-----------|
| `clients` | Clientes/empresas |
| `contracts` | Contratos de manutenção |
| `maintenances` | Registros de manutenções |
| `maintenance_status` | Status predefinidos |
| `ai_agents` | Configurações de agentes IA |
| `chat_sessions` | Sessões de chat |
| `chat_messages` | Mensagens do chat |
| `generated_reports` | Relatórios gerados por IA |
| `document_analysis` | Análises de documentos |
