
# 🚀 Luminos Backend - PDF Processor

Sistema robusto de processamento de PDFs para contratos de manutenção de geradores.

## Quick Start

1. **Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. **Configure:**
   ```bash
   cp .env.example .env
   # Edite .env e adicione sua OPENAI_API_KEY
   # Para staging defina ENVIRONMENT=staging
   # Ajuste SUPABASE_DB_SCHEMA/SUPABASE_STAGING_SCHEMA conforme necessário
   ```

3. **Run:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Endpoints

- `POST /extract-pdf` - Analisar contrato PDF
- `GET /health` - Status da API  
- `GET /docs` - Documentação Swagger

## Recursos

- ✅ Suporte a PDFs de até 50MB
- ✅ Múltiplas bibliotecas de extração (fallback)
- ✅ Análise inteligente com OpenAI GPT-4
- ✅ Resposta estruturada em JSON
- ✅ Logs detalhados para debug

## Integration

```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:8000/extract-pdf', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log(result.data); // Dados extraídos do contrato
```

## Bibliotecas de PDF

O sistema tenta extrair texto usando múltiplas bibliotecas:

1. **PDFPlumber** - Melhor para layout complexo e tabelas
2. **PyPDF2** - Rápido e eficiente para PDFs simples  
3. **PDFMiner** - Mais robusto para PDFs difíceis

Se uma falha, automaticamente tenta a próxima.
