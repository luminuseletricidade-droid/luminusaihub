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
    
    # The correct user_id
    correct_user_id = 'acf73965-477e-45c4-875b-8b5e982354d3'
    
    # Update all generated_reports to correct user
    cursor.execute("""
        UPDATE generated_reports 
        SET user_id = %s
        WHERE user_id != %s
        RETURNING id, report_type, created_at
    """, (correct_user_id, correct_user_id))
    
    updated_reports = cursor.fetchall()
    print(f"✅ Updated {len(updated_reports)} generated reports")
    
    for report in updated_reports:
        print(f"   - Report {report['id'][:8]}... ({report['report_type']})")
    
    # Commit changes
    conn.commit()
    
    # Verify
    cursor.execute("""
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN user_id = %s THEN 1 END) as correct
        FROM generated_reports
    """, (correct_user_id,))
    
    result = cursor.fetchone()
    print(f"\n📊 Verification: {result['correct']}/{result['total']} reports with correct user")
    
    cursor.close()
    conn.close()
    
    print("✅ Fixed generated_reports successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if 'conn' in locals():
        conn.rollback()
    sys.exit(1)