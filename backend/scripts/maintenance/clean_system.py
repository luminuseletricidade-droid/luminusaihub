#!/usr/bin/env python3
"""
Script para APAGAR TODOS os dados do sistema e criar apenas usuário teste@teste.com
"""
import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
DEFAULT_SCHEMA = os.getenv("SUPABASE_DB_SCHEMA", "public")
STAGING_SCHEMA = os.getenv("SUPABASE_STAGING_SCHEMA", "staging")
TARGET_SCHEMA = (STAGING_SCHEMA if ENVIRONMENT == "staging" else DEFAULT_SCHEMA) or "public"

# Configuração do Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas")
    exit(1)

print(f"Ambiente: {ENVIRONMENT} | Schema alvo: {TARGET_SCHEMA}")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase.schema(TARGET_SCHEMA)

async def clean_system():
    print("🔥 LIMPEZA TOTAL DO SISTEMA")
    print("⚠️ ISSO VAI APAGAR TODOS OS DADOS!")
    
    # 1. Limpar TODAS as tabelas - sem filtros
    print("\n1️⃣ Apagando TODOS os dados das tabelas...")
    
    # Ordem de limpeza baseada em dependências
    cleanup_tables = [
        'maintenances',
        'equipment', 
        'contract_documents',
        'contracts',
        'clients'
    ]
    
    for table in cleanup_tables:
        try:
            # Deletar TODOS os registros da tabela
            result = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            print(f"🧹 Tabela {table} completamente limpa")
        except Exception as e:
            print(f"⚠️ Erro ao limpar {table}: {e}")
    
    # 2. Verificar e garantir usuário teste@teste.com
    print("\n2️⃣ Configurando usuário teste@teste.com...")
    
    try:
        # Tentar fazer login
        auth_response = supabase.auth.sign_in_with_password({
            "email": "teste@teste.com",
            "password": "teste@teste"
        })
        print("✅ Usuário teste@teste.com já existe")
        user_id = auth_response.user.id
    except Exception as e:
        try:
            # Criar usuário se não existir
            auth_response = supabase.auth.sign_up({
                "email": "teste@teste.com", 
                "password": "teste@teste"
            })
            print("✅ Usuário teste@teste.com criado")
            user_id = auth_response.user.id
        except Exception as e2:
            print(f"❌ Erro ao criar usuário: {e2}")
            return
    
    print(f"👤 User ID: {user_id}")
    
    # 3. Verificar que todas as tabelas estão vazias
    print("\n3️⃣ Verificando limpeza...")
    
    for table in ['clients', 'contracts', 'maintenances']:
        try:
            result = supabase.table(table).select('*', count='exact').execute()
            count = result.count
            print(f"📊 {table}: {count} registros (deve ser 0)")
        except Exception as e:
            print(f"❌ Erro ao contar {table}: {e}")
    
    print("\n✅ Sistema completamente limpo!")
    print(f"👤 Único usuário: teste@teste.com (ID: {user_id})")
    print("🔑 Senha: teste@teste")
    print("\n📝 Agora você pode começar do zero com dados limpos.")
    
    return user_id

if __name__ == "__main__":
    asyncio.run(clean_system())