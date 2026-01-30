# Fluxo de Processamento de PDF

## Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                     Upload de PDF                                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Frontend              │
                    │   ContractUpload.tsx    │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Converte para         │
                    │   Base64                │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   POST /api/            │
                    │   process-base64-pdf    │
                    └───────────┬─────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Pipeline                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐        ┌──────────────┐
          │ PDF Texto       │        │ PDF          │
          │ (nativo)        │        │ Escaneado    │
          └────────┬────────┘        └──────┬───────┘
                   │                        │
                   ▼                        ▼
          ┌─────────────────┐        ┌──────────────┐
          │ pdfplumber      │        │ OCR          │
          │ extract_text()  │        │ pytesseract  │
          └────────┬────────┘        └──────┬───────┘
                   │                        │
                   └──────────┬─────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │   Texto Extraido        │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   LLM (Gemini)          │
                    │   Extrai campos         │
                    │   estruturados          │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Validacao             │
                    │   Calculo confianca     │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Response JSON         │
                    │   { extracted_data }    │
                    └─────────────────────────┘
```

---

## Fluxo Detalhado - Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                   PDFProcessorAgent                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ 1. Recebe PDF bytes     │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 2. Detecta tipo         │
                    │    is_scanned_pdf()     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐        ┌──────────────┐
          │ Texto nativo    │        │ Escaneado    │
          └────────┬────────┘        └──────┬───────┘
                   │                        │
                   ▼                        ▼
          ┌─────────────────┐        ┌──────────────┐
          │ pdfplumber      │        │ pdf2image    │
          │ .extract_text() │        │ convert()    │
          └────────┬────────┘        └──────┬───────┘
                   │                        │
                   │                        ▼
                   │                 ┌──────────────┐
                   │                 │ pytesseract  │
                   │                 │ image_to_    │
                   │                 │ string()     │
                   │                 └──────┬───────┘
                   │                        │
                   └──────────┬─────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │ 3. Pre-processamento    │
                    │    - Remove espacos     │
                    │    - Normaliza encoding │
                    │    - Remove ruido       │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 4. Extracao Regex       │
                    │    - CNPJ               │
                    │    - Datas              │
                    │    - Valores            │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 5. Extracao LLM         │
                    │    - Cliente            │
                    │    - Servicos           │
                    │    - Equipamento        │
                    │    - Condicoes          │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 6. Merge e Validacao    │
                    │    - Combina resultados │
                    │    - Valida campos      │
                    │    - Calcula confianca  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 7. Retorna dados        │
                    │    estruturados         │
                    └─────────────────────────┘
```

---

## Prompt de Extracao (LLM)

```
Voce e um especialista em extracao de dados de contratos.
Analise o texto abaixo e extraia as seguintes informacoes:

TEXTO DO CONTRATO:
{texto_extraido}

EXTRAIA:
1. Nome do cliente (razao social)
2. CNPJ do cliente
3. Numero do contrato
4. Codigo do equipamento
5. Potencia (KVA)
6. Endereco de instalacao
7. Servicos inclusos no contrato
8. Data de inicio
9. Data de termino
10. Valor do contrato
11. Responsavel tecnico

Retorne em formato JSON.
```

---

## Estrutura de Resposta

```json
{
  "success": true,
  "extracted_data": {
    "client_name": "Empresa ABC Ltda",
    "cnpj": "12.345.678/0001-90",
    "contract_number": "CTR-2024-001",
    "equipment_code": "GMG-001",
    "power_kva": 500,
    "address": {
      "street": "Rua Principal",
      "number": "100",
      "city": "Sao Paulo",
      "state": "SP"
    },
    "services": [
      "Manutencao Mensal",
      "Manutencao Preventiva 250h",
      "Manutencao Preventiva 500h"
    ],
    "start_date": "01/01/2024",
    "end_date": "31/12/2024",
    "contract_value": 24000.00,
    "technical_responsible": "Joao Silva"
  },
  "confidence": 0.92,
  "warnings": [
    "Endereco parcialmente extraido"
  ]
}
```

---

## Fluxo de UI (Frontend)

```
┌─────────────────────────────────────────────────────────────────┐
│                   ContractUpload.tsx                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Estado: idle    │    │ Estado:         │    │ Estado:         │
│                 │    │ uploading       │    │ processing      │
│ [Selecionar     │    │                 │    │                 │
│  Arquivo]       │───>│ Progress bar    │───>│ Spinner         │
│                 │    │ "Enviando..."   │    │ "Processando..."|
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                              ▼                        ▼                        ▼
                   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                   │ Estado: success │    │ Estado: review  │    │ Estado: error   │
                   │                 │    │                 │    │                 │
                   │ Dados extraidos │    │ Campos para     │    │ Mensagem erro   │
                   │ com alta        │    │ revisao manual  │    │ [Tentar         │
                   │ confianca       │    │ (baixa conf.)   │    │  novamente]     │
                   └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Tratamento de Erros

| Erro | Causa | Acao |
|------|-------|------|
| PDF_INVALID | Arquivo corrompido | Solicitar novo upload |
| PDF_ENCRYPTED | PDF protegido | Solicitar versao sem senha |
| EXTRACTION_FAILED | Texto ilegivel | Tentar OCR ou manual |
| LLM_TIMEOUT | Timeout na API | Retry automatico |
| LOW_CONFIDENCE | Extracao incerta | Revisao manual |
