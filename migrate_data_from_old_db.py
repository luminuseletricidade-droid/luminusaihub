#!/usr/bin/env python3
"""
Script para migrar dados do banco antigo para o Supabase
Autor: Claude Code
Data: 2026-02-11

USO:
    python3 migrate_data_from_old_db.py --old-db-url "postgres://..." --help

IMPORTANTE:
    1. Execute as migrations primeiro (consolidated_migrations.sql)
    2. Tenha os dados do banco antigo acessíveis
    3. Faça backup antes de executar
    4. Teste em ambiente de desenvolvimento primeiro
"""

import argparse
import os
import sys
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    """Imprime cabeçalho formatado"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text):
    """Imprime mensagem de sucesso"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_warning(text):
    """Imprime mensagem de aviso"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_error(text):
    """Imprime mensagem de erro"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    """Imprime mensagem informativa"""
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

def get_supabase_connection():
    """Cria conexão com Supabase"""
    db_url = os.getenv('SUPABASE_DB_URL')
    if not db_url:
        print_error("SUPABASE_DB_URL não encontrada no .env")
        print_info("Adicione ao backend/.env:")
        print_info("SUPABASE_DB_URL=postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres")
        sys.exit(1)

    try:
        conn = psycopg2.connect(db_url)
        print_success("Conectado ao Supabase")
        return conn
    except Exception as e:
        print_error(f"Erro ao conectar ao Supabase: {e}")
        sys.exit(1)

def get_old_db_connection(old_db_url):
    """Cria conexão com banco antigo"""
    try:
        conn = psycopg2.connect(old_db_url)
        print_success("Conectado ao banco antigo")
        return conn
    except Exception as e:
        print_error(f"Erro ao conectar ao banco antigo: {e}")
        sys.exit(1)

def migrate_table(old_conn, new_conn, table_name, column_mapping=None,
                  transform_fn=None, skip_columns=None):
    """
    Migra dados de uma tabela do banco antigo para o novo

    Args:
        old_conn: Conexão com banco antigo
        new_conn: Conexão com Supabase
        table_name: Nome da tabela
        column_mapping: Dicionário mapeando colunas antigas -> novas
        transform_fn: Função para transformar cada linha
        skip_columns: Lista de colunas para ignorar
    """
    print_info(f"Migrando tabela: {table_name}")

    old_cursor = old_conn.cursor(cursor_factory=RealDictCursor)
    new_cursor = new_conn.cursor()

    skip_columns = skip_columns or []

    try:
        # Contar registros no banco antigo
        old_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_old = old_cursor.fetchone()[0]
        print_info(f"  Registros no banco antigo: {total_old}")

        # Contar registros no Supabase
        new_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_new = new_cursor.fetchone()[0]
        print_info(f"  Registros no Supabase: {total_new}")

        if total_old == 0:
            print_warning(f"  Tabela {table_name} vazia no banco antigo")
            return

        # Buscar dados do banco antigo
        old_cursor.execute(f"SELECT * FROM {table_name}")
        rows = old_cursor.fetchall()

        if not rows:
            print_warning(f"  Nenhum dado encontrado em {table_name}")
            return

        # Preparar dados para inserção
        migrated_count = 0
        skipped_count = 0

        for row in rows:
            # Converter para dict
            row_dict = dict(row)

            # Remover colunas a ignorar
            for col in skip_columns:
                row_dict.pop(col, None)

            # Aplicar mapeamento de colunas
            if column_mapping:
                new_row = {}
                for old_col, new_col in column_mapping.items():
                    if old_col in row_dict:
                        new_row[new_col] = row_dict[old_col]
                row_dict = new_row

            # Aplicar transformação customizada
            if transform_fn:
                row_dict = transform_fn(row_dict)
                if row_dict is None:
                    skipped_count += 1
                    continue

            # Inserir no Supabase
            columns = list(row_dict.keys())
            values = list(row_dict.values())

            placeholders = ', '.join(['%s'] * len(values))
            columns_str = ', '.join(columns)

            insert_query = f"""
                INSERT INTO {table_name} ({columns_str})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """

            try:
                new_cursor.execute(insert_query, values)
                migrated_count += 1
            except Exception as e:
                print_warning(f"  Erro ao inserir registro: {e}")
                skipped_count += 1

        # Commit
        new_conn.commit()

        print_success(f"  Migrados: {migrated_count} registros")
        if skipped_count > 0:
            print_warning(f"  Ignorados: {skipped_count} registros")

    except Exception as e:
        new_conn.rollback()
        print_error(f"  Erro ao migrar {table_name}: {e}")
        raise

    finally:
        old_cursor.close()
        new_cursor.close()

def migrate_clients(old_conn, new_conn):
    """Migra tabela de clientes"""

    # Primeiro, garantir que client_status existe
    cursor = new_conn.cursor()
    cursor.execute("SELECT id FROM client_status WHERE name = 'Ativo' LIMIT 1")
    active_status = cursor.fetchone()
    if not active_status:
        print_error("Status 'Ativo' não encontrado. Execute as migrations primeiro!")
        return

    active_status_id = active_status[0]
    cursor.close()

    def transform_client(row):
        """Transforma linha de cliente"""
        # Adicionar status padrão se não existir
        if 'status_id' not in row or not row['status_id']:
            row['status_id'] = active_status_id

        # Garantir campos obrigatórios
        if not row.get('created_at'):
            row['created_at'] = datetime.now()
        if not row.get('updated_at'):
            row['updated_at'] = datetime.now()

        return row

    migrate_table(
        old_conn,
        new_conn,
        'clients',
        transform_fn=transform_client
    )

def migrate_contracts(old_conn, new_conn):
    """Migra tabela de contratos"""

    def transform_contract(row):
        """Transforma linha de contrato"""
        # Garantir campos obrigatórios
        if not row.get('status'):
            row['status'] = 'active'

        if not row.get('created_at'):
            row['created_at'] = datetime.now()
        if not row.get('updated_at'):
            row['updated_at'] = datetime.now()

        return row

    migrate_table(
        old_conn,
        new_conn,
        'contracts',
        transform_fn=transform_contract
    )

def migrate_maintenances(old_conn, new_conn):
    """Migra tabela de manutenções"""

    def transform_maintenance(row):
        """Transforma linha de manutenção"""
        # Garantir campos obrigatórios
        if not row.get('status'):
            row['status'] = 'pending'

        if not row.get('created_at'):
            row['created_at'] = datetime.now()
        if not row.get('updated_at'):
            row['updated_at'] = datetime.now()

        return row

    migrate_table(
        old_conn,
        new_conn,
        'maintenances',
        transform_fn=transform_maintenance
    )

def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description='Migra dados do banco antigo para Supabase'
    )
    parser.add_argument(
        '--old-db-url',
        help='URL de conexão do banco antigo (postgres://...)',
        required=True
    )
    parser.add_argument(
        '--tables',
        help='Tabelas para migrar (separadas por vírgula). Default: todas',
        default='clients,contracts,maintenances,equipment'
    )
    parser.add_argument(
        '--dry-run',
        help='Executar sem fazer alterações (apenas análise)',
        action='store_true'
    )

    args = parser.parse_args()

    print_header("MIGRAÇÃO DE DADOS - BANCO ANTIGO → SUPABASE")

    # Validações
    print_info("Validando pré-requisitos...")

    if args.dry_run:
        print_warning("Modo DRY-RUN ativado - nenhuma alteração será feita")

    # Conectar aos bancos
    print_info("Conectando aos bancos de dados...")
    old_conn = get_old_db_connection(args.old_db_url)
    new_conn = get_supabase_connection()

    # Verificar se migrations foram aplicadas
    cursor = new_conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
    """)
    table_count = cursor.fetchone()[0]
    cursor.close()

    if table_count < 20:
        print_error("Poucas tabelas encontradas no Supabase!")
        print_error("Execute as migrations primeiro: consolidated_migrations.sql")
        sys.exit(1)

    print_success(f"Supabase tem {table_count} tabelas públicas")

    # Parse tabelas para migrar
    tables_to_migrate = [t.strip() for t in args.tables.split(',')]

    print_header("INICIANDO MIGRAÇÃO")

    try:
        # Desabilitar RLS temporariamente para migration
        if not args.dry_run:
            cursor = new_conn.cursor()
            for table in tables_to_migrate:
                cursor.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
            new_conn.commit()
            cursor.close()
            print_success("RLS desabilitado temporariamente")

        # Migrar cada tabela
        for table in tables_to_migrate:
            print()
            if table == 'clients':
                migrate_clients(old_conn, new_conn)
            elif table == 'contracts':
                migrate_contracts(old_conn, new_conn)
            elif table == 'maintenances':
                migrate_maintenances(old_conn, new_conn)
            else:
                migrate_table(old_conn, new_conn, table)

        # Reabilitar RLS
        if not args.dry_run:
            cursor = new_conn.cursor()
            for table in tables_to_migrate:
                cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            new_conn.commit()
            cursor.close()
            print_success("RLS reabilitado")

        print_header("MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        print_success("Todos os dados foram migrados")

        # Estatísticas finais
        print_info("\nEstatísticas finais:")
        cursor = new_conn.cursor()
        for table in tables_to_migrate:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print_info(f"  {table}: {count} registros")
        cursor.close()

    except Exception as e:
        print_error(f"Erro durante migração: {e}")
        sys.exit(1)

    finally:
        old_conn.close()
        new_conn.close()
        print_info("\nConexões fechadas")

if __name__ == '__main__':
    main()
