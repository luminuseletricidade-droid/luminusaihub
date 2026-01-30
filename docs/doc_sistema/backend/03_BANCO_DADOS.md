# Backend - Banco de Dados

## Visao Geral

O sistema utiliza PostgreSQL como banco de dados principal, hospedado no Supabase.

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| PostgreSQL | 15+ | Banco relacional |
| Supabase | - | Hosting e auth |
| psycopg2 | 2.9.10 | Driver Python |

---

## Conexao

### db.py
**Arquivo:** `backend/db.py`

```python
import psycopg2
from psycopg2.extras import RealDictCursor

class SupabaseDB:
    def __init__(self):
        self.connection_string = os.getenv("DATABASE_URL")

    def get_connection(self):
        return psycopg2.connect(
            self.connection_string,
            cursor_factory=RealDictCursor
        )

    def execute(self, query: str, params: tuple = None):
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description:
                    return cur.fetchall()
                conn.commit()
```

---

## Schema do Banco

### Tabela: users

Usuarios do sistema.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | ID unico |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email |
| password_hash | VARCHAR(255) | NOT NULL | Senha hasheada |
| name | VARCHAR(255) | NOT NULL | Nome completo |
| role | VARCHAR(50) | DEFAULT 'user' | Role (user, admin) |
| phone | VARCHAR(20) | | Telefone |
| avatar_url | TEXT | | URL do avatar |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data atualizacao |
| is_active | BOOLEAN | DEFAULT true | Usuario ativo |

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

---

### Tabela: clients

Clientes cadastrados.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| company_name | VARCHAR(255) | NOT NULL | Razao social |
| trade_name | VARCHAR(255) | | Nome fantasia |
| cnpj | VARCHAR(18) | UNIQUE | CNPJ |
| state_registration | VARCHAR(20) | | Inscricao estadual |
| cep | VARCHAR(9) | | CEP |
| street | VARCHAR(255) | | Logradouro |
| number | VARCHAR(20) | | Numero |
| complement | VARCHAR(100) | | Complemento |
| neighborhood | VARCHAR(100) | | Bairro |
| city | VARCHAR(100) | | Cidade |
| state | VARCHAR(2) | | UF |
| phone | VARCHAR(20) | | Telefone |
| email | VARCHAR(255) | | Email |
| technical_responsible | VARCHAR(255) | | Responsavel tecnico |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data atualizacao |

---

### Tabela: contracts

Contratos de manutencao.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| client_id | UUID | FK clients(id) | Cliente |
| contract_number | VARCHAR(50) | UNIQUE | Numero do contrato |
| equipment_code | VARCHAR(50) | | Codigo equipamento |
| power_kva | INTEGER | | Potencia KVA |
| region | VARCHAR(100) | | Regiao |
| technician | VARCHAR(255) | | Tecnico responsavel |
| services | JSONB | | Servicos inclusos |
| start_date | DATE | | Data inicio |
| end_date | DATE | | Data fim |
| status | VARCHAR(50) | DEFAULT 'active' | Status |
| observations | TEXT | | Observacoes |
| pdf_url | TEXT | | URL do PDF |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data atualizacao |

```sql
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    contract_number VARCHAR(50) UNIQUE,
    equipment_code VARCHAR(50),
    power_kva INTEGER,
    region VARCHAR(100),
    technician VARCHAR(255),
    services JSONB DEFAULT '[]',
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    observations TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Tabela: maintenances

Registros de manutencao.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| contract_id | UUID | FK contracts(id) | Contrato |
| type | VARCHAR(100) | NOT NULL | Tipo manutencao |
| status | VARCHAR(50) | | Status |
| scheduled_date | DATE | | Data programada |
| completed_date | DATE | | Data conclusao |
| technician | VARCHAR(255) | | Tecnico executor |
| observations | TEXT | | Observacoes |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data atualizacao |

**Status possiveis:**
- `EM DIA` - Manutencao em dia
- `EM ATRASO` - Manutencao atrasada
- `PROGRAMADO` - Manutencao agendada
- `PENDENTE` - Aguardando agendamento
- `EM ANDAMENTO` - Em execucao

**Tipos de manutencao:**
- Manutencao Mensal
- Manutencao Preventiva 250h
- Manutencao Preventiva 500h
- Limpeza de Tanque
- Limpeza de Radiador
- Megagem de Alternador
- Regulagem de Valvulas
- Troca de Bateria
- Manutencao Corretiva
- Atendimento Emergencial

---

### Tabela: chat_sessions

Sessoes de chat com IA.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| user_id | UUID | FK users(id) | Usuario |
| contract_id | UUID | FK contracts(id) | Contrato contexto |
| title | VARCHAR(255) | | Titulo da sessao |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data atualizacao |

---

### Tabela: chat_messages

Mensagens de chat.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| session_id | UUID | FK chat_sessions(id) | Sessao |
| role | VARCHAR(20) | | user ou assistant |
| content | TEXT | NOT NULL | Conteudo |
| metadata | JSONB | | Metadados |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |

---

### Tabela: documents

Documentos gerados.

| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | ID unico |
| contract_id | UUID | FK contracts(id) | Contrato |
| type | VARCHAR(100) | | Tipo documento |
| title | VARCHAR(255) | | Titulo |
| file_url | TEXT | | URL do arquivo |
| generated_by | UUID | FK users(id) | Usuario gerador |
| created_at | TIMESTAMP | DEFAULT NOW() | Data criacao |

---

## Indices

```sql
-- Performance de busca
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_region ON contracts(region);

CREATE INDEX idx_maintenances_contract ON maintenances(contract_id);
CREATE INDEX idx_maintenances_status ON maintenances(status);
CREATE INDEX idx_maintenances_date ON maintenances(scheduled_date);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
```

---

## Queries Comuns

### Listar contratos com cliente

```sql
SELECT
    c.*,
    cl.company_name as client_name,
    cl.cnpj as client_cnpj
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.id
WHERE c.status = 'active'
ORDER BY c.created_at DESC;
```

### Manutencoes por status

```sql
SELECT
    status,
    COUNT(*) as total
FROM maintenances
WHERE scheduled_date BETWEEN :start_date AND :end_date
GROUP BY status;
```

### Dashboard metrics

```sql
SELECT
    (SELECT COUNT(*) FROM contracts WHERE status = 'active') as active_contracts,
    (SELECT COUNT(*) FROM maintenances WHERE status = 'EM ATRASO') as late,
    (SELECT COUNT(*) FROM maintenances WHERE status = 'EM DIA') as on_schedule,
    (SELECT COUNT(*) FROM maintenances WHERE status = 'PROGRAMADO') as planned,
    (SELECT COUNT(*) FROM maintenances WHERE status = 'PENDENTE') as pending,
    (SELECT COUNT(*) FROM maintenances WHERE status = 'EM ANDAMENTO') as in_progress;
```

### Manutencoes por tecnico

```sql
SELECT
    technician,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'EM DIA' THEN 1 ELSE 0 END) as on_schedule,
    SUM(CASE WHEN status = 'EM ATRASO' THEN 1 ELSE 0 END) as late
FROM maintenances
WHERE technician IS NOT NULL
GROUP BY technician
ORDER BY total DESC;
```

---

## Migracoes

### Localizacao
**Pasta:** `supabase/migrations/`

### Executar migracoes

```bash
# Via script Python
python backend/migrate.py migrate

# Via Supabase CLI
supabase db push
```

### Criar nova migracao

```bash
supabase migration new nome_da_migracao
```

---

## Backup e Restore

### Backup

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql $DATABASE_URL < backup_20240101.sql
```

---

## Supabase Storage

### Buckets

| Bucket | Finalidade |
|--------|------------|
| contracts | PDFs de contratos |
| documents | Documentos gerados |
| avatars | Fotos de perfil |

### Upload de arquivo

```python
from supabase import create_client

supabase = create_client(url, key)
supabase.storage.from_("contracts").upload(
    path="file.pdf",
    file=file_content
)
```
