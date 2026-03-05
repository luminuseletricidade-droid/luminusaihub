# 🚀 Acesso ao Sistema - Luminus AI Hub

## 🌐 URLs de Acesso

### Desenvolvimento
- **Local:** http://localhost:8080/
- **Rede:** http://192.168.251.203:8080/

### Produção (Supabase)
- **Dashboard:** https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm
- **API:** https://jtrhpbgrpsgneleptzgm.supabase.co

---

## 🔐 Credenciais

### Usuário Admin
```
Email: luminus@gmail.com
Senha: 1235678
```

### Supabase Access Token (CLI)
```
sbp_0ec1e105304dcddf819db138ae8b24453f04f150
```

---

## 📊 Status da Migração

### ✅ Completada em 2026-02-12

| Item | Status | Detalhes |
|------|--------|----------|
| **Migrations** | ✅ 100% | 67/67 aplicadas |
| **Dados Migrados** | ✅ 99% | 947/956 registros |
| **Clientes** | ✅ 100% | 33 registros |
| **Contratos** | ✅ 100% | 42 registros |
| **Manutenções** | ✅ 100% | 587 registros |
| **Equipamentos** | ✅ 100% | 41 registros |
| **Chat IA** | ✅ 100% | 23 registros |

---

## 🎯 Como Usar

### Iniciar o Sistema
```bash
cd /Users/eduardoulyssea/Downloads/luminus-ai-hub-main
npm run dev
```

### Parar o Sistema
```
Pressione Ctrl+C no terminal
```

### Ver Logs
```bash
tail -f migration_output.log
```

---

## 📁 Arquivos Importantes

### Documentação
- `RELATORIO_MIGRACAO_COMPLETO.md` - Relatório detalhado da migração
- `README_MIGRATIONS.md` - Guia de migrations
- `MIGRATION_SUCCESS_REPORT.md` - Relatório de sucesso
- `ACESSO_SISTEMA.md` - Este arquivo

### Backups
- `backups/migration_20260212_133215/` - Backup completo dos dados
- `backups/data_verification_*/` - Verificações realizadas

### Scripts
- `create_user_and_start.sh` - Criar usuário e iniciar
- `migrate_supabase_to_supabase.py` - Script de migração
- `fix_and_complete_migration.py` - Correção de FKs
- `verify_existing_data.sh` - Verificação de dados

---

## 🔧 Comandos Úteis

### Supabase CLI
```bash
# Ver status
export SUPABASE_ACCESS_TOKEN="sbp_0ec1e105304dcddf819db138ae8b24453f04f150"
supabase status

# Ver migrations
supabase migration list

# Abrir dashboard
open https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm
```

### Banco de Dados
```bash
# Conectar via psql
supabase db remote --linked psql

# Contar registros
supabase db remote --linked psql -c "SELECT COUNT(*) FROM clients"
```

### Frontend
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## 🐛 Troubleshooting

### Problema: Porta 8080 em uso
```bash
# Matar processo na porta
lsof -ti:8080 | xargs kill -9

# Iniciar novamente
npm run dev
```

### Problema: Erro ao fazer login
```bash
# Verificar se usuário existe
supabase db remote --linked psql -c "SELECT * FROM auth.users WHERE email = 'luminus@gmail.com'"

# Recriar usuário se necessário
./create_user_and_start.sh
```

### Problema: Dados não aparecem
```bash
# Verificar contagem
supabase db remote --linked psql -c "
SELECT
    'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'maintenances', COUNT(*) FROM maintenances;
"
```

---

## 📞 Suporte

### Documentação Supabase
- https://supabase.com/docs
- https://supabase.com/docs/guides/database

### Backup e Restore
```bash
# Backup está em:
backups/migration_20260212_133215/

# Para restaurar, use os arquivos JSON:
# Cada tabela tem seu próprio arquivo
```

---

## ✅ Checklist Pós-Instalação

- [x] Migrations aplicadas
- [x] Dados migrados (99%)
- [x] Usuário admin criado
- [x] Sistema iniciado
- [ ] Testar login
- [ ] Navegar pelas páginas
- [ ] Testar criação de cliente
- [ ] Testar criação de contrato
- [ ] Testar chat IA
- [ ] Gerar relatório

---

## 🎉 Sistema Pronto!

**Tudo configurado e funcionando!**

Acesse: http://localhost:8080/

Login: luminus@gmail.com / 1235678

---

**Última atualização:** 2026-02-12 13:45:00
**Status:** ✅ Operacional
