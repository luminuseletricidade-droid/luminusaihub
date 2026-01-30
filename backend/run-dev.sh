#!/bin/bash

# Backend Development Server Launcher
# Ativa o venv e inicia o FastAPI server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Luminus AI Hub - Backend Development Server${NC}"
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Virtual environment não encontrado. Criando...${NC}"
    python -m venv venv
    echo -e "${GREEN}✅ venv criado${NC}"
fi

# Activate venv
echo -e "${YELLOW}🔌 Ativando virtual environment...${NC}"
source venv/bin/activate

# Check if requirements are installed
echo -e "${YELLOW}📦 Verificando dependências...${NC}"
if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}📥 Instalando dependências...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
fi

# Verify OCR is available
echo -e "${YELLOW}🔍 Verificando OCR...${NC}"
if python -c "import pytesseract, pdf2image, pdfplumber" 2>/dev/null; then
    echo -e "${GREEN}✅ OCR (pytesseract, pdf2image, pdfplumber) disponível${NC}"
else
    echo -e "${RED}❌ Pacotes OCR não instalados${NC}"
    echo -e "${YELLOW}📥 Instalando...${NC}"
    pip install pytesseract pdf2image pdfplumber
    echo -e "${GREEN}✅ OCR instalado${NC}"
fi

# Verify Tesseract binary
if ! command -v tesseract &> /dev/null; then
    echo -e "${RED}❌ Tesseract OCR binary não encontrado${NC}"
    echo -e "${YELLOW}📝 Instale com:${NC}"
    echo "   brew install tesseract  # macOS"
    echo "   sudo apt-get install tesseract-ocr  # Linux"
    exit 1
fi
echo -e "${GREEN}✅ Tesseract OCR binary encontrado$(tesseract --version 2>&1 | head -1 | sed 's/tesseract //')${NC}"

echo ""
echo -e "${GREEN}✅ Tudo pronto!${NC}"
echo -e "${YELLOW}🚀 Iniciando FastAPI server...${NC}"
echo ""

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
