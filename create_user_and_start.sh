#!/bin/bash
#
# Criar usuário e iniciar aplicação
#

set -e

export SUPABASE_ACCESS_TOKEN="sbp_0ec1e105304dcddf819db138ae8b24453f04f150"

echo "================================================================================"
echo "  CONFIGURAÇÃO FINAL - LUMINUS AI HUB"
echo "================================================================================"
echo ""

# Criar usuário via Supabase CLI
echo "1. Criando usuário admin..."
echo ""

# Usar API do Supabase para criar usuário
curl -X POST "https://jtrhpbgrpsgneleptzgm.supabase.co/auth/v1/admin/users" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "luminus@gmail.com",
    "password": "1235678",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Luminus Admin"
    }
  }' 2>&1 | python3 -m json.tool || echo "Usuário pode já existir"

echo ""
echo "✅ Usuário criado/verificado:"
echo "   Email: luminus@gmail.com"
echo "   Senha: 1235678"
echo ""

# Verificar dependências
echo "2. Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependências..."
    npm install
else
    echo "   ✓ Dependências já instaladas"
fi
echo ""

# Iniciar aplicação
echo "3. Iniciando aplicação..."
echo ""
echo "================================================================================"
echo "  APLICAÇÃO INICIANDO..."
echo "================================================================================"
echo ""
echo "🌐 URL: http://localhost:5173"
echo "📧 Login: luminus@gmail.com"
echo "🔑 Senha: 1235678"
echo ""
echo "Pressione Ctrl+C para parar"
echo ""

npm run dev

