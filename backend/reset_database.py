#!/usr/bin/env python3
"""
⚠️  CUIDADO: Este script APAGA TODAS AS TABELAS do banco!
Usar apenas em desenvolvimento/staging.
"""

import os
import sys
from pathlib import Path
import psycopg2
import logging
from dotenv import load_dotenv

# Load .env file for local development
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database configuration from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    logger.error("❌ DATABASE_URL environment variable not set")
    sys.exit(1)

def confirm_reset():
    """Ask for confirmation before resetting"""
    print("\n" + "="*60)
    print("⚠️  ATENÇÃO: OPERAÇÃO DESTRUTIVA!")
    print("="*60)
    print("\nEste script irá:")
    print("  1. APAGAR TODAS as tabelas do banco de dados")
    print("  2. APAGAR TODOS os dados")
    print("  3. APAGAR o histórico de migrations")
    print("\n⚠️  Esta operação NÃO PODE SER DESFEITA!")
    print("\nUse apenas em ambiente de desenvolvimento/staging.")
    print("="*60)

    response = input("\nDigite 'CONFIRMO' para continuar: ")
    return response == "CONFIRMO"

def drop_all_tables(conn):
    """Drop all tables in the database"""
    try:
        with conn.cursor() as cur:
            # Get all tables
            cur.execute("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            """)
            tables = cur.fetchall()

            if not tables:
                logger.info("ℹ️  Nenhuma tabela encontrada")
                return

            logger.info(f"📋 Encontradas {len(tables)} tabelas para remover:")
            for table in tables:
                logger.info(f"   - {table[0]}")

            # Drop all tables with CASCADE
            logger.info("\n🔄 Removendo tabelas...")
            for table in tables:
                table_name = table[0]
                cur.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                logger.info(f"   ✅ Removida: {table_name}")

            # Drop functions
            cur.execute("""
                SELECT routine_name
                FROM information_schema.routines
                WHERE routine_schema = 'public'
                AND routine_type = 'FUNCTION'
            """)
            functions = cur.fetchall()

            for func in functions:
                func_name = func[0]
                cur.execute(f'DROP FUNCTION IF EXISTS {func_name} CASCADE')
                logger.info(f"   ✅ Removida função: {func_name}")

            conn.commit()
            logger.info("\n✅ Todas as tabelas foram removidas com sucesso!")

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Erro ao remover tabelas: {str(e)}")
        raise

def main():
    """Main reset function"""
    logger.info("🚀 Reset Database Tool - Luminus AI Hub")

    # Confirm operation
    if not confirm_reset():
        logger.info("❌ Operação cancelada pelo usuário")
        sys.exit(0)

    try:
        # Connect to database
        logger.info("\n🔌 Conectando ao banco de dados...")
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("✅ Conectado com sucesso")

        # Drop all tables
        drop_all_tables(conn)

        conn.close()

        logger.info("\n" + "="*60)
        logger.info("✅ Reset concluído com sucesso!")
        logger.info("="*60)
        logger.info("\nPróximos passos:")
        logger.info("  1. Execute: python3 migrate.py migrate")
        logger.info("  2. Isso criará todas as tabelas do zero")
        logger.info("="*60)

    except psycopg2.Error as e:
        logger.error(f"❌ Erro de banco de dados: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Erro inesperado: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
