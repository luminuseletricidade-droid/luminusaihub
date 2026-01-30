#!/bin/bash
# 🚀 Development Setup Script - Luminus AI Hub
# Este script configura o ambiente de desenvolvimento e previne erros comuns

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Luminus AI Hub - Dev Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. Verificar se estamos no diretório raiz do projeto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado${NC}"
    echo -e "${YELLOW}Este script deve ser executado no diretório raiz do projeto${NC}"
    echo -e "${YELLOW}Navegue até o diretório do projeto e tente novamente:${NC}"
    echo -e "${BLUE}  cd /caminho/para/luminus-ai-hub${NC}"
    echo -e "${BLUE}  ./scripts/dev-setup.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto identificado${NC}"
echo -e "${BLUE}📍 Working directory: $(pwd)${NC}"

# 2. Verificar Node.js
echo -e "\n${YELLOW}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado${NC}"
    echo -e "${YELLOW}Instale Node.js (>= 18.0.0) de: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} encontrado${NC}"

# 3. Verificar npm
echo -e "\n${YELLOW}Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não está instalado${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm ${NPM_VERSION} encontrado${NC}"

# 4. Limpar node_modules se necessário
if [ "$1" = "--clean" ]; then
    echo -e "\n${YELLOW}Limpando instalações anteriores...${NC}"
    rm -rf node_modules package-lock.json
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
fi

# 5. Instalar dependências
echo -e "\n${YELLOW}Instalando dependências (npm install)...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Dependências instaladas com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi

# 6. Verificar arquivo .env
echo -e "\n${YELLOW}Verificando arquivo .env...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Criando .env a partir de .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  .env criado. Atualize as variáveis de ambiente conforme necessário${NC}"
    else
        echo -e "${YELLOW}⚠️  Nenhum arquivo .env encontrado${NC}"
    fi
else
    echo -e "${GREEN}✅ Arquivo .env existe${NC}"
fi

# 7. Exibir comandos disponíveis
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Setup concluído com sucesso!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${BLUE}Comandos disponíveis:${NC}"
echo -e "${GREEN}npm run dev${NC}         - Inicia servidor de desenvolvimento (porta 8080)"
echo -e "${GREEN}npm run build${NC}       - Compila para produção"
echo -e "${GREEN}npm run lint${NC}        - Executa linting"
echo -e "${GREEN}npm run test${NC}        - Executa testes"
echo -e "${GREEN}npm run preview${NC}     - Preview da build"

echo -e "\n${BLUE}Para iniciar o desenvolvimento:${NC}"
echo -e "${BLUE}  npm run dev${NC}"
echo -e "\n"

# 8. Perguntar se deseja iniciar dev
read -p "Deseja iniciar o servidor de desenvolvimento agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${BLUE}Iniciando servidor de desenvolvimento...${NC}"
    npm run dev
else
    echo -e "${GREEN}Para iniciar mais tarde, execute: npm run dev${NC}"
fi
