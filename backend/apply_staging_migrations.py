#!/usr/bin/env python3
import psycopg2
import os
import glob
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def apply_migrations():
    db_url = os.getenv('SUPABASE_DB_URL')
    schema = os.getenv('SUPABASE_DB_SCHEMA', 'staging')

    print(f"🚀 Aplicando migrações ao schema: {schema}")

    parsed = urlparse(db_url)

    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password.replace('%40', '@')
    )
    conn.autocommit = True
    cur = conn.cursor()

    # Criar schema se não existir
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    print(f"✅ Schema {schema} garantido")

    # Definir search_path
    cur.execute(f"SET search_path TO {schema}, public")

    # Listar migrações
    migration_files = sorted(glob.glob('../supabase/migrations/*.sql'))

    print(f"📦 Encontradas {len(migration_files)} migrações")

    for migration_file in migration_files:
        filename = os.path.basename(migration_file)
        print(f"\n📝 Aplicando: {filename}")

        try:
            with open(migration_file, 'r') as f:
                sql = f.read()

                # Substituir referências ao schema public pelo schema atual
                sql = sql.replace('public.', f'{schema}.')

                # Adicionar IF NOT EXISTS apenas se ainda não existir
                if 'CREATE TABLE' in sql and 'CREATE TABLE IF NOT EXISTS' not in sql:
                    sql = sql.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')
                if 'CREATE INDEX' in sql and 'CREATE INDEX IF NOT EXISTS' not in sql:
                    sql = sql.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')
                if 'CREATE UNIQUE INDEX' in sql and 'CREATE UNIQUE INDEX IF NOT EXISTS' not in sql:
                    sql = sql.replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS')

                # Aplicar migration
                cur.execute(sql)
                print(f"  ✅ {filename} aplicada")

        except Exception as e:
            if 'already exists' in str(e):
                print(f"  ⏭️  {filename} - já existe, pulando...")
            else:
                print(f"  ❌ {filename} - erro: {e}")

    # Verificar tabelas criadas
    cur.execute(f"""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '{schema}'
        ORDER BY table_name;
    """)

    tables = cur.fetchall()

    print(f"\n✅ Total de {len(tables)} tabelas no schema {schema}:")
    for table in tables:
        print(f"  - {table[0]}")

    cur.close()
    conn.close()

    print("\n✅ Migrações aplicadas com sucesso!")

if __name__ == "__main__":
    apply_migrations()