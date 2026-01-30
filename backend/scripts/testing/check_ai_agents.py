#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor, Json

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
    
    # Check if ai_agents table exists
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = %s 
            AND table_name = 'ai_agents'
        )
        """,
        (TARGET_SCHEMA,)
    )
    
    table_exists = cursor.fetchone()['exists']
    
    if not table_exists:
        print("❌ Table 'ai_agents' does not exist!")
        print("Creating ai_agents table...")
        
        # Create ai_agents table
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {TARGET_SCHEMA}.ai_agents (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                avatar TEXT,
                capabilities JSONB,
                user_id UUID NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        conn.commit()
        print("✅ Table ai_agents created!")
    else:
        print("✅ Table ai_agents exists")
        
        # Count AI agents
        cursor.execute(f"SELECT COUNT(*) as total FROM {TARGET_SCHEMA}.ai_agents")
        total = cursor.fetchone()['total']
        print(f"📊 Total AI agents in database: {total}")
        
        if total == 0:
            print("No AI agents found. Creating default agents...")
            
            # The correct user_id
            user_id = 'acf73965-477e-45c4-875b-8b5e982354d3'
            
            # Create default AI agents
            agents = [
                {
                    'name': 'Conversa Geral',
                    'type': 'general',
                    'description': 'Assistente inteligente para todas as suas necessidades',
                    'avatar': '💬',
                    'capabilities': {
                        'analysis': True,
                        'assistance': True,
                        'processing': True
                    }
                },
                {
                    'name': 'Análise de Documentos',
                    'type': 'document',
                    'description': 'Especialista em análise e extração de informações de documentos',
                    'avatar': '📄',
                    'capabilities': {
                        'ocr': True,
                        'extraction': True,
                        'analysis': True
                    }
                },
                {
                    'name': 'Assistência Geral',
                    'type': 'assistant',
                    'description': 'Assistente para ajuda geral e suporte',
                    'avatar': '🤖',
                    'capabilities': {
                        'support': True,
                        'guidance': True,
                        'help': True
                    }
                },
                {
                    'name': 'Processamento de Dados',
                    'type': 'processor',
                    'description': 'Processamento e análise avançada de dados',
                    'avatar': '⚙️',
                    'capabilities': {
                        'processing': True,
                        'analytics': True,
                        'reporting': True
                    }
                }
            ]
            
            for agent in agents:
                cursor.execute(
                    f"""
                    INSERT INTO {TARGET_SCHEMA}.ai_agents (name, type, description, avatar, capabilities, user_id)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s)
                    """,
                    (
                        agent['name'],
                        agent['type'],
                        agent['description'],
                        agent['avatar'],
                        Json(agent['capabilities']),
                        user_id
                    )
                )
            
            conn.commit()
            print(f"✅ Created {len(agents)} default AI agents")
        else:
            # List existing agents
            cursor.execute(
                f"""
                SELECT id, name, type, user_id 
                FROM {TARGET_SCHEMA}.ai_agents 
                ORDER BY created_at
                """
            )
            
            agents = cursor.fetchall()
            print("\n📋 Existing AI agents:")
            for agent in agents:
                print(f"  - {agent['name']} ({agent['type']}) - User: {agent['user_id'][:8]}...")
    
    cursor.close()
    conn.close()
    print("\n✅ AI agents check completed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if 'conn' in locals():
        conn.rollback()
    sys.exit(1)
