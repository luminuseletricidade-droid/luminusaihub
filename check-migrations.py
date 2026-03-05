#!/usr/bin/env python3
"""
Script para analisar e verificar migrations do Supabase
Autor: Claude Code
Data: 2026-02-11
"""

import os
import re
from pathlib import Path
from typing import List, Dict
import json

MIGRATIONS_DIR = "supabase/migrations"
MANUAL_DIR = f"{MIGRATIONS_DIR}/manual"
OLD_DIR = f"{MIGRATIONS_DIR}/_old_migrations"

def get_migration_files() -> List[Path]:
    """Retorna lista de arquivos de migration ordenados"""
    migrations_path = Path(MIGRATIONS_DIR)
    sql_files = [f for f in migrations_path.glob("*.sql") if f.is_file()]
    return sorted(sql_files)

def parse_migration_header(file_path: Path) -> Dict:
    """Extrai informações do cabeçalho da migration"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read(500)  # Ler apenas início do arquivo

    info = {
        'file': file_path.name,
        'description': '',
        'date': '',
        'size_kb': round(file_path.stat().st_size / 1024, 2)
    }

    # Extrair descrição
    desc_match = re.search(r'--\s*(?:Migration:|Description:)\s*(.+)', content)
    if desc_match:
        info['description'] = desc_match.group(1).strip()

    # Extrair data
    date_match = re.search(r'--\s*Date:\s*(.+)', content)
    if date_match:
        info['date'] = date_match.group(1).strip()

    return info

def analyze_migration_content(file_path: Path) -> Dict:
    """Analisa o conteúdo da migration"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    analysis = {
        'creates_tables': len(re.findall(r'CREATE TABLE', content, re.IGNORECASE)),
        'alters_tables': len(re.findall(r'ALTER TABLE', content, re.IGNORECASE)),
        'creates_functions': len(re.findall(r'CREATE (?:OR REPLACE )?FUNCTION', content, re.IGNORECASE)),
        'creates_indices': len(re.findall(r'CREATE (?:UNIQUE )?INDEX', content, re.IGNORECASE)),
        'rls_policies': len(re.findall(r'CREATE POLICY|ALTER TABLE.*ENABLE ROW LEVEL SECURITY', content, re.IGNORECASE)),
        'inserts': len(re.findall(r'INSERT INTO', content, re.IGNORECASE)),
        'drops': len(re.findall(r'DROP (?:TABLE|FUNCTION|INDEX|POLICY)', content, re.IGNORECASE)),
        'lines': len(content.split('\n'))
    }

    return analysis

def print_header():
    """Imprime cabeçalho"""
    print("=" * 80)
    print("  ANÁLISE DE MIGRATIONS - SUPABASE")
    print("=" * 80)
    print()

def print_summary(migrations: List[Path]):
    """Imprime resumo geral"""
    print(f"📊 RESUMO GERAL")
    print("-" * 80)
    print(f"Total de migrations principais: {len(migrations)}")

    manual_count = len(list(Path(MANUAL_DIR).glob("*.sql"))) if Path(MANUAL_DIR).exists() else 0
    print(f"Migrations manuais: {manual_count}")

    old_count = len(list(Path(OLD_DIR).glob("*.sql"))) if Path(OLD_DIR).exists() else 0
    print(f"Migrations antigas: {old_count}")

    total_size = sum(f.stat().st_size for f in migrations) / 1024
    print(f"Tamanho total: {total_size:.2f} KB")
    print()

def print_migration_details(migrations: List[Path]):
    """Imprime detalhes de cada migration"""
    print("📋 DETALHES DAS MIGRATIONS")
    print("-" * 80)

    total_tables = 0
    total_alters = 0
    total_functions = 0

    for migration in migrations:
        info = parse_migration_header(migration)
        analysis = analyze_migration_content(migration)

        # Acumular totais
        total_tables += analysis['creates_tables']
        total_alters += analysis['alters_tables']
        total_functions += analysis['creates_functions']

        print(f"\n📄 {info['file']}")
        if info['description']:
            print(f"   Descrição: {info['description']}")
        if info['date']:
            print(f"   Data: {info['date']}")
        print(f"   Tamanho: {info['size_kb']} KB | Linhas: {analysis['lines']}")

        # Mostrar operações
        operations = []
        if analysis['creates_tables'] > 0:
            operations.append(f"{analysis['creates_tables']} tabelas criadas")
        if analysis['alters_tables'] > 0:
            operations.append(f"{analysis['alters_tables']} alterações")
        if analysis['creates_functions'] > 0:
            operations.append(f"{analysis['creates_functions']} funções")
        if analysis['creates_indices'] > 0:
            operations.append(f"{analysis['creates_indices']} índices")
        if analysis['rls_policies'] > 0:
            operations.append(f"{analysis['rls_policies']} políticas RLS")
        if analysis['inserts'] > 0:
            operations.append(f"{analysis['inserts']} inserts")
        if analysis['drops'] > 0:
            operations.append(f"⚠️  {analysis['drops']} drops")

        if operations:
            print(f"   Operações: {', '.join(operations)}")

    print()
    print("-" * 80)
    print(f"📊 TOTAIS:")
    print(f"   Tabelas criadas: {total_tables}")
    print(f"   Alterações: {total_alters}")
    print(f"   Funções criadas: {total_functions}")
    print()

def check_base_schema():
    """Verifica se base schema existe"""
    base_schema = Path(MIGRATIONS_DIR) / "00000_base_schema.sql"
    if base_schema.exists():
        print("✅ Base schema encontrado (00000_base_schema.sql)")
        with open(base_schema, 'r') as f:
            content = f.read()
            tables = re.findall(r'CREATE TABLE.*?(\w+)\s*\(', content, re.IGNORECASE)
            print(f"   Cria {len(tables)} tabelas base")
    else:
        print("⚠️  Base schema não encontrado!")
    print()

def main():
    print_header()

    # Verificar se diretório existe
    if not Path(MIGRATIONS_DIR).exists():
        print(f"❌ Diretório {MIGRATIONS_DIR} não encontrado!")
        return

    # Obter migrations
    migrations = get_migration_files()

    if not migrations:
        print(f"❌ Nenhuma migration encontrada em {MIGRATIONS_DIR}")
        return

    # Imprimir resumo
    print_summary(migrations)

    # Verificar base schema
    check_base_schema()

    # Imprimir detalhes
    print_migration_details(migrations)

    # Recomendações
    print("=" * 80)
    print("💡 PRÓXIMOS PASSOS")
    print("-" * 80)
    print("1. Execute: ./apply-migrations.sh")
    print("   Ou manualmente:")
    print("   - supabase link --project-ref asdvxynilrurillrhsyj")
    print("   - supabase migration list")
    print("   - supabase db push")
    print()
    print("2. Para testar localmente:")
    print("   - supabase start")
    print("   - supabase status")
    print()
    print("3. Verificar no dashboard:")
    print("   https://supabase.com/dashboard/project/asdvxynilrurillrhsyj")
    print("=" * 80)

if __name__ == "__main__":
    main()
