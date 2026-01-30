#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

ENVIRONMENT = os.getenv('ENVIRONMENT', 'production').lower()
DEFAULT_SCHEMA = os.getenv('SUPABASE_DB_SCHEMA', 'public')
STAGING_SCHEMA = os.getenv('SUPABASE_STAGING_SCHEMA', 'staging')
TARGET_SCHEMA = (STAGING_SCHEMA if ENVIRONMENT == 'staging' else DEFAULT_SCHEMA) or 'public'

# Get database URL
database_url = os.getenv('SUPABASE_DB_URL')
if not database_url:
    print("❌ SUPABASE_DB_URL not found in environment")
    sys.exit(1)

try:
    # Connect to database with schema-aware search_path
    conn = psycopg2.connect(
        database_url,
        cursor_factory=RealDictCursor,
        options=f"-c search_path={TARGET_SCHEMA},public"
    )
    cursor = conn.cursor()
    print(f"📦 Target schema: {TARGET_SCHEMA} (env={ENVIRONMENT})")
    
    # Create chat_sessions table
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TARGET_SCHEMA}.chat_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            agent_id UUID REFERENCES {TARGET_SCHEMA}.ai_agents(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            title TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    
    print("✅ Table chat_sessions created!")
    
    # Create chat_messages table
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TARGET_SCHEMA}.chat_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            session_id UUID REFERENCES {TARGET_SCHEMA}.chat_sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    
    print("✅ Table chat_messages created!")
    
    # Create indexes for better performance
    cursor.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON {TARGET_SCHEMA}.chat_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON {TARGET_SCHEMA}.chat_sessions(agent_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON {TARGET_SCHEMA}.chat_messages(session_id);
    """)
    
    print("✅ Indexes created!")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("\n✅ Chat tables setup completed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if 'conn' in locals():
        conn.rollback()
    sys.exit(1)
