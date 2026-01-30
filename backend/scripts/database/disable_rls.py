#!/usr/bin/env python3
"""
Script para desabilitar RLS temporariamente
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

def disable_rls():
    """Desabilitar RLS nas tabelas"""
    database_url = os.getenv('SUPABASE_DB_URL')
    if not database_url:
        raise ValueError("SUPABASE_DB_URL não encontrada no .env")
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Desabilitar RLS em todas as tabelas principais
        tables = ['contracts', 'clients', 'maintenances', 'equipment']
        
        for table in tables:
            try:
                cur.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
                logger.info(f"✅ RLS desabilitado para tabela: {table}")
            except Exception as e:
                logger.warning(f"⚠️ Erro ao desabilitar RLS em {table}: {e}")
        
        conn.commit()
        logger.info("✅ RLS desabilitado em todas as tabelas")
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    logger.info("🚀 Desabilitando RLS...")
    disable_rls()
    logger.info("✅ Concluído!")