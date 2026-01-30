# Documentacao Tecnica - Luminus AI Hub

## Sobre o Sistema

O **Luminus AI Hub** e uma plataforma de gestao de contratos de manutencao de geradores (GMG) com inteligencia artificial integrada. O sistema permite:

- Gestao de contratos e clientes
- Controle de manutencoes preventivas e corretivas
- Extracao automatica de dados de PDFs
- Chat inteligente com IA
- Geracao de relatorios e cronogramas
- Dashboard com metricas em tempo real

---

## Indice da Documentacao

### Frontend

| Documento | Descricao |
|-----------|-----------|
| [00_VISAO_GERAL.md](./frontend/00_VISAO_GERAL.md) | Arquitetura e estrutura do frontend |
| [01_PAGINAS.md](./frontend/01_PAGINAS.md) | Todas as paginas documentadas |
| [02_COMPONENTES.md](./frontend/02_COMPONENTES.md) | Catalogo de componentes |
| [03_HOOKS.md](./frontend/03_HOOKS.md) | Custom hooks React |
| [04_SERVICOS.md](./frontend/04_SERVICOS.md) | Servicos e integracao API |

### Backend

| Documento | Descricao |
|-----------|-----------|
| [00_VISAO_GERAL.md](./backend/00_VISAO_GERAL.md) | Arquitetura FastAPI |
| [01_ROTAS_API.md](./backend/01_ROTAS_API.md) | Endpoints da API REST |
| [02_AGENTES_IA.md](./backend/02_AGENTES_IA.md) | Sistema de agentes IA |
| [03_BANCO_DADOS.md](./backend/03_BANCO_DADOS.md) | Schema e queries |
| [04_UTILITARIOS.md](./backend/04_UTILITARIOS.md) | Funcoes auxiliares |

### Fluxos e Processos

| Documento | Descricao |
|-----------|-----------|
| [01_FLUXO_AUTENTICACAO.md](./fluxos/01_FLUXO_AUTENTICACAO.md) | Login, registro, JWT |
| [02_FLUXO_PROCESSAMENTO_PDF.md](./fluxos/02_FLUXO_PROCESSAMENTO_PDF.md) | Extracao de dados |
| [03_FLUXO_MANUTENCAO.md](./fluxos/03_FLUXO_MANUTENCAO.md) | Ciclo de vida |

### Bibliotecas

| Documento | Descricao |
|-----------|-----------|
| [01_FRONTEND_LIBS.md](./bibliotecas/01_FRONTEND_LIBS.md) | React, TanStack, Tailwind |
| [02_BACKEND_LIBS.md](./bibliotecas/02_BACKEND_LIBS.md) | FastAPI, psycopg2, IA |

---

## Stack Tecnologica

### Frontend
```
React 18.3.1 + TypeScript 5.5.3
Vite 5.4.1 (build tool)
TailwindCSS 3.4.11 + Shadcn/UI
TanStack React Query 5.83.1
React Router DOM 6.26.2
Recharts 2.12.7
```

### Backend
```
Python 3.11+
FastAPI 0.112.0 + Uvicorn 0.30.0
PostgreSQL 15+ (Supabase)
psycopg2-binary 2.9.10
Google Gemini + OpenAI
```

### Infraestrutura
```
Frontend: Vercel
Backend: Railway
Banco: Supabase (PostgreSQL)
Storage: Supabase Storage
```

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React SPA (Vite)                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Pages  │  │Components│  │  Hooks  │  │Services │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                    FastAPI (Python)                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Routes │  │  Auth   │  │ Agents  │  │  Utils  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ SQL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                   PostgreSQL (Supabase)                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  users  │  │contracts│  │mainten. │  │  chat   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comandos Principais

### Desenvolvimento

```bash
# Frontend
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para producao
npm run lint         # Verifica linting

# Backend (com venv ativo)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Banco de dados
python backend/migrate.py migrate    # Aplica migracoes
```

### Testes

```bash
# Backend
python backend/scripts/testing/test_system.py
```

---

## Estrutura de Pastas

```
luminus-ai-hub/
├── src/                    # Frontend React
│   ├── components/         # Componentes UI
│   ├── pages/             # Paginas/Rotas
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── contexts/          # React contexts
│   └── integrations/      # Supabase client
├── backend/               # Backend Python
│   ├── agno_agents/       # Agentes IA
│   ├── agno_workflows/    # Workflows
│   ├── utils/             # Utilitarios
│   ├── scripts/           # Scripts auxiliares
│   └── main.py            # App FastAPI
├── supabase/              # Migrations e functions
├── docs/                  # Documentacao
│   └── doc_sistema/       # Esta documentacao
└── public/                # Assets estaticos
```

---

## Status das Manutencoes

| Status | Descricao | Cor |
|--------|-----------|-----|
| EM DIA | Manutencao em dia | Verde |
| EM ATRASO | Passou da data | Vermelho |
| EM ANDAMENTO | Em execucao | Amarelo |
| PROGRAMADO | Agendada | Azul |
| PENDENTE | Aguardando | Cinza |

---

## Tipos de Manutencao

| Tipo | Periodicidade |
|------|---------------|
| Manutencao Mensal | 30 dias |
| Preventiva 250h | 90 dias |
| Preventiva 500h | 180 dias |
| Limpeza de Tanque | 365 dias |
| Limpeza de Radiador | 365 dias |
| Megagem Alternador | 365 dias |
| Regulagem Valvulas | 365 dias |
| Troca de Bateria | 730 dias |

---

## Contato e Suporte

Para duvidas tecnicas, consulte a documentacao completa ou entre em contato com a equipe de desenvolvimento.

---

*Documentacao gerada em Novembro/2025*
