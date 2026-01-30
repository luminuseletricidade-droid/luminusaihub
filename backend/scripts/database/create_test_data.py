#!/usr/bin/env python3
"""
Script para criar dados de teste consistentes após reset completo
"""
import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta

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

async def create_test_data():
    print("🏗️  Criando dados de teste para sistema limpo...")
    
    # 1. Login com usuário teste
    print("\n1️⃣ Fazendo login com teste@teste.com...")
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": "teste@teste.com",
            "password": "teste@teste"
        })
        user_id = auth_response.user.id
        print(f"✅ Login realizado - User ID: {user_id}")
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return
    
    # 2. Criar clientes
    print("\n2️⃣ Criando clientes...")
    
    clients_data = [
        {
            'name': 'Energia Verde Ltda',
            'cnpj': '11.222.333/0001-44',
            'email': 'contato@energiaverde.com',
            'phone': '(11) 3333-4444',
            'address': 'Av. Sustentável, 321, Centro',
            'contact_person': 'Ana Costa',
            'city': 'São Paulo',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'Solar Tech EIRELI',
            'cnpj': '22.333.444/0001-55',
            'email': 'admin@solartech.com.br',
            'phone': '(11) 4444-5555',
            'address': 'Rua das Placas, 456, Vila Solar',
            'contact_person': 'João Santos',
            'city': 'São Paulo',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'EcoEnergia Corp',
            'cnpj': '33.444.555/0001-66',
            'email': 'suporte@ecoenergia.com',
            'phone': '(13) 5555-6666',
            'address': 'Av. Renovável, 789, Jardim Ecológico',
            'contact_person': 'Maria Lima',
            'city': 'Santos',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'PowerSun Indústria',
            'cnpj': '44.555.666/0001-77',
            'email': 'vendas@powersun.com.br',
            'phone': '(19) 6666-7777',
            'address': 'Rod. Solar, km 10, Distrito Industrial',
            'contact_person': 'Carlos Oliveira',
            'city': 'Campinas',
            'state': 'SP',
            'user_id': user_id
        },
        {
            'name': 'Lumina Energia S.A.',
            'cnpj': '55.666.777/0001-88',
            'email': 'comercial@lumina.com.br',
            'phone': '(11) 7777-8888',
            'address': 'Alameda das Fontes, 150, Alto da Lapa',
            'contact_person': 'Patricia Silva',
            'city': 'São Paulo',
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
    
    if not created_clients:
        print("❌ Nenhum cliente foi criado. Parando execução.")
        return
    
    # 3. Criar contratos
    print("\n3️⃣ Criando contratos...")
    
    base_date = datetime.now()
    
    contracts_data = [
        {
            'contract_number': 'CONT-2025-001',
            'client_id': created_clients[0]['id'],
            'contract_type': 'maintenance',
            'start_date': (base_date - timedelta(days=60)).strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=305)).strftime('%Y-%m-%d'),
            'value': 18000.00,
            'description': 'Contrato de manutenção preventiva mensal - Energia Verde Ltda',
            'status': 'active',
            'maintenance_frequency': 'mensal',
            'equipment_type': 'Inversor Solar',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-2025-002',
            'client_id': created_clients[1]['id'],
            'contract_type': 'installation',
            'start_date': (base_date - timedelta(days=30)).strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=120)).strftime('%Y-%m-%d'),
            'value': 75000.00,
            'description': 'Instalação de sistema solar fotovoltaico 10kWp - Solar Tech',
            'status': 'active',
            'equipment_type': 'Sistema Completo',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-2025-003',
            'client_id': created_clients[2]['id'],
            'contract_type': 'maintenance',
            'start_date': (base_date - timedelta(days=15)).strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=350)).strftime('%Y-%m-%d'),
            'value': 32000.00,
            'description': 'Manutenção corretiva e preventiva - EcoEnergia Corp',
            'status': 'active',
            'maintenance_frequency': 'trimestral',
            'equipment_type': 'Painel Solar',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-2025-004',
            'client_id': created_clients[3]['id'],
            'contract_type': 'support',
            'start_date': base_date.strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=180)).strftime('%Y-%m-%d'),
            'value': 15000.00,
            'description': 'Suporte técnico especializado - PowerSun Indústria',
            'status': 'active',
            'equipment_type': 'Sistema Híbrido',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-2025-005',
            'client_id': created_clients[4]['id'],
            'contract_type': 'maintenance',
            'start_date': (base_date + timedelta(days=7)).strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=372)).strftime('%Y-%m-%d'),
            'value': 28000.00,
            'description': 'Manutenção preventiva bimensal - Lumina Energia',
            'status': 'pending',
            'maintenance_frequency': 'bimensal',
            'equipment_type': 'Inversor + Painéis',
            'user_id': user_id
        },
        {
            'contract_number': 'CONT-2025-006',
            'client_id': created_clients[1]['id'],
            'contract_type': 'warranty',
            'start_date': (base_date - timedelta(days=90)).strftime('%Y-%m-%d'),
            'end_date': (base_date + timedelta(days=275)).strftime('%Y-%m-%d'),
            'value': 8500.00,
            'description': 'Garantia estendida - Solar Tech EIRELI',
            'status': 'renewal',
            'equipment_type': 'Sistema Completo',
            'user_id': user_id
        }
    ]
    
    created_contracts = []
    for contract_data in contracts_data:
        try:
            result = supabase.table('contracts').insert(contract_data).execute()
            created_contracts.append(result.data[0])
            print(f"✅ Contrato criado: {contract_data['contract_number']} - {contract_data['status']}")
        except Exception as e:
            print(f"❌ Erro ao criar contrato {contract_data['contract_number']}: {e}")
    
    if not created_contracts:
        print("❌ Nenhum contrato foi criado.")
        return
    
    # 4. Criar manutenções
    print("\n4️⃣ Criando manutenções...")
    
    maintenances_data = [
        {
            'contract_id': created_contracts[0]['id'],
            'type': 'preventiva',
            'scheduled_date': (base_date + timedelta(days=3)).strftime('%Y-%m-%d'),
            'scheduled_time': '08:00:00',
            'status': 'scheduled',
            'description': 'Inspeção mensal preventiva - Energia Verde',
            'technician': 'João Silva',
            'notes': 'Verificação geral do sistema e limpeza dos painéis',
            'priority': 'medium',
            'estimated_duration': 120,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[2]['id'],
            'type': 'corretiva',
            'scheduled_date': (base_date + timedelta(days=5)).strftime('%Y-%m-%d'),
            'scheduled_time': '14:00:00',
            'status': 'scheduled',
            'description': 'Reparo de inversor - EcoEnergia Corp',
            'technician': 'Maria Santos',
            'notes': 'Substituição de componente defeituoso no inversor',
            'priority': 'high',
            'estimated_duration': 180,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[1]['id'],
            'type': 'preventiva',
            'scheduled_date': (base_date + timedelta(days=7)).strftime('%Y-%m-%d'),
            'scheduled_time': '09:30:00',
            'status': 'scheduled',
            'description': 'Limpeza e inspeção - Solar Tech',
            'technician': 'Carlos Souza',
            'notes': 'Limpeza especializada e inspeção visual completa',
            'priority': 'low',
            'estimated_duration': 90,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[0]['id'],
            'type': 'preventiva',
            'scheduled_date': (base_date + timedelta(days=10)).strftime('%Y-%m-%d'),
            'scheduled_time': '15:30:00',
            'status': 'scheduled',
            'description': 'Manutenção trimestral - Energia Verde',
            'technician': 'Roberto Lima',
            'notes': 'Manutenção completa com relatório detalhado',
            'priority': 'medium',
            'estimated_duration': 240,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[3]['id'],
            'type': 'diagnostica',
            'scheduled_date': (base_date + timedelta(days=12)).strftime('%Y-%m-%d'),
            'scheduled_time': '10:00:00',
            'status': 'scheduled',
            'description': 'Diagnóstico completo - PowerSun',
            'technician': 'Ana Costa',
            'notes': 'Análise detalhada de performance do sistema',
            'priority': 'medium',
            'estimated_duration': 150,
            'user_id': user_id
        },
        {
            'contract_id': created_contracts[2]['id'],
            'type': 'corretiva',
            'scheduled_date': (base_date - timedelta(days=2)).strftime('%Y-%m-%d'),
            'scheduled_time': '11:30:00',
            'status': 'completed',
            'description': 'Reparo emergencial - EcoEnergia',
            'technician': 'Pedro Oliveira',
            'notes': 'Reparo realizado com sucesso. Duração real: 95min',
            'priority': 'high',
            'estimated_duration': 90,
            'user_id': user_id
        }
    ]
    
    created_maintenances = []
    for maintenance_data in maintenances_data:
        try:
            result = supabase.table('maintenances').insert(maintenance_data).execute()
            created_maintenances.append(result.data[0])
            print(f"✅ Manutenção criada: {maintenance_data['description']} - {maintenance_data['status']}")
        except Exception as e:
            print(f"❌ Erro ao criar manutenção: {e}")
    
    # 5. Verificar dados criados
    print("\n5️⃣ Verificando dados criados...")
    
    for table in ['clients', 'contracts', 'maintenances']:
        try:
            result = supabase.table(table).select('*', count='exact').eq('user_id', user_id).execute()
            count = result.count
            print(f"📊 {table}: {count} registros")
        except Exception as e:
            print(f"❌ Erro ao contar {table}: {e}")
    
    # 6. Teste da API do backend
    print("\n6️⃣ Testando APIs do backend...")
    
    try:
        import requests
        
        # Endpoint de dashboard
        headers = {
            'Authorization': f'Bearer {auth_response.session.access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('http://localhost:8000/api/dashboard-metrics', headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard API: {data}")
        else:
            print(f"⚠️ Dashboard API retornou status {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Erro ao testar API: {e}")
    
    print("\n✅ Dados de teste criados com sucesso!")
    print(f"👤 User ID: {user_id}")
    print(f"📊 Total: {len(created_clients)} clientes, {len(created_contracts)} contratos, {len(created_maintenances)} manutenções")
    print("📧 Login: teste@teste.com")
    print("🔑 Senha: teste@teste")
    
    return user_id

if __name__ == "__main__":
    asyncio.run(create_test_data())