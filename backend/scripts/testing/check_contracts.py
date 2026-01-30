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
    
    # Count contracts
    cursor.execute("SELECT COUNT(*) as total FROM contracts")
    total = cursor.fetchone()['total']
    print(f"📊 Total contracts in database: {total}")
    
    # Get recent contracts
    cursor.execute("""
        SELECT 
            id,
            contract_number,
            client_name,
            status,
            created_at,
            user_id
        FROM contracts 
        ORDER BY created_at DESC 
        LIMIT 10
    """)
    
    contracts = cursor.fetchall()
    
    if contracts:
        print("\n📋 Recent contracts:")
        print("-" * 80)
        for contract in contracts:
            print(f"ID: {contract['id']}")
            print(f"Number: {contract['contract_number']}")
            print(f"Client: {contract.get('client_name', 'N/A')}")
            print(f"Status: {contract['status']}")
            print(f"User ID: {contract.get('user_id', 'N/A')}")
            print(f"Created: {contract['created_at']}")
            print("-" * 80)
    else:
        print("❌ No contracts found in database")
    
    # Check clients
    cursor.execute("SELECT COUNT(*) as total FROM clients")
    total_clients = cursor.fetchone()['total']
    print(f"\n👥 Total clients in database: {total_clients}")
    
    # Check maintenances
    cursor.execute("SELECT COUNT(*) as total FROM maintenances")
    total_maintenances = cursor.fetchone()['total']
    print(f"🔧 Total maintenances in database: {total_maintenances}")
    
    cursor.close()
    conn.close()
    print("\n✅ Database check completed")
    
except Exception as e:
    print(f"❌ Error connecting to database: {e}")
    sys.exit(1)