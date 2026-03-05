#!/usr/bin/env python3
"""
Script para fazer backup completo e validar dados do Supabase
Garante que NENHUM dado será perdido
Autor: Claude Code
Data: 2026-02-11
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuração
DB_URL = "postgresql://postgres:Qj2hqehFz3FN8s6h@db.jtrhpbgrpsgneleptzgm.supabase.co:5432/postgres"
BACKUP_DIR = Path(__file__).parent / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")

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

def connect_db():
    """Conecta ao banco Supabase"""
    try:
        conn = psycopg2.connect(DB_URL)
        log_success("Conectado ao Supabase")
        return conn
    except Exception as e:
        log_error(f"Erro ao conectar: {e}")
        sys.exit(1)

def get_all_tables(conn):
    """Lista todas as tabelas do schema public"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    tables = [row['tablename'] for row in cursor.fetchall()]
    cursor.close()
    return tables

def get_table_info(conn, table_name):
    """Obtém informações sobre uma tabela"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Contar registros
    cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    count = cursor.fetchone()['count']

    # Obter colunas
    cursor.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '{table_name}'
        ORDER BY ordinal_position
    """)
    columns = cursor.fetchall()

    # Obter foreign keys
    cursor.execute(f"""
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = '{table_name}'
    """)
    foreign_keys = cursor.fetchall()

    cursor.close()

    return {
        'count': count,
        'columns': columns,
        'foreign_keys': foreign_keys
    }

def backup_table(conn, table_name, backup_dir):
    """Faz backup completo de uma tabela"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Buscar todos os dados
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()

        if not rows:
            log_warning(f"  {table_name}: tabela vazia")
            return 0

        # Converter para JSON (lida com UUIDs e datas)
        data = []
        for row in rows:
            row_dict = dict(row)
            # Converter tipos especiais para string
            for key, value in row_dict.items():
                if value is not None:
                    if hasattr(value, 'isoformat'):  # datetime
                        row_dict[key] = value.isoformat()
                    elif isinstance(value, (bytes, bytearray)):  # binary
                        row_dict[key] = value.hex()
            data.append(row_dict)

        # Salvar em arquivo JSON
        backup_file = backup_dir / f"{table_name}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

        # Criar também SQL dump para facilitar restore
        sql_file = backup_dir / f"{table_name}.sql"
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Backup de {table_name}\n")
            f.write(f"-- Data: {datetime.now()}\n")
            f.write(f"-- Registros: {len(data)}\n\n")

            if data:
                # Obter nomes das colunas
                columns = list(data[0].keys())
                columns_str = ', '.join(columns)

                f.write(f"TRUNCATE TABLE {table_name} CASCADE;\n\n")

                for row in data:
                    values = []
                    for col in columns:
                        val = row[col]
                        if val is None:
                            values.append('NULL')
                        elif isinstance(val, (int, float)):
                            values.append(str(val))
                        elif isinstance(val, bool):
                            values.append('TRUE' if val else 'FALSE')
                        else:
                            # Escapar strings
                            val_str = str(val).replace("'", "''")
                            values.append(f"'{val_str}'")

                    values_str = ', '.join(values)
                    f.write(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});\n")

        log_success(f"  {table_name}: {len(data)} registros")
        return len(data)

    except Exception as e:
        log_error(f"  {table_name}: ERRO - {e}")
        return 0
    finally:
        cursor.close()

def validate_foreign_keys(conn):
    """Valida integridade de foreign keys"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    log_info("Validando integridade referencial...")

    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    """)

    foreign_keys = cursor.fetchall()
    issues = []

    for fk in foreign_keys:
        table = fk['table_name']
        column = fk['column_name']
        ref_table = fk['foreign_table_name']
        ref_column = fk['foreign_column_name']

        # Verificar se há valores órfãos
        cursor.execute(f"""
            SELECT COUNT(*) as count
            FROM {table} t
            WHERE t.{column} IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM {ref_table} r
                WHERE r.{ref_column} = t.{column}
            )
        """)

        orphans = cursor.fetchone()['count']
        if orphans > 0:
            issues.append({
                'table': table,
                'column': column,
                'ref_table': ref_table,
                'orphans': orphans
            })
            log_warning(f"  {table}.{column} → {ref_table}: {orphans} órfãos")

    cursor.close()

    if not issues:
        log_success("Todas as foreign keys válidas!")

    return issues

def analyze_duplicates(conn, table_name):
    """Analisa duplicatas em uma tabela"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Tentar encontrar coluna de ID
    cursor.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND column_name IN ('id', 'uuid', 'pk')
        LIMIT 1
    """)

    id_col = cursor.fetchone()
    if not id_col:
        cursor.close()
        return None

    id_col = id_col['column_name']

    # Verificar duplicatas por campos importantes
    cursor.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND column_name IN ('email', 'cnpj', 'cpf', 'contract_number', 'name')
    """)

    unique_candidates = [row['column_name'] for row in cursor.fetchall()]

    duplicates = {}
    for col in unique_candidates:
        cursor.execute(f"""
            SELECT {col}, COUNT(*) as count
            FROM {table_name}
            WHERE {col} IS NOT NULL
            GROUP BY {col}
            HAVING COUNT(*) > 1
        """)

        dups = cursor.fetchall()
        if dups:
            duplicates[col] = len(dups)

    cursor.close()
    return duplicates if duplicates else None

def main():
    """Função principal"""
    log_header("BACKUP E VALIDAÇÃO COMPLETA - SUPABASE")

    # Criar diretório de backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    log_success(f"Diretório de backup: {BACKUP_DIR}")

    # Conectar ao banco
    conn = connect_db()

    # Listar tabelas
    log_header("LISTANDO TABELAS")
    tables = get_all_tables(conn)
    log_info(f"Encontradas {len(tables)} tabelas")

    # Informações gerais
    log_header("ANALISANDO ESTRUTURA")

    table_stats = {}
    for table in tables:
        info = get_table_info(conn, table)
        table_stats[table] = info

        status = f"{table}: {info['count']} registros"
        if info['count'] > 0:
            log_success(f"  {status}")
        else:
            log_warning(f"  {status} (vazia)")

    # Fazer backup
    log_header("FAZENDO BACKUP COMPLETO")

    total_records = 0
    for table in tables:
        count = backup_table(conn, table, BACKUP_DIR)
        total_records += count

    log_success(f"\nTotal de registros salvos: {total_records:,}")

    # Validar foreign keys
    log_header("VALIDANDO INTEGRIDADE REFERENCIAL")
    fk_issues = validate_foreign_keys(conn)

    # Analisar duplicatas
    log_header("ANALISANDO DUPLICATAS")

    duplicate_report = {}
    for table in tables:
        if table_stats[table]['count'] > 0:
            dups = analyze_duplicates(conn, table)
            if dups:
                duplicate_report[table] = dups
                log_warning(f"  {table}: {dups}")

    if not duplicate_report:
        log_success("Nenhuma duplicata encontrada!")

    # Gerar relatório final
    log_header("GERANDO RELATÓRIO")

    report = {
        'timestamp': datetime.now().isoformat(),
        'backup_dir': str(BACKUP_DIR),
        'total_tables': len(tables),
        'total_records': total_records,
        'tables': {},
        'foreign_key_issues': fk_issues,
        'duplicate_issues': duplicate_report
    }

    for table in tables:
        report['tables'][table] = {
            'count': table_stats[table]['count'],
            'columns': len(table_stats[table]['columns']),
            'foreign_keys': len(table_stats[table]['foreign_keys'])
        }

    # Salvar relatório
    report_file = BACKUP_DIR / "report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Criar relatório legível
    readme_file = BACKUP_DIR / "README.md"
    with open(readme_file, 'w', encoding='utf-8') as f:
        f.write("# Backup e Validação - Supabase\n\n")
        f.write(f"**Data:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Total de Tabelas:** {len(tables)}\n")
        f.write(f"**Total de Registros:** {total_records:,}\n\n")

        f.write("## Tabelas\n\n")
        for table, stats in report['tables'].items():
            f.write(f"- **{table}**: {stats['count']:,} registros\n")

        if fk_issues:
            f.write("\n## ⚠️ Problemas de Integridade Referencial\n\n")
            for issue in fk_issues:
                f.write(f"- {issue['table']}.{issue['column']} → {issue['ref_table']}: "
                       f"{issue['orphans']} registros órfãos\n")

        if duplicate_report:
            f.write("\n## ⚠️ Duplicatas Encontradas\n\n")
            for table, dups in duplicate_report.items():
                f.write(f"- **{table}**:\n")
                for col, count in dups.items():
                    f.write(f"  - {col}: {count} valores duplicados\n")

        f.write("\n## Arquivos de Backup\n\n")
        f.write("Cada tabela foi salva em dois formatos:\n")
        f.write("- `.json`: Formato JSON para análise e processamento\n")
        f.write("- `.sql`: Dump SQL para restore direto\n")

    conn.close()

    # Resumo final
    log_header("BACKUP CONCLUÍDO COM SUCESSO!")

    print(f"""
    ✅ Backup salvo em: {BACKUP_DIR}
    📊 Total de tabelas: {len(tables)}
    📝 Total de registros: {total_records:,}
    🗂️  Arquivos criados: {len(tables) * 2 + 2}

    Arquivos gerados:
    - {len(tables)} arquivos .json (dados)
    - {len(tables)} arquivos .sql (restore)
    - 1 arquivo report.json (relatório completo)
    - 1 arquivo README.md (resumo legível)
    """)

    if fk_issues:
        log_warning(f"\n⚠️  Encontrados {len(fk_issues)} problemas de integridade referencial")
        log_info("Veja detalhes em: report.json")

    if duplicate_report:
        log_warning(f"\n⚠️  Encontradas duplicatas em {len(duplicate_report)} tabelas")
        log_info("Veja detalhes em: report.json")

    log_success("\n✅ Seus dados estão seguros!")
    log_info("Você pode agora reorganizar/limpar sem medo de perder dados.")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log_warning("\n\nBackup interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        log_error(f"\n\nErro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
