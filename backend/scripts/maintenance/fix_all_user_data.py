#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import errors
from datetime import datetime

# Load environment variables
load_dotenv()

# Get database URL
database_url = os.getenv('SUPABASE_DB_URL')
if not database_url:
    print("❌ SUPABASE_DB_URL not found in environment")
    sys.exit(1)

def fix_all_user_associations():
    """Fix all user associations across all tables"""
    try:
        # Connect to database
        print("🔄 Connecting to database...")
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # The correct user_id from AuthContext
        correct_user_id = 'acf73965-477e-45c4-875b-8b5e982354d3'
        
        print(f"🔧 Fixing all data for user: {correct_user_id}")
        print("=" * 80)
        
        # 1. Fix clients table
        cursor.execute("""
            UPDATE clients 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, name, cnpj
        """, (correct_user_id, correct_user_id))
        
        updated_clients = cursor.fetchall()
        print(f"✅ Updated {len(updated_clients)} clients")
        for client in updated_clients:
            print(f"   - {client['name']} (CNPJ: {client.get('cnpj', 'N/A')})")
        
        # 2. Fix contracts table
        cursor.execute("""
            UPDATE contracts 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, contract_number, client_name
        """, (correct_user_id, correct_user_id))
        
        updated_contracts = cursor.fetchall()
        print(f"✅ Updated {len(updated_contracts)} contracts")
        for contract in updated_contracts:
            print(f"   - {contract['contract_number']} ({contract.get('client_name', 'N/A')})")
        
        # 3. Fix maintenances table
        cursor.execute("""
            UPDATE maintenances 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, description, scheduled_date
        """, (correct_user_id, correct_user_id))
        
        updated_maintenances = cursor.fetchall()
        print(f"✅ Updated {len(updated_maintenances)} maintenances")
        for maintenance in updated_maintenances[:5]:  # Show first 5
            print(f"   - {maintenance['description']} ({maintenance['scheduled_date']})")
        if len(updated_maintenances) > 5:
            print(f"   ... and {len(updated_maintenances) - 5} more")
        
        # 4. Fix contract_documents table
        cursor.execute("""
            UPDATE contract_documents 
            SET uploaded_by = %s
            WHERE uploaded_by IS NULL OR uploaded_by != %s
            RETURNING id, name, contract_id
        """, (correct_user_id, correct_user_id))
        
        updated_documents = cursor.fetchall()
        print(f"✅ Updated {len(updated_documents)} contract documents")
        
        # 5. maintenance_checklists table doesn't have user_id, skip it
        print(f"ℹ️  Skipping maintenance_checklists (no user_id column)")
        
        # 6. Fix generated_reports table
        cursor.execute("""
            UPDATE generated_reports 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, report_type, created_at
        """, (correct_user_id, correct_user_id))
        
        updated_reports = cursor.fetchall()
        print(f"✅ Updated {len(updated_reports)} generated reports")
        
        # 7. ai_agents table might not exist, try to update it
        try:
            cursor.execute("""
                UPDATE ai_agents 
                SET user_id = %s
                WHERE user_id IS NULL OR user_id != %s
                RETURNING id, name, type
            """, (correct_user_id, correct_user_id))
            
            updated_agents = cursor.fetchall()
            print(f"✅ Updated {len(updated_agents)} AI agents")
        except errors.UndefinedTable:
            conn.rollback()  # Rollback the failed transaction
            print(f"ℹ️  Skipping ai_agents (table doesn't exist)")
            cursor = conn.cursor(cursor_factory=RealDictCursor)  # Get a new cursor after rollback
        
        # 8. Fix chat_sessions table
        cursor.execute("""
            UPDATE chat_sessions 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, created_at
        """, (correct_user_id, correct_user_id))
        
        updated_sessions = cursor.fetchall()
        print(f"✅ Updated {len(updated_sessions)} chat sessions")
        
        # 9. Fix chat_messages table (via chat_sessions)
        cursor.execute("""
            UPDATE chat_messages 
            SET user_id = %s
            WHERE user_id IS NULL OR user_id != %s
            RETURNING id, session_id
        """, (correct_user_id, correct_user_id))
        
        updated_messages = cursor.fetchall()
        print(f"✅ Updated {len(updated_messages)} chat messages")
        
        # Commit all changes
        conn.commit()
        print("=" * 80)
        print("✅ All changes committed to database")
        
        # Verification - count all records
        print("\n📊 Final Verification:")
        print("-" * 40)
        
        tables = [
            ('clients', 'name'),
            ('contracts', 'contract_number'),
            ('maintenances', 'description'),
            ('generated_reports', 'report_type'),
            ('chat_sessions', 'id'),
            ('chat_messages', 'content')
        ]
        
        for table, display_field in tables:
            try:
                cursor.execute(f"""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN user_id = %s THEN 1 END) as with_correct_user
                    FROM {table}
                """, (correct_user_id,))
                
                result = cursor.fetchone()
                if result and result['total'] > 0:
                    percentage = (result['with_correct_user'] / result['total']) * 100
                    status = "✅" if percentage == 100 else "⚠️"
                    print(f"{status} {table}: {result['with_correct_user']}/{result['total']} ({percentage:.0f}%)")
                elif result:
                    print(f"ℹ️  {table}: Empty table")
            except errors.UndefinedTable:
                print(f"ℹ️  {table}: Table doesn't exist")
                conn.rollback()
                cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Also check uploaded_by in contract_documents
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN uploaded_by = %s THEN 1 END) as with_correct_user
            FROM contract_documents
        """, (correct_user_id,))
        
        result = cursor.fetchone()
        if result['total'] > 0:
            percentage = (result['with_correct_user'] / result['total']) * 100
            status = "✅" if percentage == 100 else "⚠️"
            print(f"{status} contract_documents.uploaded_by: {result['with_correct_user']}/{result['total']} ({percentage:.0f}%)")
        
        cursor.close()
        conn.close()
        print("\n✅ Data fix completed successfully!")
        print(f"🎯 All data is now associated with user: {correct_user_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if 'conn' in locals():
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    fix_all_user_associations()