#!/bin/bash

# Script para forçar rebuild no Railway
# Este script limpa caches e força uma nova build

echo "🚀 Forçando rebuild no Railway..."

# Limpar cache do bun
echo "🧹 Limpando cache do bun..."
bun pm cache rm

# Limpar node_modules e reinstalar
echo "🗑️ Removendo node_modules..."
rm -rf node_modules
rm -rf dist

# Reinstalar dependências
echo "📦 Reinstalando dependências..."
bun install

# Build limpo
echo "🔨 Executando build limpo..."
bun run build

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📊 Tamanho do build:"
    du -sh dist/
else
    echo "❌ Erro no build!"
    exit 1
fi

echo "🎯 Pronto para deploy no Railway!"
