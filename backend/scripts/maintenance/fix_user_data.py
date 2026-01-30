#!/usr/bin/env python3
"""
Script para corrigir user_id nos contratos existentes
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

def get_db_connection():
    """Criar conexão com o banco de dados"""
    database_url = os.getenv('SUPABASE_DB_URL')
    if not database_url:
        raise ValueError("SUPABASE_DB_URL não encontrada no .env")
    
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def fix_user_ids():
    """Corrigir user_ids nos contratos"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # ID do usuário de teste do backend Python
        backend_user_id = 'acf73965-477e-45c4-875b-8b5e982354d3'
        
        # Primeiro, vamos ver todos os contratos
        cur.execute("SELECT id, user_id, client_name, created_at FROM contracts")
        contracts = cur.fetchall()
        
        logger.info(f"📋 Total de contratos encontrados: {len(contracts)}")
        
        for contract in contracts:
            logger.info(f"  - Contract ID: {contract['id'][:8]}... | User ID: {contract['user_id']} | Cliente: {contract['client_name']}")
        
        # Contar contratos sem user_id ou com user_id diferente
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM contracts 
            WHERE user_id IS NULL OR user_id != %s
        """, (backend_user_id,))
        result = cur.fetchone()
        contracts_to_fix = result['count']
        
        if contracts_to_fix > 0:
            logger.info(f"🔧 Encontrados {contracts_to_fix} contratos para corrigir")
            
            # Atualizar todos os contratos para o usuário de teste
            cur.execute("""
                UPDATE contracts 
                SET user_id = %s 
                WHERE user_id IS NULL OR user_id != %s
            """, (backend_user_id, backend_user_id))
            
            conn.commit()
            logger.info(f"✅ {cur.rowcount} contratos atualizados com user_id: {backend_user_id}")
            
            # Também atualizar clients
            cur.execute("""
                UPDATE clients 
                SET user_id = %s 
                WHERE user_id IS NULL OR user_id != %s
            """, (backend_user_id, backend_user_id))
            
            conn.commit()
            logger.info(f"✅ {cur.rowcount} clientes atualizados com user_id: {backend_user_id}")
            
            # Também atualizar maintenances
            cur.execute("""
                UPDATE maintenances 
                SET user_id = %s 
                WHERE user_id IS NULL OR user_id != %s
            """, (backend_user_id, backend_user_id))
            
            conn.commit()
            logger.info(f"✅ {cur.rowcount} manutenções atualizadas com user_id: {backend_user_id}")
            
        else:
            logger.info("✅ Todos os contratos já estão com o user_id correto")
        
        # Verificar resultado final
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM contracts 
            WHERE user_id = %s
        """, (backend_user_id,))
        result = cur.fetchone()
        
        logger.info(f"📊 Total de contratos do usuário {backend_user_id}: {result['count']}")
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    logger.info("🚀 Iniciando correção de user_ids...")
    fix_user_ids()
    logger.info("✅ Correção concluída!")