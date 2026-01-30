# Scripts Directory

Esta pasta contém scripts organizados por categoria para manutenção e operação do backend.

## Estrutura

### 📁 database/
Scripts relacionados a banco de dados e migrações:
- `apply_migration.py` - Aplicar migrações do banco
- `create_chat_tables.py` - Criar tabelas de chat
- `create_test_data.py` - Criar dados de teste
- `disable_rls.py` - Desabilitar Row Level Security

### 📁 testing/
Scripts para testes e verificação:
- `check_ai_agents.py` - Verificar agentes de IA
- `check_contracts.py` - Verificar contratos
- `check_table_structure.py` - Verificar estrutura das tabelas
- `test_extraction.py` - Testar extração de PDFs
- `test_server.py` - Testar servidor
- `test_system.py` - Testar sistema completo

### 📁 maintenance/
Scripts de manutenção e correção:
- `clean_system.py` - Limpar sistema
- `fix_all_user_data.py` - Corrigir dados de usuários
- `fix_contracts_user.py` - Corrigir contratos de usuários
- `fix_generated_reports.py` - Corrigir relatórios gerados
- `fix_user_data.py` - Corrigir dados específicos de usuário
- `force_reset.py` - Reset forçado do sistema
- `reset_test_data.py` - Reset de dados de teste

### 📁 utilities/
Scripts utilitários e de inicialização:
- `install_and_run.py` - Instalar dependências e executar
- `quick_start.py` - Início rápido
- `start.py` - Script de inicialização principal
- `start_server.py` - Iniciar servidor

## Como usar

Execute os scripts a partir do diretório raiz do backend:

```bash
# Exemplo
cd backend
python scripts/database/create_test_data.py
python scripts/testing/test_system.py
python scripts/maintenance/clean_system.py
```

## Nota

Todos os scripts foram movidos do diretório raiz para melhor organização e manutenção do código.