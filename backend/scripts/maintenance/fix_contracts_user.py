#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

# Get database URL
database_url = os.getenv('SUPABASE_DB_URL')
if not database_url:
    print("❌ SUPABASE_DB_URL not found in environment")
    sys.exit(1)

try:
    # Connect to database
    print("🔄 Connecting to database...")
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    
    # The correct user_id from the logs
    correct_user_id = 'acf73965-477e-45c4-875b-8b5e982354d3'
    
    # Update all contracts without a proper user or with wrong user
    cursor.execute("""
        UPDATE contracts 
        SET user_id = %s
        WHERE user_id IS NULL OR user_id != %s
    """, (correct_user_id, correct_user_id))
    
    updated = cursor.rowcount
    print(f"✅ Updated {updated} contracts to user {correct_user_id}")
    
    # Update all clients without a proper user
    cursor.execute("""
        UPDATE clients 
        SET user_id = %s
        WHERE user_id IS NULL OR user_id != %s
    """, (correct_user_id, correct_user_id))
    
    updated_clients = cursor.rowcount
    print(f"✅ Updated {updated_clients} clients to user {correct_user_id}")
    
    # Update all maintenances without a proper user
    cursor.execute("""
        UPDATE maintenances 
        SET user_id = %s
        WHERE user_id IS NULL OR user_id != %s
    """, (correct_user_id, correct_user_id))
    
    updated_maintenances = cursor.rowcount
    print(f"✅ Updated {updated_maintenances} maintenances to user {correct_user_id}")
    
    # Commit changes
    conn.commit()
    print("✅ Changes committed to database")
    
    # Verify the update
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN user_id = %s THEN 1 END) as correct_user
        FROM contracts
    """, (correct_user_id,))
    
    result = cursor.fetchone()
    print(f"\n📊 Verification:")
    print(f"Total contracts: {result['total']}")
    print(f"Contracts with correct user: {result['correct_user']}")
    
    cursor.close()
    conn.close()
    print("\n✅ Fix completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.rollback()
    sys.exit(1)