#!/usr/bin/env python3
import psycopg2
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def setup_staging_schema():
    db_url = os.getenv('SUPABASE_DB_URL')
    schema = os.getenv('SUPABASE_DB_SCHEMA', 'staging')

    print(f"🚀 Configurando schema: {schema}")

    parsed = urlparse(db_url)

    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password.replace('%40', '@')
    )
    conn.autocommit = True
    cur = conn.cursor()

    # Criar schema se não existir
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    print(f"✅ Schema {schema} criado/garantido")

    # Definir search_path
    cur.execute(f"SET search_path TO {schema}, public")

    # Criar tabelas principais baseadas no schema public
    tables_sql = f"""
    -- Clients table
    CREATE TABLE IF NOT EXISTS {schema}.clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18) UNIQUE,
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false
    );

    -- Contracts table
    CREATE TABLE IF NOT EXISTS {schema}.contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(255),
        client_id UUID REFERENCES {schema}.clients(id) ON DELETE CASCADE,
        start_date DATE,
        end_date DATE,
        value DECIMAL(10, 2),
        description TEXT,
        status VARCHAR(50),
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
    );

    -- Contract Documents table
    CREATE TABLE IF NOT EXISTS {schema}.contract_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID REFERENCES {schema}.contracts(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        content TEXT,
        user_id UUID
    );

    -- Maintenances table
    CREATE TABLE IF NOT EXISTS {schema}.maintenances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID REFERENCES {schema}.contracts(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Pendente',
        priority VARCHAR(20) DEFAULT 'Média',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id UUID,
        is_overdue BOOLEAN DEFAULT false
    );

    -- Generated Reports table
    CREATE TABLE IF NOT EXISTS {schema}.generated_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID REFERENCES {schema}.contracts(id) ON DELETE CASCADE,
        report_type VARCHAR(100) NOT NULL,
        content JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id UUID,
        agent_type VARCHAR(100)
    );

    -- AI Chat Messages table
    CREATE TABLE IF NOT EXISTS {schema}.ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message TEXT NOT NULL,
        response TEXT,
        files JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id UUID
    );

    -- Contract Analyses table
    CREATE TABLE IF NOT EXISTS {schema}.contract_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID REFERENCES {schema}.contracts(id) ON DELETE CASCADE,
        analysis_type VARCHAR(50) NOT NULL,
        content JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Maintenance Checklists table
    CREATE TABLE IF NOT EXISTS {schema}.maintenance_checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        maintenance_id UUID REFERENCES {schema}.maintenances(id) ON DELETE CASCADE,
        item_description TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by UUID,
        notes TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Client Stats table
    CREATE TABLE IF NOT EXISTS {schema}.client_stats (
        client_id UUID PRIMARY KEY REFERENCES {schema}.clients(id) ON DELETE CASCADE,
        total_contracts INTEGER DEFAULT 0,
        active_contracts INTEGER DEFAULT 0,
        total_value DECIMAL(10, 2) DEFAULT 0,
        last_contract_date DATE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON {schema}.contracts(client_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON {schema}.contracts(user_id);
    CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON {schema}.contract_documents(contract_id);
    CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON {schema}.maintenances(contract_id);
    CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON {schema}.maintenances(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_maintenances_status ON {schema}.maintenances(status);
    CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_id ON {schema}.generated_reports(contract_id);
    CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type ON {schema}.generated_reports(agent_type);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON {schema}.ai_chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_maintenance_id ON {schema}.maintenance_checklists(maintenance_id);
    """

    # Executar SQL para criar tabelas
    for statement in tables_sql.split(';'):
        statement = statement.strip()
        if statement:
            try:
                cur.execute(statement)
                if 'CREATE TABLE' in statement:
                    table_name = statement.split('CREATE TABLE IF NOT EXISTS')[1].split('(')[0].strip()
                    print(f"  ✅ Tabela {table_name} criada/verificada")
                elif 'CREATE INDEX' in statement:
                    index_name = statement.split('CREATE INDEX IF NOT EXISTS')[1].split('ON')[0].strip()
                    print(f"  ✅ Índice {index_name} criado/verificado")
            except Exception as e:
                print(f"  ⚠️ Erro ao executar: {e}")

    # Verificar tabelas criadas
    cur.execute(f"""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '{schema}'
        ORDER BY table_name;
    """)

    tables = cur.fetchall()

    print(f"\n✅ Total de {len(tables)} tabelas no schema {schema}:")
    for table in tables:
        print(f"  - {table[0]}")

    cur.close()
    conn.close()

    print("\n✅ Schema staging configurado com sucesso!")

if __name__ == "__main__":
    setup_staging_schema()