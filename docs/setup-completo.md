# Guia Completo de Configuração do Luminus AI Hub

Este guia foi criado para você configurar o Luminus AI Hub **do zero**, mesmo sem experiência prévia com o projeto.

---

## Sumário

1. [O que é o Luminus AI Hub?](#1-o-que-é-o-luminus-ai-hub)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Configuração Inicial](#4-configuração-inicial)
5. [Banco de Dados (Supabase)](#5-banco-de-dados-supabase)
6. [Backend (FastAPI)](#6-backend-fastapi)
7. [Frontend (React/Vite)](#7-frontend-reactvite)
8. [Rodando a Aplicação](#8-rodando-a-aplicação)
9. [Deploy em Produção](#9-deploy-em-produção)
10. [Solução de Problemas](#10-solução-de-problemas)
11. [Referência Rápida de Comandos](#11-referência-rápida-de-comandos)

---

## 1. O que é o Luminus AI Hub?

O **Luminus AI Hub** é uma plataforma de gestão de contratos e manutenções para o setor de geração de energia. Ele usa **Inteligência Artificial** para:

- Extrair dados de contratos em PDF automaticamente
- Gerar cronogramas de manutenção
- Processar documentos com visão computacional
- Oferecer chat inteligente sobre os contratos

### Principais Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Gestão de Contratos | Cadastro, upload de PDFs, extração automática de dados |
| Manutenções | Cronogramas, calendário, status em tempo real |
| Relatórios | Dashboard com KPIs, gráficos, exportação Excel |
| Chat IA | Perguntas sobre contratos usando linguagem natural |
| Multiusuário | Login, perfis, controle de acesso |

---

## 2. Arquitetura do Sistema

### Diferença: Monolito vs Microserviços

| Aspecto | Monolito | Microserviços |
|---------|----------|---------------|
| **Estrutura** | Um único programa grande | Vários programas pequenos independentes |
| **Comunicação** | Funções chamam outras funções | APIs HTTP entre serviços |
| **Deploy** | Deploy de tudo junto | Deploy de cada serviço separado |
| **Complexidade** | Mais simples de começar | Mais complexo, mas mais escalável |

### O Luminus é um **Monolito Híbrido**

```
┌─────────────────────────────────────────────────────────────┐
│                    LUMINUS AI HUB                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │   FRONTEND   │────▶│   BACKEND    │────▶│  BANCO DE   │  │
│  │   (React)    │     │  (FastAPI)   │     │   DADOS     │  │
│  │              │     │              │     │ (PostgreSQL)│  │
│  │  Navegador   │     │  Servidor    │     │  Supabase   │  │
│  └──────────────┘     └──────────────┘     └─────────────┘  │
│         │                    │                    │         │
│         │                    ▼                    │         │
│         │             ┌──────────────┐            │         │
│         │             │  AGENTES IA  │            │         │
│         │             │   (OpenAI)   │            │         │
│         │             └──────────────┘            │         │
│         │                                         │         │
│         └─────────────────────────────────────────┘         │
│                    Realtime + Storage                       │
└─────────────────────────────────────────────────────────────┘
```

**Por que híbrido?**
- **Monolito**: Todo o backend está em um único servidor FastAPI
- **Híbrido**: Usa serviços externos (Supabase, OpenAI) para funcionalidades específicas

### Componentes Principais

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Frontend | React + Vite + TypeScript | Interface do usuário |
| Backend | FastAPI + Python | API REST + Processamento IA |
| Banco de Dados | PostgreSQL (Supabase) | Armazenamento de dados |
| Storage | Supabase Storage | Armazenamento de arquivos/PDFs |
| IA | OpenAI GPT + Google Gemini | Processamento inteligente |

---

## 3. Pré-requisitos

### Software Necessário

Instale esses programas antes de começar:

| Software | Versão Mínima | Download | Verificar Instalação |
|----------|---------------|----------|----------------------|
| Node.js | 18.0.0 | [nodejs.org](https://nodejs.org) | `node --version` |
| Python | 3.9+ | [python.org](https://python.org) | `python3 --version` |
| Git | 2.0+ | [git-scm.com](https://git-scm.com) | `git --version` |
| VS Code | Última | [code.visualstudio.com](https://code.visualstudio.com) | (Recomendado) |

### Extensões VS Code Recomendadas

- Python (Microsoft)
- Pylance
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter

### Contas Necessárias

Você precisará criar contas gratuitas em:

| Serviço | URL | Para quê |
|---------|-----|----------|
| Supabase | [supabase.com](https://supabase.com) | Banco de dados |
| OpenAI | [platform.openai.com](https://platform.openai.com) | API de IA |
| Railway (opcional) | [railway.app](https://railway.app) | Deploy do backend |

---

## 4. Configuração Inicial

### 4.1 Clonar o Repositório

```bash
# Clone o projeto
git clone https://github.com/needyuai/luminus-ai-hub.git

# Entre na pasta
cd luminus-ai-hub
```

### 4.2 Estrutura de Pastas

```
luminus-ai-hub/
├── src/                    # Frontend React
│   ├── pages/              # Páginas da aplicação
│   ├── components/         # Componentes reutilizáveis
│   ├── hooks/              # Lógica compartilhada
│   └── services/           # Comunicação com API
├── backend/                # Backend FastAPI
│   ├── main.py             # Servidor principal
│   ├── database.py         # Acesso ao banco
│   ├── agno_agents/        # Agentes de IA
│   └── requirements.txt    # Dependências Python
├── supabase/               # Configuração do banco
│   ├── migrations/         # Scripts SQL
│   └── functions/          # Edge Functions
├── docs/                   # Documentação
├── package.json            # Dependências Node.js
└── .env.example            # Template de variáveis
```

---

## 5. Banco de Dados (Supabase)

### 5.1 Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `luminus-ai-hub`
   - **Database Password**: Crie uma senha forte (anote!)
   - **Region**: Escolha o mais próximo (ex: São Paulo)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para o projeto ser criado

### 5.2 Obter Credenciais

No dashboard do Supabase, vá em **Project Settings > API**:

| Credencial | Onde encontrar | Uso |
|------------|----------------|-----|
| Project URL | `https://xxxxx.supabase.co` | Frontend e Backend |
| Anon Key | `eyJhbG...` (pública) | Frontend |
| Service Role Key | `eyJhbG...` (secreta) | Backend (NUNCA exponha!) |
| Database URL | `postgresql://postgres...` | Backend |

**Para obter a Database URL:**
1. Vá em **Project Settings > Database**
2. Em "Connection string", escolha **URI**
3. Copie a URL e substitua `[YOUR-PASSWORD]` pela senha que você criou

### 5.3 Aplicar Migrations

As migrations criam as tabelas no banco. Execute no terminal:

```bash
# Entre na pasta do backend
cd backend

# Crie o ambiente virtual Python
python3 -m venv venv

# Ative o ambiente virtual
# Mac/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Crie o arquivo .env do backend (veja seção 6.2)
# Depois execute as migrations:
python migrate.py migrate
```

**Saída esperada:**
```
✅ Migration 00000_base_schema.sql aplicada
✅ Migration 00001_add_client_name.sql aplicada
...
✅ Todas as 73 migrations aplicadas com sucesso!
```

### 5.4 Verificar Tabelas

No Supabase Dashboard, vá em **Table Editor**. Você deve ver tabelas como:
- `contracts`
- `maintenances`
- `clients`
- `profiles`
- `chat_sessions`

---

## 6. Backend (FastAPI)

### 6.1 Instalar Dependências

```bash
# Certifique-se de estar na pasta backend com venv ativo
cd backend
source venv/bin/activate  # Mac/Linux

# Instale as dependências
pip install -r requirements.txt
```

### 6.2 Configurar Variáveis de Ambiente

Crie o arquivo `backend/.env`:

```bash
# Copie o template
cp .env.example .env
```

Edite `backend/.env` com suas credenciais:

```bash
# ============================================
# CONFIGURAÇÃO DO BACKEND - LUMINUS AI HUB
# ============================================

# --- OPENAI (OBRIGATÓRIO) ---
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# --- GOOGLE GEMINI (OPCIONAL) ---
# Obtenha em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# --- SERVIDOR ---
HOST=0.0.0.0
PORT=8000

# --- BANCO DE DADOS (OBRIGATÓRIO) ---
# Formato: postgresql://postgres.[projeto]:[senha]@[host]:5432/postgres
SUPABASE_DB_URL=postgresql://postgres.xxxxx:SuaSenha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# --- SEGURANÇA (OBRIGATÓRIO EM PRODUÇÃO) ---
# Gere uma chave aleatória de 32 caracteres
# Você pode usar: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=sua_chave_secreta_muito_forte_aqui_32_caracteres
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# --- AMBIENTE ---
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# --- CORS (domínios permitidos) ---
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]

# --- SCHEMA DO BANCO ---
SUPABASE_DB_SCHEMA=public
```

### 6.3 Testar o Backend

```bash
# Com venv ativo, na pasta backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Saída esperada:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verificar se está funcionando:**
- Abra: http://localhost:8000/docs (Documentação da API)
- Abra: http://localhost:8000/health (Deve retornar `{"status": "healthy"}`)

---

## 7. Frontend (React/Vite)

### 7.1 Instalar Dependências

```bash
# Volte para a pasta raiz do projeto
cd ..

# Instale as dependências Node.js
npm install
```

**Tempo estimado:** 2-5 minutos (primeira vez)

### 7.2 Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
# Copie o template
cp .env.example .env
```

Edite `.env` com suas credenciais:

```bash
# ============================================
# CONFIGURAÇÃO DO FRONTEND - LUMINUS AI HUB
# ============================================

# --- SUPABASE (OBRIGATÓRIO) ---
# Encontre em: Supabase Dashboard > Project Settings > API
VITE_SUPABASE_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxx
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxxx.supabase.co

# --- BACKEND API ---
# URL do seu backend (local ou produção)
VITE_API_URL=http://localhost:8000

# --- CONFIGURAÇÕES OPCIONAIS ---
VITE_TIMEZONE=America/Sao_Paulo
VITE_APP_ENV=development
VITE_LOG_LEVEL=debug
```

### 7.3 Testar o Frontend

```bash
# Na pasta raiz do projeto
npm run dev
```

**Saída esperada:**
```
  VITE v5.4.20  ready in 1234 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

Abra http://localhost:8080 no navegador.

---

## 8. Rodando a Aplicação

### 8.1 Método Recomendado: Dois Terminais

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
# Na raiz do projeto
npm run dev
```

### 8.2 Usando o Makefile (Opcional)

Se você tem `make` instalado:

```bash
# Configuração inicial (primeira vez)
make setup

# Rodar tudo junto
make dev
```

### 8.3 URLs Importantes

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Frontend | http://localhost:8080 | Interface do usuário |
| Backend API | http://localhost:8000 | API REST |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Health Check | http://localhost:8000/health | Status do servidor |

### 8.4 Primeiro Acesso

1. Abra http://localhost:8080
2. Clique em **"Criar conta"** ou **"Sign up"**
3. Preencha email e senha
4. Faça login
5. Comece a usar!

---

## 9. Deploy em Produção

### 9.1 Visão Geral do Deploy

| Componente | Serviço | Custo |
|------------|---------|-------|
| Frontend | Vercel / Railway / Netlify | Gratuito (tier free) |
| Backend | Railway | $5/mês (ou free tier) |
| Banco de Dados | Supabase | Gratuito (500MB) |

### 9.2 Deploy do Backend no Railway

1. Acesse [railway.app](https://railway.app) e faça login com GitHub
2. Clique em **"New Project"** > **"Deploy from GitHub repo"**
3. Selecione o repositório `luminus-ai-hub`
4. Railway detectará automaticamente o Dockerfile
5. Configure as variáveis de ambiente:
   - Vá em **Variables**
   - Adicione todas as variáveis do `backend/.env`
   - **IMPORTANTE:** Use valores de PRODUÇÃO (não localhost!)

```bash
# Variáveis obrigatórias no Railway:
OPENAI_API_KEY=sk-xxx
SUPABASE_DB_URL=postgresql://xxx
JWT_SECRET=nova_chave_super_segura_para_producao
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=["https://seu-frontend.vercel.app"]
```

6. O deploy será automático a cada push no GitHub

**URL de produção:** `https://luminus-ai-hub-back-production.up.railway.app`

### 9.3 Deploy do Frontend

**Opção A: Vercel (Recomendado)**

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **"New Project"**
3. Importe o repositório `luminus-ai-hub`
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Adicione as variáveis de ambiente:
```bash
VITE_SUPABASE_PROJECT_ID=xxx
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_API_URL=https://luminus-ai-hub-back-production.up.railway.app
VITE_TIMEZONE=America/Sao_Paulo
VITE_APP_ENV=production
```
6. Clique em **Deploy**

**URL de produção:** `https://luminus-ai-hub.vercel.app`

### 9.4 Checklist de Produção

- [ ] JWT_SECRET é diferente do desenvolvimento
- [ ] CORS_ORIGINS inclui apenas domínios de produção
- [ ] LOG_LEVEL está em INFO (não DEBUG)
- [ ] ENVIRONMENT está em production
- [ ] Migrations foram aplicadas no banco de produção
- [ ] Health check responde OK

---

## 10. Solução de Problemas

### Erros Comuns

#### "Module not found" no Backend

```bash
# Certifique-se de estar com venv ativo
source venv/bin/activate
pip install -r requirements.txt
```

#### "CORS error" no Frontend

Verifique se `CORS_ORIGINS` no backend inclui a URL do frontend:
```bash
CORS_ORIGINS=["http://localhost:8080", "http://localhost:3000"]
```

#### "Connection refused" ao acessar a API

1. Verifique se o backend está rodando
2. Verifique se a porta está correta (8000)
3. Verifique `VITE_API_URL` no frontend

#### "Invalid API Key" do OpenAI

1. Verifique se a chave começa com `sk-`
2. Verifique se tem saldo na conta OpenAI
3. Gere uma nova chave se necessário

#### "Database connection failed"

1. Verifique `SUPABASE_DB_URL` no backend
2. Confirme que a senha está correta
3. Verifique se o projeto Supabase está ativo

#### Migrations não aplicam

```bash
# Verifique o status
python migrate.py status

# Force re-apply (cuidado em produção!)
python migrate.py migrate --force
```

### Logs para Debug

**Backend:**
```bash
# Ver logs em tempo real
tail -f backend/backend.log

# Ou no terminal onde o uvicorn está rodando
# Logs aparecem automaticamente
```

**Frontend:**
- Abra o DevTools (F12)
- Vá na aba **Console**
- Erros aparecem em vermelho

### Verificar Conexões

```bash
# Testar conexão com o banco
cd backend
python -c "from database import SupabaseDB; db = SupabaseDB(); print(db.test_connection())"

# Testar API OpenAI
python -c "import openai; print(openai.Model.list())"
```

---

## 11. Referência Rápida de Comandos

### Comandos do Dia a Dia

```bash
# Iniciar desenvolvimento (2 terminais)
# Terminal 1:
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2:
npm run dev

# Ou usando Make:
make dev
```

### Comandos de Instalação

```bash
# Frontend
npm install

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Comandos de Build

```bash
# Build do frontend para produção
npm run build

# Verificar build localmente
npm run preview
```

### Comandos de Banco de Dados

```bash
# Aplicar migrations
cd backend && python migrate.py migrate

# Ver status das migrations
python migrate.py status

# Criar nova migration
python create_migration.py nome_da_migration
```

### Comandos de Teste

```bash
# Testes do frontend
npm run test

# Testes do backend
cd backend && python -m pytest
```

### Comandos Git Comuns

```bash
# Ver status
git status

# Criar branch
git checkout -b feature/nova-funcionalidade

# Commit
git add .
git commit -m "feat: descrição da mudança"

# Push
git push origin nome-da-branch
```

---

## Precisa de Ajuda?

- **Documentação técnica**: `docs/` (neste repositório)
- **Guias de agentes**: `agents/README.md`
- **Issues**: Abra uma issue no GitHub

---

*Última atualização: Janeiro 2025*
