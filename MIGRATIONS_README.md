# Luminus AI Hub - Consolidated Migrations

## 📋 Overview

Este arquivo documenta o processo de consolidação de todas as migrations do projeto Luminus AI Hub em um único arquivo SQL executável.

**Arquivo gerado:** `consolidated_migrations.sql`
**Data de geração:** 2026-02-11
**Total de migrations:** 65 (00000 até 00063)
**Tamanho do arquivo:** ~214 KB (~5,649 linhas)

## 🎯 Objetivo

Consolidar todas as migrations do projeto em um único arquivo SQL que pode ser executado diretamente no SQL Editor do Supabase Dashboard, facilitando:

- Deploy em novos ambientes
- Recriação do schema do zero
- Documentação completa da estrutura do banco
- Troubleshooting e debugging

## 📁 Estrutura do Arquivo

O arquivo consolidado possui a seguinte estrutura:

```
1. Cabeçalho com documentação
2. BEGIN transaction
3. Configurações iniciais (encoding, timezone, extensions)
4. Migrations sequenciais (00000 a 00063)
   - Cada migration claramente separada com comentários
   - Descrição e propósito de cada mudança
5. Mensagens de conclusão e verificação
6. COMMIT transaction
7. Queries de verificação (comentadas)
```

## 📝 Lista Completa de Migrations

### Core Schema (00000-00009)
1. `00000_base_schema.sql` - Schema base com todas as tabelas principais
2. `00001_add_client_name_to_contracts.sql` - Adiciona client_name em contracts
3. `00002_fix_chat_sessions_contract_id.sql` - Altera contract_id para TEXT
4. `00003_create_storage_buckets.sql` - Cria buckets de storage
5. `00004_add_missing_client_columns.sql` - Adiciona colunas faltantes em clients
6. `00005_add_contract_extraction_fields.sql` - Campos de extração de PDF
7. `00006_add_contract_document_fields.sql` - Campos de processamento
8. `00007_create_contract_analyses.sql` - Tabela de análises de contratos
9. `00008_add_cnpj_functions.sql` - Funções de validação de CNPJ
10. `00009_fix_storage_policies.sql` - Corrige políticas de storage

### Client & Status (00011-00014)
11. `00011_ensure_client_status.sql` - Melhora tabela client_status
12. `00012_add_missing_client_fields.sql` - Mais campos em clients
13. `00013_add_contract_type.sql` - Adiciona contract_type
14. `00014_make_generated_reports_user_id_nullable.sql` - user_id nullable

### Complete Schema (00015-00019)
15. `00015_complete_schema_fix.sql` - Fix completo do schema
16. `00016_add_missing_equipment_fields.sql` - Campos de equipamento
17. `00016_remove_not_null_constraints.sql` - Remove constraints NOT NULL
18. `00017_add_contract_documents_category.sql` - Categoria de documentos
19. `00018_complete_final_schema.sql` - Schema final completo
20. `00019_add_contract_documents_name.sql` - Campo name
21. `00019_add_csv_support_to_buckets.sql` - Suporte a CSV

### Maintenance & Relationships (00020-00027)
22. `00020_add_maintenance_end_time.sql` - Horário de término
23. `00021_add_client_user_relationship.sql` - Relacionamento multi-tenant
24. `00022_fix_client_users_rls.sql` - Corrige RLS client_users
25. `00023_debug_client_users_rls.sql` - Debug RLS
26. `00024_fix_contract_services_schema.sql` - Schema de serviços
27. `00025_fix_chat_sessions_agent_id.sql` - Corrige agent_id
28. `00026_fix_client_documents_upload_policy.sql` - Política de upload
29. `00026_set_default_timezone.sql` - Timezone America/Sao_Paulo
30. `00027_fix_client_documents_storage_rls.sql` - RLS de storage

### Contract Fields & Equipment (00029-00040)
31. `00029_add_all_missing_contract_fields.sql` - Todos campos faltantes
32. `00030_add_data_charts_to_generated_reports.sql` - Gráficos em reports
33. `00031_fix_status_tables_colors.sql` - Cores em status
34. `00032_add_equipment_year_condition.sql` - Ano e condição
35. `00033_normalize_equipment_data.sql` - Normaliza dados
36. `00034_add_equipment_power_voltage.sql` - Potência e voltagem
37. `00035_fix_client_users_rls.sql` - Mais fixes RLS
38. `00036_add_generated_reports_metadata.sql` - Metadados
39. `00037_fix_chat_sessions_rls.sql` - RLS chat
40. `00038_add_missing_generated_reports_columns.sql` - Colunas reports
41. `00039_fix_chat_sessions_rls_permissive.sql` - RLS permissivo
42. `00040_add_payment_terms_fix_services.sql` - Termos de pagamento

### RLS & Maintenance Checklist (00041-00051)
43. `00041_fix_chat_sessions_rls_anon.sql` - RLS anônimo
44. `00042_disable_chat_sessions_rls.sql` - Desabilita RLS chat
45. `00043_disable_rls_problematic_tables.sql` - Desabilita RLS problemático
46. `00044_add_contract_documents_missing_columns.sql` - Colunas faltantes
47. `00045_add_maintenance_checklist_is_required.sql` - Campo obrigatório
48. `00046_create_maintenance_checklist_templates.sql` - Templates
49. `00047_add_required_field_constraints.sql` - Constraints
50. `00048_fix_maintenance_checklist_schema.sql` - Fix schema
51. `00049_create_maintenance_checklist_meta.sql` - Metadados
52. `00050_add_neighborhood_number_fields.sql` - Bairro e número
53. `00051_maintenance_status_rules.sql` - Regras de status

### Final Features (00052-00063)
54. `00052_enable_pgcrypto_extension.sql` - Extensão crypto
55. `00053_fix_contract_documents_storage_rls.sql` - RLS storage
56. `00054_fix_storage_rls_for_anon.sql` - RLS anônimo
57. `00055_add_user_roles.sql` - Roles de usuário
58. `00056_add_is_active_to_profiles.sql` - is_active em profiles
59. `00057_backlog_recorrentes_report.sql` - Relatório backlog
60. `00058_create_regions_table.sql` - Tabela de regiões
61. `00059_contract_addendums.sql` - Aditivos contratuais
62. `00060_add_contract_value_column.sql` - Coluna contract_value
63. `00061_add_ai_fields_to_contract_documents.sql` - Campos AI
64. `00062_add_identity_validation_column.sql` - Validação identidade
65. `00063_remove_region_from_clients.sql` - Remove região de clients

## 🚀 Como Usar

### 1. Executar no Supabase Dashboard

```bash
# 1. Acesse o Supabase Dashboard
# 2. Navegue para: SQL Editor
# 3. Clique em "New Query"
# 4. Copie o conteúdo de consolidated_migrations.sql
# 5. Cole no editor
# 6. Clique em "Run" ou pressione Cmd/Ctrl + Enter
```

### 2. Monitorar a Execução

O script inclui mensagens de log que serão exibidas no console:

```
✅ Starting Luminus AI Hub consolidated migrations
📝 Timestamp: ...
...
✅ Migration completed successfully!
📊 Summary of changes
```

### 3. Verificar o Resultado

Após a execução, você pode descomentar e executar as queries de verificação no final do arquivo:

```sql
-- Listar todas as tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar políticas RLS
SELECT * FROM pg_policies ORDER BY tablename, policyname;

-- Verificar buckets de storage
SELECT * FROM storage.buckets;

-- Verificar dados de status
SELECT * FROM client_status ORDER BY name;
SELECT * FROM maintenance_status ORDER BY order_index;

-- Verificar timezone
SHOW timezone;
SELECT * FROM _timezone_config;
```

## ⚠️ Avisos Importantes

### Idempotência
- Todas as migrations usam `IF NOT EXISTS` ou `ADD COLUMN IF NOT EXISTS`
- O arquivo pode ser executado múltiplas vezes com segurança
- Operações são ignoradas se já foram executadas

### Transações
- Todo o script está envolto em BEGIN/COMMIT
- Se houver erro, toda a transação é revertida
- Garante consistência dos dados

### Ordem de Execução
- As migrations DEVEM ser executadas na ordem correta (00000 → 00063)
- O arquivo consolidado já está na ordem correta
- Não pule ou reordene migrations

### Conflitos
- Algumas migrations mais antigas podem ter sido supersedidas
- Campos podem ser adicionados múltiplas vezes (mas IF NOT EXISTS previne erros)
- RLS policies antigas são removidas antes de criar novas

## 🔧 Troubleshooting

### Erro: "relation already exists"
**Solução:** Normal, a tabela já existe. IF NOT EXISTS deve prevenir o erro.

### Erro: "column already exists"
**Solução:** Normal, a coluna já existe. IF NOT EXISTS deve prevenir o erro.

### Erro: "policy already exists"
**Solução:** As migrations sempre fazem DROP POLICY IF EXISTS antes de criar.

### Erro: "constraint violation"
**Solução:** Verifique se há dados existentes que violam a constraint. Limpe os dados antes.

### Erro de Foreign Key
**Solução:** Certifique-se de que as tabelas referenciadas existem primeiro.

## 📊 Estrutura de Dados

### Tabelas Principais

- **clients** - Informações de clientes
- **contracts** - Contratos e propostas
- **maintenances** - Ordens de serviço e manutenções
- **equipment** - Equipamentos vinculados aos contratos
- **contract_documents** - Documentos dos contratos
- **contract_analyses** - Análises de contratos geradas por IA
- **chat_sessions** - Sessões de chat com agentes
- **chat_messages** - Mensagens dos chats
- **generated_reports** - Relatórios gerados
- **profiles** - Perfis de usuários
- **client_users** - Relacionamento multi-tenant
- **regions** - Regiões de atendimento
- **contract_addendums** - Aditivos contratuais

### Tabelas de Suporte

- **client_status** - Status de clientes
- **maintenance_status** - Status de manutenções
- **maintenance_checklist** - Checklist de manutenção
- **maintenance_checklist_templates** - Templates de checklist
- **contract_services** - Serviços dos contratos
- **user_roles** - Roles de usuários

### Storage Buckets

- **contract-documents** - PDFs de contratos (SOMENTE PDF)
- **client-documents** - Documentos de clientes (todos tipos)
- **maintenance-documents** - Documentos de manutenções (todos tipos)

## 🛡️ Row Level Security (RLS)

O sistema usa RLS extensivamente para segurança:

- **Enabled tables:** client_status, clients, contracts, maintenances, etc.
- **Policies:** Baseadas em auth.uid() para isolar dados por usuário
- **Storage:** Buckets com RLS para controle de acesso a arquivos

## 🌍 Timezone

O banco está configurado para:
- **Timezone padrão:** America/Sao_Paulo (UTC-3)
- **Funções helper:** now_local(), to_local(), format_date_br()
- **Todas timestamps:** TIMESTAMP WITH TIME ZONE

## 📝 Notas Adicionais

1. **Backup:** Sempre faça backup antes de executar migrations em produção
2. **Testes:** Teste primeiro em ambiente de desenvolvimento/staging
3. **Monitoramento:** Monitore logs durante execução
4. **Documentação:** Mantenha este README atualizado com novas migrations

## 🔗 Arquivos Relacionados

- `consolidated_migrations.sql` - Arquivo principal de migrations
- `supabase/migrations/` - Diretório com migrations individuais
- `MIGRATIONS_README.md` - Este arquivo de documentação

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Revise a seção de Troubleshooting
3. Consulte a documentação das migrations individuais
4. Entre em contato com a equipe de desenvolvimento

---

**Gerado em:** 2026-02-11
**Versão:** 1.0
**Autor:** Claude Code (Anthropic)
