#!/usr/bin/env python3
"""
Script para limpar e recriar dados de teste consistentes
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

async def reset_test_data():
    print("🧹 Iniciando limpeza e recriação de dados de teste...")
    
    # 1. Criar/verificar usuário teste
    print("\n1️⃣ Criando usuário teste@teste.com...")
    
    # Primeiro, tentar fazer login para ver se o usuário existe
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": "teste@teste.com",
            "password": "teste@teste"
        })
        print("✅ Usuário teste@teste.com já existe")
        user_id = auth_response.user.id
    except Exception as e:
        # Se não existe, criar
        try:
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
    
    # 2. Limpar dados existentes
    print("\n2️⃣ Limpando dados existentes...")
    
    tables_to_clean = ['maintenances', 'contracts', 'clients']
    
    for table in tables_to_clean:
        try:
            result = supabase.table(table).delete().eq('user_id', user_id).execute()
            print(f"🧹 Limpou tabela {table}")
        except Exception as e:
            print(f"⚠️ Erro ao limpar {table}: {e}")
    
    # 3. Criar clientes
    print("\n3️⃣ Criando clientes...")
    
    clients_data = [
        {
            'name': 'Energia Verde Ltda',
            'cnpj': '11.222.333/0001-44',
            'email': 'contato@energiaverde.com',
            'phone': '(11) 66666-6666',
            'address': 'Av. Sustentável, 321',
            'contact_person': 'Ana Costa',
            'city': 'São Paulo',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'Solar Tech EIRELI',
            'cnpj': '22.333.444/0001-55',
            'email': 'admin@solartech.com.br',
            'phone': '(11) 77777-7777',
            'address': 'Rua das Placas, 456',
            'contact_person': 'João Santos',
            'city': 'São Paulo',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'EcoEnergia Corp',
            'cnpj': '33.444.555/0001-66',
            'email': 'suporte@ecoenergia.com',
            'phone': '(11) 88888-8888',
            'address': 'Av. Renovável, 789',
            'contact_person': 'Maria Lima',
            'city': 'Santos',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'PowerSun Indústria',
            'cnpj': '44.555.666/0001-77',
            'email': 'vendas@powersun.com.br',
            'phone': '(11) 99999-9999',
            'address': 'Rod. Solar, km 10',
            'contact_person': 'Carlos Oliveira',
            'city': 'Campinas',
            'state': 'SP',
            'user_id': user_id
        }
    ]
    
    created_clients = []
    for client_data in clients_data:
        try:
            result = supabase.table('clients').insert(client_data).execute()
            created_clients.append(result.data[0])
            print(f"✅ Cliente criado: {client_data['name']}")
        except Exception as e:
            print(f"❌ Erro ao criar cliente {client_data['name']}: {e}")
    
    # 4. Criar contratos
    print("\n4️⃣ Criando contratos...")
    
    contracts_data = [
        {
            'contract_number': 'CONT-001',
            'client_id': created_clients[0]['id'],
            'contract_type': 'maintenance',
            'start_date': '2024-01-01',
            'end_date': '2024-12-31',
            'value': 15000.00,
            'description': 'Contrato de manutenção preventiva - Energia Verde',
            'status': 'active',
            'maintenance_frequency': 'mensal',
            'equipment_type': 'Inversor Solar',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-002',
            'client_id': created_clients[1]['id'],
            'contract_type': 'installation',
            'start_date': '2024-02-01',
            'end_date': '2024-06-30',
            'value': 50000.00,
            'description': 'Instalação de sistema solar - SolarTech',
            'status': 'active',
            'equipment_type': 'Sistema Completo',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-003',
            'client_id': created_clients[2]['id'],
            'contract_type': 'maintenance',
            'start_date': '2024-03-01',
            'end_date': '2025-03-01',
            'value': 25000.00,
            'description': 'Manutenção corretiva - EcoEnergia',
            'status': 'renewal',
            'maintenance_frequency': 'trimestral',
            'equipment_type': 'Painel Solar',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-004',
            'client_id': created_clients[3]['id'],
            'contract_type': 'support',
            'start_date': '2024-04-01',
            'end_date': '2024-10-31',
            'value': 12000.00,
            'description': 'Suporte técnico - PowerSun',
            'status': 'active',
            'equipment_type': 'Sistema Híbrido',
            'user_id': user_id
        }
    ]
    
    created_contracts = []
    for contract_data in contracts_data:
        try:
            result = supabase.table('contracts').insert(contract_data).execute()
            created_contracts.append(result.data[0])
            print(f"✅ Contrato criado: {contract_data['contract_number']}")
        except Exception as e:
            print(f"❌ Erro ao criar contrato {contract_data['contract_number']}: {e}")
    
    # 5. Criar manutenções
    print("\n5️⃣ Criando manutenções...")
    
    maintenances_data = [
        {
            'contract_id': created_contracts[0]['id'],
            'type': 'preventiva',
            'scheduled_date': '2025-09-15',
            'scheduled_time': '08:00:00',
            'status': 'scheduled',
            'description': 'Inspeção mensal - Energia Verde',
            'technician': 'João Silva',
            'notes': 'Verificação geral do sistema',
            'priority': 'medium',
            'estimated_duration': 120,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[2]['id'],
            'type': 'corretiva',
            'scheduled_date': '2025-09-16',
            'scheduled_time': '14:00:00',
            'status': 'scheduled',
            'description': 'Reparo de inversor - EcoEnergia',
            'technician': 'Maria Santos',
            'notes': 'Substituição de componente defeituoso',
            'priority': 'high',
            'estimated_duration': 180,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[1]['id'],
            'type': 'preventiva',
            'scheduled_date': '2025-09-17',
            'scheduled_time': '09:30:00',
            'status': 'scheduled',
            'description': 'Limpeza de painéis - SolarTech',
            'technician': 'Carlos Souza',
            'notes': 'Limpeza e inspeção visual',
            'priority': 'low',
            'estimated_duration': 90,
            'user_id': user_id
        }
    ]
    
    for maintenance_data in maintenances_data:
        try:
            result = supabase.table('maintenances').insert(maintenance_data).execute()
            print(f"✅ Manutenção criada: {maintenance_data['description']}")
        except Exception as e:
            print(f"❌ Erro ao criar manutenção: {e}")
    
    # 6. Verificar dados criados
    print("\n6️⃣ Verificando dados criados...")
    
    # Contar registros por tabela
    for table in ['clients', 'contracts', 'maintenances']:
        try:
            result = supabase.table(table).select('*', count='exact').eq('user_id', user_id).execute()
            count = result.count
            print(f"📊 {table}: {count} registros")
        except Exception as e:
            print(f"❌ Erro ao contar {table}: {e}")
    
    print("\n✅ Recriação de dados concluída!")
    print(f"👤 User ID: {user_id}")
    print("📧 Email: teste@teste.com")
    print("🔑 Senha: teste@teste")
    
    return user_id

if __name__ == "__main__":
    asyncio.run(reset_test_data())