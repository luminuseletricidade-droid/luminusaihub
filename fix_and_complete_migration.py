#!/usr/bin/env python3
"""
Completa a migração lidando com foreign keys e auth.users
"""

import json
import requests
from pathlib import Path

# Configurações
SOURCE = {
    'url': 'https://jsfllqcrzqdpozkawkqc.supabase.co',
    'service_role': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZmxscWNyenFkcG96a2F3a3FjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg0NzU2MSwiZXhwIjoyMDc3NDIzNTYxfQ._ixjYZ687h1LDzRLKh0is5IgM-KLkm3Wv2B0l9syIbI'
}

DESTINATION = {
    'url': 'https://jtrhpbgrpsgneleptzgm.supabase.co',
    'service_role': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8'
}

def log(msg, level="info"):
    colors = {"success": "\033[92m✓", "warning": "\033[93m⚠", "error": "\033[91m✗", "info": "\033[94mℹ"}
    print(f"{colors.get(level, '')} {msg}\033[0m")

def get_backup_dir():
    """Encontra o diretório de backup mais recente"""
    backups = sorted(Path("backups").glob("migration_*"), reverse=True)
    return backups[0] if backups else None

def migrate_with_nullable_fks(table: str, data: list) -> bool:
    """Migra dados removendo temporariamente valores de FK problemáticos"""
    if not data:
        return True

    # Campos de FK que podem ser NULL temporariamente
    nullable_fk_fields = {
        'profiles': ['id'],  # Vamos criar UUIDs novos
        'regions': ['user_id'],
        'client_users': ['user_id'],
        'maintenances': ['user_id', 'region_id'],
        'maintenance_checklist': [],  # Depende de maintenances
        'maintenance_checklist_templates': ['user_id']
    }

    # Mapear user_ids antigos para novos (se necessário)
    user_id_map = {}

    # Se for profiles ou precisa de user_id, criar novos
    if table in nullable_fk_fields:
        modified_data = []
        for row in data:
            new_row = row.copy()

            # Para profiles, precisamos criar usuários no auth.users primeiro
            # Por enquanto, vamos pular esses registros
            if table == 'profiles':
                continue  # Não podemos migrar sem auth.users

            # Para outros, tornar FK nullable
            for field in nullable_fk_fields.get(table, []):
                if field in new_row:
                    new_row[field] = None

            modified_data.append(new_row)

        data = modified_data

    if not data:
        return True

    # Inserir
    url = f"{DESTINATION['url']}/rest/v1/{table}"
    headers = {
        'apikey': DESTINATION['service_role'],
        'Authorization': f"Bearer {DESTINATION['service_role']}",
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
    }

    try:
        batch_size = 500
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            response = requests.post(url, headers=headers, json=batch)

            if response.status_code not in [200, 201, 204]:
                log(f"Erro: {response.status_code} - {response.text}", "error")
                return False

        return True
    except Exception as e:
        log(f"Erro: {e}", "error")
        return False

def main():
    print("\n" + "="*80)
    print(" COMPLETANDO MIGRAÇÃO - LIDANDO COM FOREIGN KEYS ".center(80))
    print("="*80 + "\n")

    backup_dir = get_backup_dir()
    if not backup_dir:
        log("Backup não encontrado!", "error")
        return

    log(f"Usando backup: {backup_dir}", "info")

    # Tabelas que falharam mas podem ser migradas sem FK
    retry_tables = {
        'regions': None,  # user_id = NULL
        'client_users': None,  # user_id = NULL
        'maintenances': None,  # user_id e region_id = NULL
    }

    total_migrated = 0

    for table in retry_tables:
        backup_file = backup_dir / f"{table}.json"

        if not backup_file.exists():
            log(f"{table}: sem backup", "warning")
            continue

        with open(backup_file) as f:
            data = json.load(f)

        log(f"Migrando {table} ({len(data)} registros)...", "info")

        if migrate_with_nullable_fks(table, data):
            log(f"  {table}: {len(data)} registros migrados", "success")
            total_migrated += len(data)
        else:
            log(f"  {table}: FALHOU", "error")

    print("\n" + "="*80)
    print(" RESUMO ".center(80))
    print("="*80)
    print(f"\n✅ Total adicional migrado: {total_migrated}")
    print(f"✅ Total geral: {323 + total_migrated}")
    print("\n⚠️  ATENÇÃO: Alguns campos user_id foram definidos como NULL")
    print("   Você precisará associar manualmente aos usuários corretos\n")

if __name__ == '__main__':
    try:
        import requests
    except:
        print("Instalando requests...")
        import os
        os.system("pip3 install requests -q")
        import requests

    main()
