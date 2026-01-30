# Backend - Rotas da API

## Visao Geral

A API possui 70+ endpoints organizados por tags funcionais.

**Base URL:** `http://localhost:8000` (dev) ou `https://api.luminus.com` (prod)

---

## Autenticacao (`/api/auth`)

### POST /api/auth/signup
Registra novo usuario.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome Completo"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "usuario@email.com",
  "name": "Nome Completo",
  "role": "user",
  "token": "jwt_token"
}
```

---

### POST /api/auth/signin
Autentica usuario existente.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@email.com",
    "name": "Nome",
    "role": "user"
  },
  "token": "jwt_token"
}
```

---

### POST /api/auth/signout
Invalida sessao atual.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

### GET /api/auth/user
Retorna usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@email.com",
  "name": "Nome",
  "role": "user",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /api/auth/update-profile
Atualiza perfil do usuario.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Novo Nome",
  "phone": "11999999999"
}
```

---

### PUT /api/auth/change-password
Altera senha do usuario.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "current_password": "senha_atual",
  "new_password": "nova_senha"
}
```

---

## Contratos (`/api/contracts`)

### GET /api/contracts
Lista todos os contratos.

**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| `page` | int | Pagina (default: 1) |
| `limit` | int | Itens por pagina (default: 20) |
| `search` | string | Busca por cliente/numero |
| `status` | string | Filtro por status |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "contract_number": "CTR-001",
      "client_name": "Cliente SA",
      "status": "active",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/contracts/{id}
Retorna contrato especifico.

**Response (200):**
```json
{
  "id": "uuid",
  "contract_number": "CTR-001",
  "client_id": "uuid",
  "client_name": "Cliente SA",
  "equipment_code": "GMG-001",
  "power_kva": 500,
  "region": "Sudeste",
  "technician": "Joao Silva",
  "services": ["Manutencao Mensal", "250h"],
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "status": "active",
  "observations": "Texto livre"
}
```

---

### POST /api/contracts
Cria novo contrato.

**Request Body:**
```json
{
  "client_id": "uuid",
  "contract_number": "CTR-002",
  "equipment_code": "GMG-002",
  "power_kva": 300,
  "region": "Sul",
  "technician": "Maria Santos",
  "services": ["Manutencao Mensal"],
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

---

### PUT /api/contracts/{id}
Atualiza contrato existente.

---

### DELETE /api/contracts/{id}
Remove contrato.

---

## Manutencoes (`/api/maintenances`)

### GET /api/maintenances
Lista manutencoes.

**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| `contract_id` | uuid | Filtro por contrato |
| `status` | string | EM DIA, EM ATRASO, etc |
| `type` | string | Tipo de manutencao |
| `technician` | string | Tecnico responsavel |
| `date_from` | date | Data inicial |
| `date_to` | date | Data final |

---

### GET /api/maintenances/{id}
Retorna manutencao especifica.

**Response (200):**
```json
{
  "id": "uuid",
  "contract_id": "uuid",
  "type": "Manutencao Mensal",
  "status": "EM DIA",
  "scheduled_date": "2024-06-15",
  "completed_date": null,
  "technician": "Joao Silva",
  "observations": "Texto"
}
```

---

### POST /api/maintenances
Cria nova manutencao.

---

### PUT /api/maintenances/{id}
Atualiza manutencao.

---

### DELETE /api/maintenances/{id}
Remove manutencao.

---

## Clientes (`/api/clients`)

### GET /api/clients
Lista clientes.

---

### GET /api/clients/{id}
Retorna cliente especifico.

**Response (200):**
```json
{
  "id": "uuid",
  "company_name": "Empresa SA",
  "trade_name": "Empresa",
  "cnpj": "12.345.678/0001-90",
  "state_registration": "123456789",
  "address": {
    "cep": "01310-100",
    "street": "Av Paulista",
    "number": "1000",
    "complement": "Sala 101",
    "neighborhood": "Bela Vista",
    "city": "Sao Paulo",
    "state": "SP"
  },
  "contact": {
    "phone": "11999999999",
    "email": "contato@empresa.com"
  },
  "technical_responsible": "Nome do Responsavel"
}
```

---

### POST /api/clients
Cria novo cliente.

---

### PUT /api/clients/{id}
Atualiza cliente.

---

### DELETE /api/clients/{id}
Remove cliente.

---

## Processamento PDF (`/api/pdf`)

### POST /api/process-base64-pdf
Processa PDF enviado em base64.

**Request Body:**
```json
{
  "file_base64": "base64_encoded_pdf",
  "filename": "contrato.pdf"
}
```

**Response (200):**
```json
{
  "success": true,
  "extracted_data": {
    "client_name": "Cliente SA",
    "contract_number": "CTR-001",
    "equipment_code": "GMG-001",
    "power_kva": 500,
    "services": ["Manutencao Mensal"]
  },
  "confidence": 0.95
}
```

---

### POST /api/process-pdf-storage
Processa PDF do storage Supabase.

**Request Body:**
```json
{
  "file_path": "contracts/file.pdf"
}
```

---

### POST /api/extract-pdf
Extrai dados estruturados de PDF.

---

### POST /api/extract-text
Extrai texto puro de PDF.

---

## Chat IA (`/api/chat`)

### GET /api/chat-sessions
Lista sessoes de chat do usuario.

---

### POST /api/chat-sessions
Cria nova sessao de chat.

**Request Body:**
```json
{
  "contract_id": "uuid",
  "title": "Duvidas sobre contrato"
}
```

---

### GET /api/chat-messages/{session_id}
Retorna mensagens da sessao.

---

### POST /api/smart-chat
Envia mensagem ao chat inteligente.

**Request Body:**
```json
{
  "session_id": "uuid",
  "message": "Qual a proxima manutencao?",
  "context": {
    "contract_id": "uuid"
  }
}
```

**Response (200):**
```json
{
  "response": "A proxima manutencao esta programada para...",
  "sources": ["contrato.pdf", "historico_manutencoes"],
  "confidence": 0.92
}
```

---

## Agentes IA (`/api/ai-agents`)

### GET /api/ai-agents
Lista agentes disponiveis.

**Response (200):**
```json
{
  "agents": [
    {
      "id": "smart_chat",
      "name": "Smart Chat",
      "description": "Chat inteligente com contexto",
      "status": "active"
    },
    {
      "id": "pdf_processor",
      "name": "PDF Processor",
      "description": "Extrai dados de PDFs",
      "status": "active"
    }
  ]
}
```

---

### POST /api/generate-document
Gera documento via IA.

**Request Body:**
```json
{
  "type": "proposta_comercial",
  "contract_id": "uuid",
  "parameters": {}
}
```

---

### GET /api/agno-status
Retorna status do sistema de agentes.

---

## Dashboard (`/api/dashboard`)

### GET /api/dashboard-metrics
Retorna metricas do dashboard.

**Response (200):**
```json
{
  "total_contracts": 150,
  "active_contracts": 120,
  "maintenances": {
    "on_schedule": 80,
    "late": 15,
    "in_progress": 10,
    "planned": 25,
    "pending": 5
  },
  "by_region": {
    "Sudeste": 50,
    "Sul": 30,
    "Nordeste": 20
  },
  "by_technician": {
    "Joao Silva": 25,
    "Maria Santos": 20
  }
}
```

---

## Administracao (`/api/admin`)

### GET /api/admin/users
Lista todos usuarios (admin only).

---

### POST /api/admin/users
Cria usuario (admin only).

---

### PUT /api/admin/users/{id}
Atualiza usuario (admin only).

---

### DELETE /api/admin/users/{id}
Remove usuario (admin only).

---

## Health Check

### GET /health
Verifica saude da API.

**Response (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado |
| 400 | Requisicao invalida |
| 401 | Nao autenticado |
| 403 | Sem permissao |
| 404 | Nao encontrado |
| 422 | Erro de validacao |
| 500 | Erro interno |

---

## Paginacao

Endpoints de listagem suportam:

```
GET /api/contracts?page=1&limit=20
```

Response inclui:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```
