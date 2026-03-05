#!/bin/bash

# Script para aplicar migrations do Supabase
# Autor: Claude Code
# Data: 2026-02-11

set -e  # Parar se houver erro

PROJECT_ID="asdvxynilrurillrhsyj"
MIGRATIONS_DIR="supabase/migrations"

echo "========================================="
echo "  Aplicação de Migrations - Supabase"
echo "========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo ""
    echo "Instale com: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI encontrado${NC}"

# Verificar se está logado
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠ Você não está logado no Supabase${NC}"
    echo ""
    echo "Fazendo login..."
    supabase login
fi

echo -e "${GREEN}✓ Autenticado no Supabase${NC}"

# Contar migrations
TOTAL_MIGRATIONS=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Total de migrations encontradas: ${TOTAL_MIGRATIONS}"

# Verificar se projeto está linked
if [ ! -f ".supabase/config.toml" ]; then
    echo ""
    echo -e "${YELLOW}⚠ Projeto não está linked${NC}"
    echo ""
    read -p "Deseja fazer o link agora? (s/n): " choice
    if [ "$choice" == "s" ] || [ "$choice" == "S" ]; then
        echo "Fazendo link com projeto ${PROJECT_ID}..."
        supabase link --project-ref $PROJECT_ID
        echo -e "${GREEN}✓ Link estabelecido${NC}"
    else
        echo -e "${RED}❌ Link necessário para continuar${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Projeto já está linked${NC}"
fi

# Listar migrations
echo ""
echo "========================================="
echo "  Status das Migrations"
echo "========================================="
echo ""
supabase migration list

# Confirmar aplicação
echo ""
echo -e "${YELLOW}⚠ ATENÇÃO: Você está prestes a aplicar migrations ao banco de dados remoto!${NC}"
echo ""
read -p "Deseja continuar? (s/n): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo ""
    echo "Operação cancelada pelo usuário"
    exit 0
fi

# Aplicar migrations
echo ""
echo "========================================="
echo "  Aplicando Migrations"
echo "========================================="
echo ""
supabase db push

# Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓✓✓ Migrations aplicadas com sucesso! ✓✓✓${NC}"
    echo ""
    echo "Para verificar o resultado:"
    echo "1. Acesse: https://supabase.com/dashboard/project/${PROJECT_ID}"
    echo "2. Vá em: Database > Schema"
    echo "3. Verifique as tabelas criadas"
else
    echo ""
    echo -e "${RED}❌ Erro ao aplicar migrations${NC}"
    echo ""
    echo "Para debug, execute:"
    echo "  supabase db push --debug"
    exit 1
fi

# Oferecer iniciar localmente
echo ""
read -p "Deseja iniciar Supabase localmente para testes? (s/n): " start_local

if [ "$start_local" == "s" ] || [ "$start_local" == "S" ]; then
    echo ""
    echo "Iniciando Supabase local..."
    supabase start
    echo ""
    echo -e "${GREEN}✓ Supabase local iniciado${NC}"
    echo ""
    echo "URLs locais:"
    echo "  API URL: http://localhost:54321"
    echo "  Studio: http://localhost:54323"
    echo "  DB: postgresql://postgres:postgres@localhost:54322/postgres"
fi

echo ""
echo "========================================="
echo "  Processo Concluído"
echo "========================================="
