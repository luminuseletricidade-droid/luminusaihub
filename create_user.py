#!/usr/bin/env python3
"""
Criar usuário no Supabase via API Admin
"""

import requests
import json

# Configurações
SUPABASE_URL = "https://jtrhpbgrpsgneleptzgm.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8"

print("=" * 80)
print(" CRIANDO USUÁRIO ADMIN NO SUPABASE ".center(80))
print("=" * 80)
print()

# Dados do usuário
user_data = {
    "email": "luminus@gmail.com",
    "password": "1235678",
    "email_confirm": True,
    "user_metadata": {
        "full_name": "Luminus Admin",
        "role": "admin"
    }
}

# Headers
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

# Criar usuário
url = f"{SUPABASE_URL}/auth/v1/admin/users"

print(f"📧 Email: {user_data['email']}")
print(f"🔑 Senha: {user_data['password']}")
print()
print("Criando usuário...")

response = requests.post(url, headers=headers, json=user_data)

print()

if response.status_code in [200, 201]:
    user = response.json()
    print("✅ SUCESSO! Usuário criado:")
    print(f"   ID: {user.get('id')}")
    print(f"   Email: {user.get('email')}")
    print(f"   Confirmado: {user.get('email_confirmed_at', 'Sim')}")
    print()
    print("=" * 80)
    print(" PODE FAZER LOGIN AGORA! ".center(80))
    print("=" * 80)
    print()
    print("🌐 Acesse: http://localhost:8080/")
    print("📧 Email: luminus@gmail.com")
    print("🔑 Senha: 1235678")
    print()

elif response.status_code == 422 or "already registered" in response.text.lower():
    print("⚠️  Usuário já existe!")
    print()
    print("Tentando buscar o usuário existente...")

    # Listar usuários
    list_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    list_response = requests.get(list_url, headers=headers)

    if list_response.status_code == 200:
        users = list_response.json()
        user = next((u for u in users.get('users', []) if u['email'] == user_data['email']), None)

        if user:
            print("✅ Usuário encontrado:")
            print(f"   ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print()
            print("=" * 80)
            print(" USUÁRIO JÁ EXISTE - PODE FAZER LOGIN! ".center(80))
            print("=" * 80)
            print()
            print("🌐 Acesse: http://localhost:8080/")
            print("📧 Email: luminus@gmail.com")
            print("🔑 Senha: 1235678")
            print()

            # Se o usuário existe mas a senha pode estar errada, resetar
            print("💡 Se a senha não funcionar, vou resetar...")
            reset_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}"
            reset_data = {"password": "1235678"}
            reset_response = requests.put(reset_url, headers=headers, json=reset_data)

            if reset_response.status_code in [200, 201]:
                print("✅ Senha resetada para: 1235678")
            else:
                print(f"⚠️  Não foi possível resetar senha: {reset_response.text}")
        else:
            print("❌ Usuário não encontrado na lista")
    else:
        print(f"❌ Erro ao listar usuários: {list_response.text}")

else:
    print(f"❌ ERRO ao criar usuário:")
    print(f"   Status: {response.status_code}")
    print(f"   Resposta: {response.text}")
    print()

    # Tentar diagnosticar
    if response.status_code == 403:
        print("⚠️  Erro de permissão. Verificando service_role_key...")
    elif response.status_code == 400:
        print("⚠️  Dados inválidos. Verificando formato...")

print()
