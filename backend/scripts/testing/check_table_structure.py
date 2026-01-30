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
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    
    # Check generated_reports structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        ORDER BY ordinal_position
    """)
    
    columns = cursor.fetchall()
    print("📊 generated_reports table structure:")
    print("-" * 50)
    for col in columns:
        print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
    
    # Check some data
    cursor.execute("""
        SELECT id, report_type, user_id, created_at
        FROM generated_reports
        LIMIT 5
    """)
    
    reports = cursor.fetchall()
    print("\n📊 Sample generated_reports data:")
    print("-" * 50)
    for report in reports:
        print(f"  ID: {report['id']}")
        print(f"  Type: {report.get('report_type', 'N/A')}")
        print(f"  User ID: {report.get('user_id', 'N/A')}")
        print(f"  Created: {report.get('created_at', 'N/A')}")
        print("-" * 50)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)