#!/bin/bash

# Script para configurar logging no frontend
# Uso: ./scripts/setup-logging.sh [development|production]

MODE=${1:-development}

echo "🔧 Configurando sistema de logging para modo: $MODE"

# Verificar se o arquivo .env.local existe
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cp env.example .env.local
    echo "✅ Arquivo .env.local criado a partir do exemplo"
fi

# Configurações baseadas no modo
if [ "$MODE" = "development" ]; then
    echo "🔍 Configurando para DESENVOLVIMENTO..."
    
    # Atualizar .env.local com configurações de desenvolvimento
    sed -i.bak 's/VITE_ENABLE_DEBUG=.*/VITE_ENABLE_DEBUG=true/' .env.local
    sed -i.bak 's/VITE_LOG_LEVEL=.*/VITE_LOG_LEVEL=debug/' .env.local
    sed -i.bak 's/VITE_LOG_TO_CONSOLE=.*/VITE_LOG_TO_CONSOLE=true/' .env.local
    sed -i.bak 's/VITE_LOG_TO_STORAGE=.*/VITE_LOG_TO_STORAGE=true/' .env.local
    sed -i.bak 's/VITE_LOG_TO_BACKEND=.*/VITE_LOG_TO_BACKEND=false/' .env.local
    
    echo "✅ Configurações de desenvolvimento aplicadas:"
    echo "   - Debug: HABILITADO"
    echo "   - Log Level: DEBUG (mais verboso)"
    echo "   - Console: HABILITADO"
    echo "   - Storage: HABILITADO"
    echo "   - Backend: DESABILITADO"
    
elif [ "$MODE" = "production" ]; then
    echo "🚀 Configurando para PRODUÇÃO..."
    
    # Atualizar .env.local com configurações de produção
    sed -i.bak 's/VITE_ENABLE_DEBUG=.*/VITE_ENABLE_DEBUG=false/' .env.local
    sed -i.bak 's/VITE_LOG_LEVEL=.*/VITE_LOG_LEVEL=error/' .env.local
    sed -i.bak 's/VITE_LOG_TO_CONSOLE=.*/VITE_LOG_TO_CONSOLE=false/' .env.local
    sed -i.bak 's/VITE_LOG_TO_STORAGE=.*/VITE_LOG_TO_STORAGE=false/' .env.local
    sed -i.bak 's/VITE_LOG_TO_BACKEND=.*/VITE_LOG_TO_BACKEND=true/' .env.local
    
    echo "✅ Configurações de produção aplicadas:"
    echo "   - Debug: DESABILITADO"
    echo "   - Log Level: ERROR (apenas erros)"
    echo "   - Console: DESABILITADO"
    echo "   - Storage: DESABILITADO"
    echo "   - Backend: HABILITADO"
    
else
    echo "❌ Modo inválido. Use 'development' ou 'production'"
    echo "Uso: $0 [development|production]"
    exit 1
fi

# Limpar arquivos de backup
rm -f .env.local.bak

echo ""
echo "🎯 Próximos passos:"
echo "1. Reinicie o servidor de desenvolvimento: npm run dev"
echo "2. Abra o console do navegador para ver os logs"
echo "3. No Dashboard, use o Debug Panel para visualizar logs"
echo "4. Para produção, configure o backend para receber logs"
echo ""
echo "📚 Documentação completa: docs/logging-frontend.md"
