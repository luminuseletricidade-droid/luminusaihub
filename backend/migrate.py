#!/usr/bin/env python3
"""
Database Migration Script for Luminus AI Hub
Executes SQL migrations on Railway PostgreSQL database
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load .env file for local development
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logger_setup = logging.getLogger(__name__)
    logger_setup.info(f"✅ Loaded .env from {env_path}")

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
    logger.error("💡 Para desenvolvimento local, crie um arquivo backend/.env com:")
    logger.error("   DATABASE_URL=postgresql://user:pass@host:5432/database")
    sys.exit(1)

# Migrations directory
MIGRATIONS_DIR = Path(__file__).parent.parent / 'supabase' / 'migrations'


def create_migrations_table(conn):
    """Create migrations tracking table if it doesn't exist"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                success BOOLEAN DEFAULT true,
                error_message TEXT
            );
        """)
        conn.commit()
        logger.info("✅ Migrations tracking table ready")


def get_executed_migrations(conn):
    """Get list of already executed migrations"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT migration_name FROM schema_migrations
            WHERE success = true
            ORDER BY migration_name
        """)
        return set(row[0] for row in cur.fetchall())


def get_pending_migrations(executed_migrations):
    """Get list of pending migrations to execute"""
    if not MIGRATIONS_DIR.exists():
        logger.warning(f"⚠️  Migrations directory not found: {MIGRATIONS_DIR}")
        return []

    all_migrations = sorted([
        f.name for f in MIGRATIONS_DIR.glob('*.sql')
        if f.is_file()
    ])

    pending = [m for m in all_migrations if m not in executed_migrations]
    return pending


def execute_migration(conn, migration_name):
    """Execute a single migration file"""
    migration_path = MIGRATIONS_DIR / migration_name

    logger.info(f"🔄 Executing migration: {migration_name}")

    try:
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        with conn.cursor() as cur:
            # Execute migration
            cur.execute(migration_sql)

            # Record successful migration
            cur.execute("""
                INSERT INTO schema_migrations (migration_name, success)
                VALUES (%s, true)
            """, (migration_name,))

            conn.commit()
            logger.info(f"✅ Migration completed: {migration_name}")
            return True

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Migration failed: {migration_name}")
        logger.error(f"   Error: {str(e)}")

        # Record failed migration
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO schema_migrations (migration_name, success, error_message)
                    VALUES (%s, false, %s)
                    ON CONFLICT (migration_name) DO UPDATE
                    SET success = false, error_message = EXCLUDED.error_message
                """, (migration_name, str(e)))
                conn.commit()
        except Exception as record_error:
            logger.error(f"   Failed to record error: {str(record_error)}")

        return False


def rollback_migration(conn, migration_name):
    """Mark a migration as not executed (for rollback)"""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM schema_migrations
                WHERE migration_name = %s
            """, (migration_name,))
            conn.commit()
            logger.info(f"✅ Rolled back migration record: {migration_name}")
            return True
    except Exception as e:
        logger.error(f"❌ Rollback failed: {str(e)}")
        return False


def show_migration_status(conn):
    """Display current migration status"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT migration_name, executed_at, success
            FROM schema_migrations
            ORDER BY executed_at DESC
            LIMIT 10
        """)

        rows = cur.fetchall()
        if rows:
            logger.info("\n📊 Recent migrations:")
            for name, executed_at, success in rows:
                status = "✅" if success else "❌"
                logger.info(f"   {status} {name} - {executed_at}")
        else:
            logger.info("ℹ️  No migrations executed yet")


def main():
    """Main migration execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Database Migration Tool')
    parser.add_argument('command', choices=['migrate', 'status', 'rollback'],
                       help='Command to execute')
    parser.add_argument('--migration', help='Specific migration to rollback')

    args = parser.parse_args()

    logger.info("🚀 Luminus AI Hub - Database Migration Tool")
    logger.info(f"📁 Migrations directory: {MIGRATIONS_DIR}")

    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("✅ Connected to database")

        # Create migrations table
        create_migrations_table(conn)

        if args.command == 'status':
            show_migration_status(conn)

        elif args.command == 'rollback':
            if not args.migration:
                logger.error("❌ --migration parameter required for rollback")
                sys.exit(1)
            rollback_migration(conn, args.migration)

        elif args.command == 'migrate':
            # Get pending migrations
            executed = get_executed_migrations(conn)
            pending = get_pending_migrations(executed)

            if not pending:
                logger.info("✅ No pending migrations - database is up to date")
                show_migration_status(conn)
                return

            logger.info(f"📋 Found {len(pending)} pending migration(s)")

            # Execute each pending migration
            success_count = 0
            for migration in pending:
                if execute_migration(conn, migration):
                    success_count += 1
                else:
                    logger.error("❌ Migration failed - stopping execution")
                    break

            # Summary
            logger.info("\n" + "="*60)
            logger.info(f"✅ Successfully executed {success_count}/{len(pending)} migrations")

            if success_count < len(pending):
                logger.warning("⚠️  Some migrations failed - check logs above")
                sys.exit(1)

        conn.close()
        logger.info("✅ Migration process completed")

    except psycopg2.Error as e:
        logger.error(f"❌ Database error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
