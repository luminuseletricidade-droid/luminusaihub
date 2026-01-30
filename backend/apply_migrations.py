#!/usr/bin/env python3
"""
Script to apply pending migrations to the database
"""

import os
import sys
import glob
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
backend_dir = Path(__file__).parent
env_path = backend_dir / ".env"
load_dotenv(env_path)

# Import after loading env vars
from database import SupabaseDB

def apply_migrations():
    """Apply all pending migrations"""

    # Initialize database connection
    db = SupabaseDB()

    # Get migrations directory
    project_root = Path(__file__).parent.parent
    migrations_dir = project_root / "supabase" / "migrations"

    # Migrations to apply in order
    critical_migrations = [
        "00051_maintenance_status_rules.sql",
        "00052_enable_pgcrypto_extension.sql"
    ]

    print("🚀 Starting migration process...")

    for migration_file in critical_migrations:
        migration_path = migrations_dir / migration_file

        if not migration_path.exists():
            print(f"⚠️  Migration file not found: {migration_file}")
            continue

        print(f"\n📝 Applying migration: {migration_file}")

        try:
            # Read migration content
            with open(migration_path, 'r') as f:
                migration_sql = f.read()

            try:
                # Execute the entire migration as one statement
                # This preserves functions, triggers, and multi-line statements
                db.execute_command(migration_sql, ())
                print(f"   ✅ Migration applied successfully!")
            except Exception as e:
                error_msg = str(e)
                if 'already exists' in error_msg.lower():
                    print(f"   ⚠️  Skipped (already exists)")
                elif 'does not exist' in error_msg.lower() and 'to drop' in error_msg.lower():
                    print(f"   ⚠️  Skipped (object doesn't exist to drop)")
                else:
                    print(f"   ❌ Error applying migration: {error_msg[:200]}")
                    # Try to run it piece by piece if full execution fails
                    print("   🔄 Trying alternative execution method...")

                    # Use special delimiter for functions
                    import re
                    # Split on semicolons but not inside function definitions
                    function_pattern = r'(CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE|TRIGGER)[^;]+?(?:BEGIN.*?END\s*(?:\$\$|\$[A-Z_]+\$)|\$\$.*?\$\$)[^;]*;)'

                    # Extract functions first
                    functions = re.findall(function_pattern, migration_sql, re.IGNORECASE | re.DOTALL)

                    # Execute functions
                    for func in functions:
                        try:
                            db.execute_command(func, ())
                            print(f"   ✅ Function/Trigger created")
                        except Exception as func_err:
                            if 'already exists' not in str(func_err).lower():
                                print(f"   ❌ Function error: {str(func_err)[:100]}")

        except Exception as e:
            print(f"   ❌ Failed to apply migration: {e}")

    print("\n✨ Migration process completed!")

    # Test if pgcrypto is now available
    print("\n🔍 Testing pgcrypto extension...")
    try:
        result = db.execute_query("SELECT gen_salt('bf')", ())
        print("   ✅ pgcrypto extension is working!")
    except Exception as e:
        if 'gen_salt' in str(e):
            print("   ❌ pgcrypto extension not available")
            print("   💡 You may need to enable it manually in Supabase dashboard")
        else:
            print(f"   ❌ Test failed: {e}")

if __name__ == "__main__":
    apply_migrations()