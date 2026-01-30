#!/usr/bin/env python3
"""
Script para aplicar migration - adicionar coluna agent_type
"""

import os
import psycopg2
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

def apply_migration():
    """Aplicar migration para adicionar coluna agent_type"""
    database_url = os.getenv('SUPABASE_DB_URL')
    if not database_url:
        raise ValueError("SUPABASE_DB_URL não encontrada no .env")
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Adicionar coluna agent_type
        cur.execute("""
            ALTER TABLE generated_reports 
            ADD COLUMN IF NOT EXISTS agent_type TEXT
        """)
        logger.info("✅ Coluna agent_type adicionada")
        
        # Criar índices
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type 
            ON generated_reports(agent_type)
        """)
        logger.info("✅ Índice agent_type criado")
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_agent 
            ON generated_reports(contract_id, agent_type)
        """)
        logger.info("✅ Índice composto criado")
        
        conn.commit()
        logger.info("✅ Migration aplicada com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    logger.info("🚀 Aplicando migration...")
    apply_migration()
    logger.info("✅ Concluído!")