# Backend - Visao Geral

## Arquitetura

O backend do Luminus AI Hub e uma **API REST** construida com FastAPI (Python).

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| FastAPI | 0.112.0 | Framework web async |
| Uvicorn | 0.30.0 | Servidor ASGI |
| Python | 3.11+ | Linguagem |
| PostgreSQL | 15+ | Banco de dados |
| psycopg2 | 2.9.10 | Driver PostgreSQL |
| PyJWT | - | Autenticacao JWT |
| Pydantic | - | Validacao de dados |

## Estrutura de Pastas

```
backend/
├── main.py                 # Aplicacao FastAPI principal
├── auth.py                 # Autenticacao JWT
├── db.py                   # Conexao com banco de dados
├── agno_agents/           # Agentes de IA especializados
│   ├── base_agent.py
│   ├── smart_chat_agent.py
│   ├── pdf_processor_agent.py
│   ├── maintenance_planner_agent.py
│   ├── report_generator_agent.py
│   ├── schedule_generator_agent.py
│   ├── document_generators.py
│   └── langextract_agent.py
├── agno_workflows/        # Workflows de orquestracao
│   ├── contract_processing_workflow.py
│   └── maintenance_workflow.py
├── utils/                 # Utilitarios
│   ├── pdf_extractor.py
│   ├── date_utils.py
│   └── validators.py
├── scripts/               # Scripts auxiliares
│   ├── testing/          # Testes
│   ├── maintenance/      # Manutencao
│   └── migrations/       # Migracoes
├── prompts/               # Prompts para IA
├── requirements.txt       # Dependencias Python
├── railway.toml          # Config Railway deploy
└── nixpacks.toml         # Config Nixpacks build
```

## Fluxo de Requisicao

```
Cliente HTTP
    │
    ▼
┌─────────────────┐
│   FastAPI App   │
│  (main.py)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ Auth  │ │  Routes   │
│(JWT)  │ │ (CRUD)    │
└───────┘ └─────┬─────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
    ┌─────────┐   ┌─────────┐
    │   DB    │   │ Agentes │
    │(Postgres)│   │  (IA)   │
    └─────────┘   └─────────┘
```

## Autenticacao

### JWT (JSON Web Token)

1. Usuario envia credenciais para `/api/auth/signin`
2. Backend valida contra banco de dados
3. Gera token JWT com payload:
   ```json
   {
     "sub": "user_id",
     "email": "user@email.com",
     "role": "user|admin",
     "exp": 1234567890
   }
   ```
4. Token retornado ao cliente
5. Cliente envia token em header `Authorization: Bearer <token>`
6. Middleware valida token em cada requisicao

---

## Banco de Dados

### Conexao (db.py)

```python
from db import SupabaseDB

db = SupabaseDB()

# Query
result = db.execute("SELECT * FROM contracts WHERE id = %s", (contract_id,))

# Insert
db.execute("INSERT INTO contracts (name) VALUES (%s)", (name,))

# Transaction
with db.transaction():
    db.execute(...)
    db.execute(...)
```

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `users` | Usuarios do sistema |
| `contracts` | Contratos de manutencao |
| `clients` | Clientes cadastrados |
| `maintenances` | Registros de manutencao |
| `chat_sessions` | Sessoes de chat IA |
| `chat_messages` | Mensagens de chat |
| `documents` | Documentos gerados |

---

## CORS

Configuracao de Cross-Origin Resource Sharing:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Produção: especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Middlewares

1. **CORS**: Permite requisicoes cross-origin
2. **Auth**: Valida token JWT
3. **Logging**: Registra requisicoes
4. **Error Handler**: Captura excecoes

---

## Variaveis de Ambiente

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | URL de conexao PostgreSQL |
| `JWT_SECRET` | Segredo para assinar tokens |
| `OPENAI_API_KEY` | Chave API OpenAI |
| `GOOGLE_API_KEY` | Chave API Google Gemini |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Chave anon Supabase |

---

## Deploy

### Railway

Arquivo `railway.toml`:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
```

### Nixpacks

Arquivo `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["python311", "gcc"]

[phases.install]
cmds = ["pip install -r requirements.txt"]
```

---

## Proximos Arquivos

- [01_ROTAS_API.md](./01_ROTAS_API.md) - Todas as rotas documentadas
- [02_AGENTES_IA.md](./02_AGENTES_IA.md) - Sistema de agentes
- [03_BANCO_DADOS.md](./03_BANCO_DADOS.md) - Schema e queries
- [04_UTILITARIOS.md](./04_UTILITARIOS.md) - Funcoes auxiliares
