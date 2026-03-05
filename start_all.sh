#!/bin/bash
#
# Iniciar Frontend + Backend do Luminus AI Hub
#

set -e

cd /Users/eduardoulyssea/Downloads/luminus-ai-hub-main

echo "================================================================================"
echo "                  INICIANDO LUMINUS AI HUB COMPLETO"
echo "================================================================================"
echo ""

# Iniciar backend
echo "1. Iniciando Backend (FastAPI)..."
cd backend

# Ativar venv se existir
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "   ✓ venv ativado"
fi

# Instalar uvicorn se necessário
pip3 install uvicorn fastapi python-dotenv -q 2>/dev/null || true

# Iniciar backend em background
nohup uvicorn main:app --host 0.0.0.0 --port 8001 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!

echo "   ✓ Backend iniciado (PID: $BACKEND_PID)"
echo "   📝 Logs: backend.log"

# Aguardar backend iniciar
echo "   Aguardando backend..."
sleep 5

# Testar backend
if curl -s http://localhost:8001 > /dev/null 2>&1; then
    echo "   ✅ Backend respondendo em http://localhost:8001"
else
    echo "   ⚠️  Backend pode não estar totalmente pronto. Veja backend.log"
fi

cd ..

# Iniciar frontend
echo ""
echo "2. Iniciando Frontend (Vite)..."

# Frontend em foreground (para ver logs)
echo ""
echo "================================================================================"
echo "  SISTEMA INICIADO!"
echo "================================================================================"
echo ""
echo "🌐 Frontend: http://localhost:8080/"
echo "🔌 Backend:  http://localhost:8001/"
echo ""
echo "🔐 Login:"
echo "   Email: luminus@gmail.com"
echo "   Senha: 1235678"
echo ""
echo "📝 Logs do backend: backend.log"
echo ""
echo "Para parar: Ctrl+C (frontend) e pkill -f 'uvicorn main:app' (backend)"
echo ""
echo "================================================================================"
echo ""

npm run dev
