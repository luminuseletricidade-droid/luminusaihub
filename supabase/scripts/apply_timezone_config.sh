#!/bin/bash

# Script para aplicar configuração de timezone no Supabase
# Usage: ./apply_timezone_config.sh

set -e

echo "🌍 Aplicando configuração de timezone no Supabase..."
echo ""

# Verificar se .env existe
if [ ! -f "backend/.env" ]; then
    echo "❌ Arquivo backend/.env não encontrado"
    echo "Por favor, configure SUPABASE_DB_URL no backend/.env"
    exit 1
fi

# Carregar variáveis de ambiente
source backend/.env

# Verificar se SUPABASE_DB_URL está configurado
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL não está configurado no backend/.env"
    exit 1
fi

echo "✅ Conectando ao Supabase..."
echo ""

# Aplicar migration
echo "📝 Aplicando migration 00026_set_default_timezone.sql..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/00026_set_default_timezone.sql

echo ""
echo "✅ Migration aplicada com sucesso!"
echo ""

# Verificar configuração
echo "🔍 Verificando configuração de timezone..."
echo ""

psql "$SUPABASE_DB_URL" -c "SHOW timezone;"
echo ""

psql "$SUPABASE_DB_URL" -c "SELECT * FROM _timezone_config ORDER BY configured_at DESC LIMIT 1;"
echo ""

echo "✅ Configuração de timezone completa!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar colunas com timezone: SELECT * FROM v_timezone_info;"
echo "2. Testar funções: SELECT now_local(), format_datetime_br(NOW());"
echo "3. Reiniciar backend para aplicar timezone"
echo ""
