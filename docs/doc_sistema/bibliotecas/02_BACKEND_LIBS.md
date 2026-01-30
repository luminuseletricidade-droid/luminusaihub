# Bibliotecas Backend

## Visao Geral

Documentacao das principais bibliotecas Python utilizadas no backend.

---

## FastAPI 0.112.0

### Descricao
Framework web moderno e de alta performance para APIs em Python.

### Caracteristicas

| Caracteristica | Descricao |
|----------------|-----------|
| Async | Suporte nativo a async/await |
| Tipagem | Validacao automatica com Pydantic |
| Docs | OpenAPI/Swagger automatico |
| Performance | Baseado em Starlette e Uvicorn |

### Decoradores de Rota

| Decorador | Metodo HTTP |
|-----------|-------------|
| `@app.get()` | GET |
| `@app.post()` | POST |
| `@app.put()` | PUT |
| `@app.delete()` | DELETE |
| `@app.patch()` | PATCH |

### Exemplo de Uso

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

app = FastAPI()

class Contract(BaseModel):
    id: str
    client_name: str
    status: str

@app.get("/api/contracts")
async def list_contracts():
    return {"data": [...]}

@app.get("/api/contracts/{contract_id}")
async def get_contract(contract_id: str):
    contract = await db.get(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Not found")
    return contract

@app.post("/api/contracts")
async def create_contract(contract: Contract):
    return await db.create(contract.dict())
```

### Middleware

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Dependencias

```python
from fastapi import Depends

async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = verify_token(token)
    return user

@app.get("/api/me")
async def me(user = Depends(get_current_user)):
    return user
```

---

## Uvicorn 0.30.0

### Descricao
Servidor ASGI de alta performance para Python.

### Uso

```bash
# Desenvolvimento
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Producao
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Parametros

| Parametro | Descricao |
|-----------|-----------|
| `--reload` | Auto-reload em dev |
| `--host` | Endereco de bind |
| `--port` | Porta |
| `--workers` | Numero de workers |
| `--log-level` | Nivel de log |

---

## Pydantic

### Descricao
Validacao de dados usando anotacoes de tipo Python.

### Exemplo de Uso

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date

class MaintenanceCreate(BaseModel):
    contract_id: str
    type: str
    scheduled_date: date
    technician: Optional[str] = None

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['Mensal', '250h', '500h']
        if v not in valid_types:
            raise ValueError(f'Tipo deve ser um de: {valid_types}')
        return v

class MaintenanceResponse(BaseModel):
    id: str
    contract_id: str
    type: str
    status: str
    scheduled_date: date
    technician: Optional[str]

    class Config:
        from_attributes = True
```

---

## psycopg2 2.9.10

### Descricao
Adaptador PostgreSQL para Python.

### Exemplo de Uso

```python
import psycopg2
from psycopg2.extras import RealDictCursor

# Conexao
conn = psycopg2.connect(
    host="localhost",
    database="luminus",
    user="user",
    password="pass",
    cursor_factory=RealDictCursor
)

# Query
with conn.cursor() as cur:
    cur.execute("SELECT * FROM contracts WHERE status = %s", ('active',))
    results = cur.fetchall()

# Insert
with conn.cursor() as cur:
    cur.execute(
        "INSERT INTO contracts (client_name, status) VALUES (%s, %s) RETURNING id",
        ('Cliente A', 'active')
    )
    new_id = cur.fetchone()['id']
    conn.commit()
```

---

## PyJWT

### Descricao
Implementacao de JSON Web Tokens em Python.

### Exemplo de Uso

```python
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

# Criar token
def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Verificar token
def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expirado")
    except jwt.InvalidTokenError:
        raise Exception("Token invalido")
```

---

## bcrypt

### Descricao
Hashing de senhas seguro.

### Exemplo de Uso

```python
import bcrypt

# Hash de senha
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()

# Verificar senha
def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

---

## pdfplumber 0.10.3

### Descricao
Extracao de texto e tabelas de PDFs.

### Exemplo de Uso

```python
import pdfplumber

def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
        return text

def extract_tables(pdf_bytes: bytes) -> list:
    tables = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            tables.extend(page_tables)
    return tables
```

---

## pytesseract

### Descricao
OCR (Optical Character Recognition) para Python.

### Exemplo de Uso

```python
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

def ocr_pdf(pdf_bytes: bytes) -> str:
    # Converte PDF para imagens
    images = convert_from_bytes(pdf_bytes)

    text = ""
    for image in images:
        # Extrai texto de cada pagina
        page_text = pytesseract.image_to_string(image, lang='por')
        text += page_text + "\n"

    return text
```

---

## Google GenAI 1.4.0

### Descricao
SDK oficial do Google para Gemini.

### Exemplo de Uso

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")

model = genai.GenerativeModel('gemini-1.5-flash')

# Geracao simples
response = model.generate_content("Explique o que e manutencao preventiva")
print(response.text)

# Chat
chat = model.start_chat(history=[])
response = chat.send_message("Ola, preciso de ajuda")
print(response.text)

# Com contexto
response = model.generate_content([
    "Analise o seguinte contrato e extraia os dados:",
    texto_do_contrato
])
```

---

## OpenAI 1.101.0

### Descricao
SDK oficial da OpenAI para GPT.

### Exemplo de Uso

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

# Chat completion
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Voce e um assistente de manutencao."},
        {"role": "user", "content": "Qual a proxima manutencao?"}
    ]
)
print(response.choices[0].message.content)

# Com streaming
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content, end="")
```

---

## Supabase Python 2.12.0

### Descricao
Cliente Python para Supabase.

### Exemplo de Uso

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Select
data = supabase.table("contracts").select("*").eq("status", "active").execute()

# Insert
data = supabase.table("contracts").insert({"client_name": "Novo"}).execute()

# Update
data = supabase.table("contracts").update({"status": "inactive"}).eq("id", id).execute()

# Delete
data = supabase.table("contracts").delete().eq("id", id).execute()

# Storage
supabase.storage.from_("documents").upload("file.pdf", file_content)
```

---

## Pillow (PIL)

### Descricao
Biblioteca de processamento de imagens.

### Exemplo de Uso

```python
from PIL import Image
import io

# Abrir imagem
image = Image.open(io.BytesIO(image_bytes))

# Redimensionar
resized = image.resize((800, 600))

# Converter para grayscale (melhora OCR)
gray = image.convert('L')

# Salvar
buffer = io.BytesIO()
image.save(buffer, format='PNG')
```

---

## Resumo de Dependencias

```
fastapi==0.112.0
uvicorn[standard]==0.30.0
pdfplumber==0.10.3
PyPDF2==3.0.1
pdfminer.six
pdf2image
pytesseract
Pillow
openai>=1.101.0
google-genai==1.4.0
psycopg2-binary>=2.9.10
bcrypt
PyJWT
supabase>=2.12.0
python-multipart
aiofiles
httpx
```
