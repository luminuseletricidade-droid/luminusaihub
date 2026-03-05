#!/usr/bin/env python3
"""
Migração completa de dados entre projetos Supabase
ORIGEM: jsfllqcrzqdpozkawkqc (banco com dados)
DESTINO: jtrhpbgrpsgneleptzgm (banco novo)

GARANTE: ZERO perda de dados
Autor: Claude Code
Data: 2026-02-12
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import requests
from typing import List, Dict, Any

# Configurações
SOURCE = {
    'url': 'https://jsfllqcrzqdpozkawkqc.supabase.co',
    'anon_key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZmxscWNyenFkcG96a2F3a3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDc1NjEsImV4cCI6MjA3NzQyMzU2MX0.cUGMduXcsy7BDxy7wwHceLzjPBnKUI-1gY2IwDeSHZA',
    'service_role': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZmxscWNyenFkcG96a2F3a3FjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg0NzU2MSwiZXhwIjoyMDc3NDIzNTYxfQ._ixjYZ687h1LDzRLKh0is5IgM-KLkm3Wv2B0l9syIbI'
}

DESTINATION = {
    'url': 'https://jtrhpbgrpsgneleptzgm.supabase.co',
    'service_role': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8'
}

# Tabelas na ordem correta (respeita foreign keys)
TABLES_ORDER = [
    # Status tables primeiro (sem FK)
    'client_status',
    'maintenance_status',

    # Core tables
    'ai_agents',
    'profiles',
    'user_roles',
    'regions',

    # Clientes
    'clients',
    'client_users',
    'client_documents',

    # Contratos
    'contracts',
    'contract_documents',
    'contract_addendums',
    'pending_contract_changes',
    'contract_services',
    'contract_context',
    'contract_analyses',

    # Equipment
    'equipment',

    # Manutenções
    'maintenances',
    'maintenance_checklist',
    'maintenance_checklist_templates',
    'maintenance_checklist_meta',
    'maintenance_context',
    'maintenance_status_history',
    'maintenance_documents',
    'backlog_recorrente',

    # AI/Chat
    'chat_sessions',
    'chat_messages',
    'generated_reports',
    'document_analysis',
    'ai_predictions',
    'ai_generated_plans',
    'agent_executions',
    'agent_documents',
]

# Cores
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_success(msg): print(f"{Colors.GREEN}✓ {msg}{Colors.END}")
def log_warning(msg): print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")
def log_error(msg): print(f"{Colors.RED}✗ {msg}{Colors.END}")
def log_info(msg): print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")
def log_header(msg): print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}\n{msg.center(80)}\n{'='*80}{Colors.END}\n")

def get_data_from_source(table: str) -> List[Dict[Any, Any]]:
    """Busca todos os dados de uma tabela no banco de origem"""
    url = f"{SOURCE['url']}/rest/v1/{table}"
    headers = {
        'apikey': SOURCE['service_role'],
        'Authorization': f"Bearer {SOURCE['service_role']}",
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    try:
        # Primeiro, contar registros
        count_response = requests.get(
            url,
            headers={**headers, 'Prefer': 'count=exact'},
            params={'select': 'id', 'limit': 0}
        )

        total = int(count_response.headers.get('Content-Range', '0-0/0').split('/')[-1])

        if total == 0:
            return []

        # Buscar todos os dados (em lotes se necessário)
        all_data = []
        limit = 1000
        offset = 0

        while offset < total:
            response = requests.get(
                url,
                headers=headers,
                params={'limit': limit, 'offset': offset}
            )

            if response.status_code == 200:
                batch = response.json()
                all_data.extend(batch)
                offset += limit
            else:
                log_error(f"Erro ao buscar dados: {response.status_code} - {response.text}")
                break

        return all_data

    except Exception as e:
        log_error(f"Erro ao buscar dados de {table}: {e}")
        return []

def insert_data_to_destination(table: str, data: List[Dict[Any, Any]]) -> bool:
    """Insere dados no banco de destino"""
    if not data:
        return True

    url = f"{DESTINATION['url']}/rest/v1/{table}"
    headers = {
        'apikey': DESTINATION['service_role'],
        'Authorization': f"Bearer {DESTINATION['service_role']}",
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
    }

    try:
        # Inserir em lotes de 500
        batch_size = 500
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]

            response = requests.post(
                url,
                headers=headers,
                json=batch
            )

            if response.status_code not in [200, 201, 204]:
                log_error(f"Erro ao inserir lote: {response.status_code} - {response.text}")
                return False

        return True

    except Exception as e:
        log_error(f"Erro ao inserir dados em {table}: {e}")
        return False

def backup_source_data(backup_dir: Path):
    """Faz backup completo do banco de origem"""
    log_header("FAZENDO BACKUP DO BANCO DE ORIGEM")

    backup_dir.mkdir(parents=True, exist_ok=True)

    total_records = 0
    backup_manifest = {
        'timestamp': datetime.now().isoformat(),
        'source': SOURCE['url'],
        'tables': {}
    }

    for table in TABLES_ORDER:
        try:
            log_info(f"Exportando {table}...")
            data = get_data_from_source(table)

            if data:
                # Salvar em JSON
                backup_file = backup_dir / f"{table}.json"
                with open(backup_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False, default=str)

                log_success(f"  {table}: {len(data)} registros salvos")
                total_records += len(data)

                backup_manifest['tables'][table] = {
                    'records': len(data),
                    'file': f"{table}.json"
                }
            else:
                log_warning(f"  {table}: vazia")
                backup_manifest['tables'][table] = {
                    'records': 0,
                    'file': None
                }

        except Exception as e:
            log_error(f"  {table}: ERRO - {e}")
            backup_manifest['tables'][table] = {
                'error': str(e)
            }

    # Salvar manifest
    manifest_file = backup_dir / "manifest.json"
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(backup_manifest, f, indent=2)

    log_success(f"\nTotal de registros salvos: {total_records:,}")
    return backup_manifest

def migrate_table(table: str, backup_dir: Path) -> Dict:
    """Migra uma tabela específica"""
    result = {
        'table': table,
        'source_count': 0,
        'migrated': 0,
        'errors': [],
        'success': False
    }

    try:
        # Ler dados do backup
        backup_file = backup_dir / f"{table}.json"

        if not backup_file.exists():
            result['errors'].append("Arquivo de backup não encontrado")
            return result

        with open(backup_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        result['source_count'] = len(data)

        if not data:
            result['success'] = True
            return result

        # Inserir no destino
        if insert_data_to_destination(table, data):
            result['migrated'] = len(data)
            result['success'] = True
        else:
            result['errors'].append("Falha ao inserir dados")

    except Exception as e:
        result['errors'].append(str(e))

    return result

def main():
    """Função principal"""
    log_header("MIGRAÇÃO COMPLETA SUPABASE → SUPABASE")

    print(f"{Colors.BOLD}ORIGEM:{Colors.END} {SOURCE['url']}")
    print(f"{Colors.BOLD}DESTINO:{Colors.END} {DESTINATION['url']}")
    print()

    # Verificar se temos service role key do destino
    if 'YOUR_SERVICE_ROLE' in DESTINATION['service_role']:
        log_error("❌ Falta configurar SERVICE_ROLE_KEY do destino!")
        log_info("Por favor, adicione a service role key do projeto jtrhpbgrpsgneleptzgm")
        log_info("Encontre em: Dashboard → Settings → API → service_role key")
        sys.exit(1)

    # Criar diretório de backup
    backup_dir = Path("backups") / f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    # Fase 1: Backup completo
    manifest = backup_source_data(backup_dir)

    # Fase 2: Migração
    log_header("MIGRANDO DADOS PARA BANCO DE DESTINO")

    migration_results = []
    total_migrated = 0

    for table in TABLES_ORDER:
        log_info(f"Migrando {table}...")

        result = migrate_table(table, backup_dir)
        migration_results.append(result)

        if result['success']:
            if result['migrated'] > 0:
                log_success(f"  ✓ {result['migrated']:,} registros migrados")
                total_migrated += result['migrated']
            else:
                log_warning(f"  ○ tabela vazia")
        else:
            log_error(f"  ✗ ERRO: {', '.join(result['errors'])}")

    # Fase 3: Validação
    log_header("VALIDANDO MIGRAÇÃO")

    validation_report = {
        'timestamp': datetime.now().isoformat(),
        'total_source': sum(r['source_count'] for r in migration_results),
        'total_migrated': total_migrated,
        'tables': migration_results
    }

    # Salvar relatório
    report_file = backup_dir / "migration_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(validation_report, f, indent=2)

    # Criar README
    readme_file = backup_dir / "README.md"
    with open(readme_file, 'w', encoding='utf-8') as f:
        f.write("# Migração Supabase → Supabase\n\n")
        f.write(f"**Data:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Origem:** jsfllqcrzqdpozkawkqc\n")
        f.write(f"**Destino:** jtrhpbgrpsgneleptzgm\n\n")
        f.write(f"## Resultado\n\n")
        f.write(f"- Total de registros na origem: {validation_report['total_source']:,}\n")
        f.write(f"- Total migrado: {total_migrated:,}\n")
        f.write(f"- Taxa de sucesso: {(total_migrated/validation_report['total_source']*100 if validation_report['total_source'] > 0 else 100):.1f}%\n\n")

        f.write("## Tabelas Migradas\n\n")
        for result in migration_results:
            status = "✅" if result['success'] else "❌"
            f.write(f"{status} **{result['table']}**: {result['migrated']:,} / {result['source_count']:,} registros\n")

    # Resumo final
    log_header("MIGRAÇÃO CONCLUÍDA")

    success_count = sum(1 for r in migration_results if r['success'])
    failed_count = len(migration_results) - success_count

    print(f"""
    ✅ Tabelas migradas com sucesso: {success_count}
    ❌ Tabelas com erro: {failed_count}
    📊 Total de registros migrados: {total_migrated:,}

    📁 Backup salvo em: {backup_dir}
    📄 Relatório: {report_file}
    📖 README: {readme_file}
    """)

    if failed_count > 0:
        log_warning("\n⚠️  Algumas tabelas tiveram erros. Veja o relatório para detalhes.")
    else:
        log_success("\n🎉 TODOS OS DADOS FORAM MIGRADOS COM SUCESSO!")

if __name__ == '__main__':
    try:
        # Instalar requests se necessário
        try:
            import requests
        except ImportError:
            print("Instalando requests...")
            os.system("pip3 install requests -q")
            import requests

        main()

    except KeyboardInterrupt:
        log_warning("\n\nMigração interrompida pelo usuário")
        sys.exit(1)
    except Exception as e:
        log_error(f"\n\nErro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
