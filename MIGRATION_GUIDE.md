# Guia de Aplicação de Migrations - Supabase

## Estado Atual
- **Project ID**: asdvxynilrurillrhsyj
- **Total de Migrations**: 67 arquivos
- **Range**: 00000_base_schema.sql até 00063_remove_region_from_clients.sql

## Pré-requisitos

1. Supabase CLI instalado:
```bash
brew install supabase/tap/supabase
```

2. Login no Supabase:
```bash
supabase login
```

## Opção 1: Aplicar Migrations ao Banco Remoto (Recomendado)

### Passo 1: Link com o projeto remoto
```bash
supabase link --project-ref asdvxynilrurillrhsyj
```

### Passo 2: Verificar status das migrations
```bash
supabase migration list
```

### Passo 3: Aplicar todas as migrations pendentes
```bash
supabase db push
```

Este comando:
- Lê todos os arquivos em `supabase/migrations/`
- Compara com as migrations já aplicadas no banco remoto
- Aplica apenas as migrations pendentes em ordem

## Opção 2: Aplicar Migrations Localmente (Para Testes)

### Passo 1: Iniciar Supabase local
```bash
supabase start
```

### Passo 2: As migrations são aplicadas automaticamente
O Supabase local aplica automaticamente todas as migrations ao iniciar.

### Passo 3: Verificar status
```bash
supabase status
```

## Opção 3: Criar Nova Migration

Se precisar criar novas migrations:

```bash
supabase migration new nome_da_migration
```

Isso criará um novo arquivo em `supabase/migrations/` com timestamp.

## Estrutura das Migrations Atuais

### Base Schema (00000)
- Cria todas as tabelas fundamentais: clients, contracts, maintenances, etc.
- Insere dados default (status, etc.)
- Cria funções utilitárias

### Migrations Incrementais (00001-00063)
- Adições de campos
- Correções de RLS (Row Level Security)
- Melhorias de schema
- Novos relacionamentos

### Migrations Manuais (pasta manual/)
- Correções pontuais
- Fixes de storage
- Ajustes de RLS

## Troubleshooting

### Se houver erro de "migration já aplicada":
```bash
supabase migration repair --status applied <version>
```

### Para reverter última migration:
```bash
supabase migration repair --status reverted <version>
```

### Limpar migrations locais e reiniciar:
```bash
supabase db reset
```

## Boas Práticas

1. **Sempre faça backup antes de aplicar migrations em produção**
2. **Teste localmente primeiro**: Use `supabase start` para testar
3. **Verifique dependências**: Certifique-se que migrations estão em ordem correta
4. **Use transações**: Migrations SQL devem ser transacionais quando possível
5. **Documente**: Adicione comentários nas migrations complexas

## Verificação Pós-Migration

Após aplicar as migrations, verifique:

```sql
-- Ver tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Ver migrations aplicadas
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;
```

## Comandos Úteis

```bash
# Ver status do projeto
supabase status

# Ver logs
supabase logs

# Abrir Studio local
supabase studio

# Parar Supabase local
supabase stop

# Reset completo (cuidado!)
supabase db reset
```

## Próximos Passos

1. Execute `supabase link --project-ref asdvxynilrurillrhsyj`
2. Verifique as migrations pendentes com `supabase migration list`
3. Aplique com `supabase db push`
4. Verifique no Dashboard do Supabase se tudo foi aplicado corretamente
