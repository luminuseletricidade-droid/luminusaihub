# Backend - Utilitarios

## Visao Geral

Funcoes auxiliares para processamento de dados, validacao e operacoes comuns.

---

## PDF Extractor

### pdf_extractor.py
**Arquivo:** `backend/utils/pdf_extractor.py`

Extracao de texto e dados de PDFs.

```python
from utils.pdf_extractor import PDFExtractor

extractor = PDFExtractor()

# Extrair texto
text = extractor.extract_text(pdf_bytes)

# Extrair com OCR (para PDFs escaneados)
text = extractor.extract_with_ocr(pdf_bytes)

# Extrair tabelas
tables = extractor.extract_tables(pdf_bytes)
```

### Metodos

| Metodo | Descricao |
|--------|-----------|
| `extract_text(pdf_bytes)` | Extrai texto de PDF nativo |
| `extract_with_ocr(pdf_bytes)` | Extrai texto via OCR |
| `extract_tables(pdf_bytes)` | Extrai tabelas estruturadas |
| `get_page_count(pdf_bytes)` | Retorna numero de paginas |
| `extract_images(pdf_bytes)` | Extrai imagens do PDF |

### Bibliotecas Utilizadas

| Biblioteca | Finalidade |
|------------|------------|
| pdfplumber | Extracao de texto/tabelas |
| PyPDF2 | Manipulacao de PDFs |
| pdfminer.six | Parser de baixo nivel |
| pdf2image | Conversao para imagem |
| pytesseract | OCR |
| Pillow | Processamento de imagem |

### Pipeline de Extracao

```python
def smart_extract(pdf_bytes: bytes) -> str:
    # 1. Tenta extracao nativa
    text = extract_text(pdf_bytes)

    # 2. Se texto vazio ou muito curto, usa OCR
    if len(text.strip()) < 100:
        text = extract_with_ocr(pdf_bytes)

    # 3. Limpa e normaliza
    text = clean_text(text)

    return text
```

---

## Date Utils

### date_utils.py
**Arquivo:** `backend/utils/date_utils.py`

Manipulacao de datas.

```python
from utils.date_utils import (
    parse_brazilian_date,
    format_date_br,
    get_next_maintenance_date,
    calculate_business_days
)
```

### Funcoes

| Funcao | Descricao |
|--------|-----------|
| `parse_brazilian_date(date_str)` | Parseia DD/MM/YYYY para datetime |
| `format_date_br(date)` | Formata datetime para DD/MM/YYYY |
| `get_next_maintenance_date(last_date, frequency)` | Calcula proxima manutencao |
| `calculate_business_days(start, end)` | Dias uteis entre datas |
| `is_business_day(date)` | Verifica se e dia util |
| `add_business_days(date, days)` | Adiciona dias uteis |

### Exemplos

```python
# Parsear data brasileira
date = parse_brazilian_date("25/12/2024")
# datetime(2024, 12, 25)

# Proxima manutencao mensal
next_date = get_next_maintenance_date(
    last_date=datetime(2024, 1, 15),
    frequency="monthly"
)
# datetime(2024, 2, 15)

# Proxima manutencao 250h (trimestral)
next_date = get_next_maintenance_date(
    last_date=datetime(2024, 1, 15),
    frequency="250h"
)
# datetime(2024, 4, 15)
```

### Frequencias de Manutencao

| Tipo | Frequencia | Dias |
|------|------------|------|
| Mensal | 1 mes | 30 |
| 250h | 3 meses | 90 |
| 500h | 6 meses | 180 |
| Anual | 12 meses | 365 |

---

## Validators

### validators.py
**Arquivo:** `backend/utils/validators.py`

Validacao de dados.

```python
from utils.validators import (
    validate_cnpj,
    validate_email,
    validate_phone,
    validate_cep,
    sanitize_string
)
```

### Funcoes

| Funcao | Descricao |
|--------|-----------|
| `validate_cnpj(cnpj)` | Valida CNPJ |
| `validate_cpf(cpf)` | Valida CPF |
| `validate_email(email)` | Valida email |
| `validate_phone(phone)` | Valida telefone |
| `validate_cep(cep)` | Valida CEP |
| `sanitize_string(text)` | Remove caracteres especiais |
| `normalize_phone(phone)` | Normaliza telefone |

### Exemplos

```python
# Validar CNPJ
is_valid = validate_cnpj("12.345.678/0001-90")
# True ou False

# Sanitizar string
clean = sanitize_string("Texto com <script>malicioso</script>")
# "Texto com malicioso"

# Normalizar telefone
phone = normalize_phone("(11) 99999-9999")
# "11999999999"
```

---

## Text Processing

### text_processing.py
**Arquivo:** `backend/utils/text_processing.py`

Processamento de texto.

```python
from utils.text_processing import (
    clean_text,
    extract_numbers,
    extract_dates,
    normalize_whitespace
)
```

### Funcoes

| Funcao | Descricao |
|--------|-----------|
| `clean_text(text)` | Limpa texto de caracteres invalidos |
| `extract_numbers(text)` | Extrai numeros do texto |
| `extract_dates(text)` | Extrai datas do texto |
| `normalize_whitespace(text)` | Normaliza espacos |
| `remove_accents(text)` | Remove acentos |
| `truncate(text, max_len)` | Trunca texto |

---

## File Utils

### file_utils.py
**Arquivo:** `backend/utils/file_utils.py`

Operacoes com arquivos.

```python
from utils.file_utils import (
    save_temp_file,
    get_file_extension,
    generate_unique_filename,
    cleanup_temp_files
)
```

### Funcoes

| Funcao | Descricao |
|--------|-----------|
| `save_temp_file(content, ext)` | Salva arquivo temporario |
| `get_file_extension(filename)` | Retorna extensao |
| `generate_unique_filename(original)` | Gera nome unico |
| `cleanup_temp_files(max_age)` | Limpa arquivos antigos |
| `get_file_size(path)` | Retorna tamanho |
| `is_valid_pdf(content)` | Valida se e PDF |

---

## Response Helpers

### response_helpers.py
**Arquivo:** `backend/utils/response_helpers.py`

Helpers para respostas HTTP.

```python
from utils.response_helpers import (
    success_response,
    error_response,
    paginated_response
)
```

### Funcoes

```python
# Resposta de sucesso
def success_response(data, message="Success"):
    return {
        "success": True,
        "message": message,
        "data": data
    }

# Resposta de erro
def error_response(message, code=400, details=None):
    return {
        "success": False,
        "message": message,
        "code": code,
        "details": details
    }

# Resposta paginada
def paginated_response(data, total, page, limit):
    return {
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": ceil(total / limit)
        }
    }
```

---

## Logging

### logger.py
**Arquivo:** `backend/utils/logger.py`

Sistema de logging.

```python
from utils.logger import logger

logger.info("Mensagem informativa")
logger.warning("Aviso")
logger.error("Erro", exc_info=True)
logger.debug("Debug")
```

### Configuracao

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)
```

---

## Cache

### cache.py
**Arquivo:** `backend/utils/cache.py`

Cache em memoria.

```python
from utils.cache import cache

# Set com TTL
cache.set("key", value, ttl=300)  # 5 minutos

# Get
value = cache.get("key")

# Delete
cache.delete("key")

# Clear all
cache.clear()
```

---

## Rate Limiter

### rate_limiter.py
**Arquivo:** `backend/utils/rate_limiter.py`

Limitacao de taxa de requisicoes.

```python
from utils.rate_limiter import RateLimiter

limiter = RateLimiter(max_requests=100, window_seconds=60)

# Verificar
if limiter.is_allowed(user_id):
    # Processar requisicao
    pass
else:
    # Retornar 429 Too Many Requests
    pass
```

---

## Security

### security.py
**Arquivo:** `backend/utils/security.py`

Funcoes de seguranca.

```python
from utils.security import (
    hash_password,
    verify_password,
    generate_token,
    sanitize_input
)
```

### Funcoes

| Funcao | Descricao |
|--------|-----------|
| `hash_password(password)` | Hash bcrypt |
| `verify_password(password, hash)` | Verifica senha |
| `generate_token(length)` | Gera token aleatorio |
| `sanitize_input(text)` | Sanitiza entrada |
| `escape_html(text)` | Escapa HTML |
