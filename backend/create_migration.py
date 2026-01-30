#!/usr/bin/env python3
"""
Helper script to create new migration files with proper naming
"""

import os
import sys
from pathlib import Path
from datetime import datetime

MIGRATIONS_DIR = Path(__file__).parent.parent / 'supabase' / 'migrations'

def get_next_migration_number():
    """Get the next migration number based on existing files"""
    if not MIGRATIONS_DIR.exists():
        MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
        return 1

    existing = [f.name for f in MIGRATIONS_DIR.glob('*.sql')]
    if not existing:
        return 1

    # Extract numbers from filenames
    numbers = []
    for filename in existing:
        try:
            num = int(filename.split('_')[0])
            numbers.append(num)
        except (ValueError, IndexError):
            continue

    return max(numbers) + 1 if numbers else 1


def create_migration(description):
    """Create a new migration file with template"""
    # Get next number
    number = get_next_migration_number()

    # Format filename
    filename = f"{number:05d}_{description}.sql"
    filepath = MIGRATIONS_DIR / filename

    # Migration template
    template = f"""-- Migration: {description.replace('_', ' ').title()}
-- Description: [Adicione aqui a descrição detalhada da migration]
-- Date: {datetime.now().strftime('%Y-%m-%d')}

-- Adicione suas mudanças SQL aqui
-- Exemplo:
-- ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name VARCHAR(255);
-- CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);

-- Documentação
-- COMMENT ON COLUMN table_name.column_name IS 'Description';
"""

    # Write file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f"✅ Created migration: {filename}")
    print(f"📁 Path: {filepath}")
    print(f"\n📝 Next steps:")
    print(f"   1. Edit {filepath}")
    print(f"   2. Add your SQL changes")
    print(f"   3. Test with: python3 backend/migrate.py migrate")
    print(f"   4. Commit the file")

    return filepath


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 create_migration.py <description>")
        print("Example: python3 create_migration.py add_user_preferences")
        sys.exit(1)

    description = sys.argv[1].lower().replace(' ', '_').replace('-', '_')
    create_migration(description)


if __name__ == '__main__':
    main()
