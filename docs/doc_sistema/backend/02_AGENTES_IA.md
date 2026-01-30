# Backend - Sistema de Agentes IA

## Visao Geral

O sistema utiliza agentes especializados baseados no framework Agno para processamento inteligente.

## Arquitetura de Agentes

```
┌─────────────────────────────────────────────────────┐
│                    Orquestrador                      │
│              (agno_workflows/)                       │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Smart    │  │   PDF     │  │Maintenance│
│  Chat     │  │ Processor │  │  Planner  │
└───────────┘  └───────────┘  └───────────┘
        │              │              │
        ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Report   │  │ Schedule  │  │ Document  │
│ Generator │  │ Generator │  │ Generator │
└───────────┘  └───────────┘  └───────────┘
```

---

## Agente Base

### base_agent.py
**Arquivo:** `backend/agno_agents/base_agent.py`

Classe base para todos os agentes.

```python
class BaseAgent:
    def __init__(self, name: str, model: str = "gemini-1.5-flash"):
        self.name = name
        self.model = model
        self.memory = []

    async def process(self, input_data: dict) -> dict:
        """Metodo principal de processamento"""
        raise NotImplementedError

    def add_to_memory(self, item: dict):
        """Adiciona item a memoria do agente"""
        self.memory.append(item)

    def clear_memory(self):
        """Limpa memoria do agente"""
        self.memory = []
```

**Caracteristicas:**
- Suporte a multiplos modelos (Gemini, OpenAI)
- Sistema de memoria para contexto
- Logging integrado
- Rate limiting automatico

---

## Smart Chat Agent

### smart_chat_agent.py
**Arquivo:** `backend/agno_agents/smart_chat_agent.py`

Agente de chat inteligente com contexto.

```python
class SmartChatAgent(BaseAgent):
    def __init__(self):
        super().__init__("smart_chat", model="gemini-1.5-pro")

    async def process(self, message: str, context: dict) -> str:
        """
        Processa mensagem do usuario com contexto.

        Args:
            message: Mensagem do usuario
            context: Contexto (contrato, historico, etc)

        Returns:
            Resposta gerada pelo modelo
        """
```

**Funcionalidades:**
- Responde perguntas sobre contratos
- Consulta historico de manutencoes
- Sugere acoes baseadas em dados
- Mantem contexto da conversa

**Exemplo de Uso:**
```python
agent = SmartChatAgent()
response = await agent.process(
    message="Qual a proxima manutencao do contrato CTR-001?",
    context={
        "contract_id": "uuid",
        "history": [...]
    }
)
```

---

## PDF Processor Agent

### pdf_processor_agent.py
**Arquivo:** `backend/agno_agents/pdf_processor_agent.py`

Agente para extracao de dados de PDFs.

```python
class PDFProcessorAgent(BaseAgent):
    def __init__(self):
        super().__init__("pdf_processor")

    async def extract_contract_data(self, pdf_content: bytes) -> dict:
        """
        Extrai dados estruturados de contrato PDF.

        Returns:
            {
                "client_name": str,
                "contract_number": str,
                "equipment_code": str,
                "power_kva": int,
                "services": list,
                "dates": dict,
                "confidence": float
            }
        """
```

**Pipeline de Processamento:**

1. **Extracao de Texto**
   - pdfplumber para PDFs texto
   - OCR (pytesseract) para PDFs escaneados

2. **Pre-processamento**
   - Limpeza de caracteres especiais
   - Normalizacao de espacos
   - Deteccao de encoding

3. **Extracao Estruturada**
   - Regex para padroes conhecidos
   - LLM para dados nao estruturados
   - Validacao cruzada

4. **Pos-processamento**
   - Validacao de campos
   - Calculo de confianca
   - Formatacao de saida

---

## Maintenance Planner Agent

### maintenance_planner_agent.py
**Arquivo:** `backend/agno_agents/maintenance_planner_agent.py`

Agente para planejamento de manutencoes.

```python
class MaintenancePlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("maintenance_planner")

    async def generate_schedule(
        self,
        contracts: list,
        start_date: date,
        end_date: date
    ) -> list:
        """
        Gera cronograma de manutencoes.

        Returns:
            Lista de manutencoes programadas
        """

    async def optimize_routes(
        self,
        maintenances: list,
        technicians: list
    ) -> dict:
        """
        Otimiza rotas por tecnico.
        """
```

**Algoritmos:**
- Distribuicao por regiao
- Balanceamento de carga por tecnico
- Priorizacao por urgencia
- Otimizacao de deslocamento

---

## Report Generator Agent

### report_generator_agent.py
**Arquivo:** `backend/agno_agents/report_generator_agent.py`

Agente para geracao de relatorios.

```python
class ReportGeneratorAgent(BaseAgent):
    def __init__(self):
        super().__init__("report_generator")

    async def generate_status_report(
        self,
        period: tuple,
        filters: dict
    ) -> dict:
        """
        Gera relatorio de status.
        """

    async def generate_performance_report(
        self,
        technician_id: str,
        period: tuple
    ) -> dict:
        """
        Gera relatorio de performance.
        """
```

**Tipos de Relatorio:**
- Status geral de manutencoes
- Performance por tecnico
- Analise por regiao
- Tendencias temporais
- Alertas e anomalias

---

## Schedule Generator Agent

### schedule_generator_agent.py
**Arquivo:** `backend/agno_agents/schedule_generator_agent.py`

Agente para geracao de cronogramas.

```python
class ScheduleGeneratorAgent(BaseAgent):
    async def generate_annual_schedule(
        self,
        contract_id: str,
        year: int
    ) -> list:
        """
        Gera cronograma anual de manutencoes.
        """
```

**Considera:**
- Periodicidade por tipo de manutencao
- Disponibilidade de tecnicos
- Feriados e recessos
- Historico de manutencoes

---

## Document Generator Agent

### document_generators.py
**Arquivo:** `backend/agno_agents/document_generators.py`

Agente para geracao de documentos.

```python
class DocumentGeneratorAgent(BaseAgent):
    async def generate_proposal(
        self,
        client_id: str,
        services: list
    ) -> bytes:
        """
        Gera proposta comercial em PDF.
        """

    async def generate_report_pdf(
        self,
        report_data: dict
    ) -> bytes:
        """
        Gera relatorio em PDF.
        """

    async def generate_checklist(
        self,
        maintenance_type: str
    ) -> bytes:
        """
        Gera checklist de manutencao.
        """
```

**Templates:**
- Proposta comercial
- Relatorio tecnico
- Checklist de manutencao
- Termo de garantia
- Ordem de servico

---

## LangExtract Agent

### langextract_agent.py
**Arquivo:** `backend/agno_agents/langextract_agent.py`

Agente para extracao de linguagem natural.

```python
class LangExtractAgent(BaseAgent):
    async def extract_entities(
        self,
        text: str,
        entity_types: list
    ) -> dict:
        """
        Extrai entidades de texto.
        """

    async def classify_intent(
        self,
        message: str
    ) -> str:
        """
        Classifica intencao da mensagem.
        """
```

**Entidades Suportadas:**
- Datas e periodos
- Valores monetarios
- Nomes de empresas
- Codigos de equipamento
- Tipos de servico

---

## Workflows

### contract_processing_workflow.py
**Arquivo:** `backend/agno_workflows/contract_processing_workflow.py`

Orquestra processamento de contrato.

```python
class ContractProcessingWorkflow:
    async def process(self, pdf_file: bytes) -> dict:
        # 1. Extrai texto do PDF
        text = await pdf_processor.extract_text(pdf_file)

        # 2. Extrai entidades
        entities = await langextract.extract_entities(text)

        # 3. Estrutura dados
        contract_data = await pdf_processor.structure_data(entities)

        # 4. Valida dados
        validated = await self.validate(contract_data)

        # 5. Salva no banco
        saved = await self.save(validated)

        return saved
```

---

### maintenance_workflow.py
**Arquivo:** `backend/agno_workflows/maintenance_workflow.py`

Orquestra geracao de cronograma.

```python
class MaintenanceWorkflow:
    async def generate_annual_plan(
        self,
        contracts: list,
        year: int
    ) -> dict:
        # 1. Analisa contratos
        analysis = await planner.analyze_contracts(contracts)

        # 2. Gera cronograma base
        schedule = await scheduler.generate_schedule(analysis, year)

        # 3. Otimiza distribuicao
        optimized = await planner.optimize(schedule)

        # 4. Gera relatorio
        report = await reporter.generate_report(optimized)

        return {
            "schedule": optimized,
            "report": report
        }
```

---

## Configuracao de Modelos

### Modelos Disponiveis

| Modelo | Provider | Uso |
|--------|----------|-----|
| gemini-1.5-flash | Google | Chat rapido |
| gemini-1.5-pro | Google | Tarefas complexas |
| gpt-4o | OpenAI | Alta precisao |
| gpt-4o-mini | OpenAI | Custo reduzido |

### Selecao de Modelo

```python
# Baseado na complexidade da tarefa
def select_model(task_type: str) -> str:
    if task_type in ["extraction", "analysis"]:
        return "gemini-1.5-pro"
    elif task_type == "chat":
        return "gemini-1.5-flash"
    elif task_type == "generation":
        return "gpt-4o"
    return "gemini-1.5-flash"
```

---

## Prompts

### Localizacao
**Pasta:** `backend/prompts/`

Prompts sao armazenados em arquivos separados para facil manutencao.

```
prompts/
├── extraction/
│   ├── contract_extraction.txt
│   └── entity_extraction.txt
├── chat/
│   ├── system_prompt.txt
│   └── context_prompt.txt
├── generation/
│   ├── proposal_template.txt
│   └── report_template.txt
└── planning/
    └── schedule_prompt.txt
```

---

## Metricas e Monitoramento

### Logs
Todos agentes registram:
- Tempo de execucao
- Tokens consumidos
- Taxa de sucesso
- Erros e excecoes

### Metricas
```python
{
    "agent": "smart_chat",
    "execution_time_ms": 1250,
    "tokens_input": 500,
    "tokens_output": 200,
    "success": true,
    "model": "gemini-1.5-flash"
}
```
