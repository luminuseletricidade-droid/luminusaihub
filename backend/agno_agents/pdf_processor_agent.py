
from .base_agent import LuminusBaseAgent
from agno.tools import Tool
from typing import Dict, Any
import json
import base64

from ..utils.pdf_extractor import PDFExtractor

class PDFProcessorAgent(LuminusBaseAgent):
    """
    Agent specialized in PDF contract processing and data extraction
    Level 2: Knowledge-enabled agent
    """
    
    def __init__(self):
        super().__init__(
            name="PDF Processor",
            description="Especialista em processamento e extração de dados de contratos PDF",
            level=2
        )
        
        self.add_tools([
            Tool(
                name="extract_contract_data",
                description="Extract structured data from contract PDF",
                function=self.extract_contract_data
            ),
            Tool(
                name="validate_contract_data",
                description="Validate extracted contract data for completeness",
                function=self.validate_contract_data
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Processamento de Contratos PDF
        
        Você é responsável por:
        1. Extrair dados estruturados de contratos em PDF
        2. Identificar informações-chave: cliente, equipamentos, valores, datas
        3. Validar completude e consistência dos dados extraídos
        4. Classificar tipo de contrato (manutenção, locação, misto)
        5. Detectar cláusulas importantes e condições especiais
        
        FORMATO DE SAÍDA PADRÃO:
        {{
            "cliente": {{
                "nome": "string",
                "cnpj": "string",
                "contato": "string",
                "endereco": "string"
            }},
            "contrato": {{
                "numero": "string",
                "tipo": "manutenção|locação|misto",
                "valor_mensal": "number",
                "valor_total": "number",
                "inicio": "date",
                "fim": "date"
            }},
            "equipamentos": [
                {{
                    "tipo": "string",
                    "modelo": "string",
                    "quantidade": "number",
                    "localizacao": "string"
                }}
            ],
            "servicos": {{
                "tipo_manutencao": "preventiva|corretiva|ambas",
                "frequencia": "string",
                "responsavel_tecnico": "string"
            }}
        }}
        """
    
    async def extract_contract_data(self, pdf_input: Any) -> Dict[str, Any]:
        """Extract structured data directly from a PDF source"""
        try:
            if isinstance(pdf_input, (bytes, bytearray)):
                pdf_bytes = pdf_input
            elif isinstance(pdf_input, str):
                if pdf_input.startswith('data:'):
                    pdf_bytes = base64.b64decode(pdf_input.split(',', 1)[1])
                elif pdf_input.endswith('.pdf'):
                    with open(pdf_input, 'rb') as f:
                        pdf_bytes = f.read()
                else:
                    pdf_bytes = base64.b64decode(pdf_input)
            else:
                return {"error": "Unsupported PDF input"}

            # Extract ALL text from PDF first
            pdf_text, _ = PDFExtractor.extract_text_from_bytes(pdf_bytes)

            # Store complete text for CNPJ finding
            full_text = pdf_text

        except Exception as e:
            return {"error": f"Failed to extract text: {e}"}

        prompt = f"""
        Analise este texto COMPLETO de contrato e extraia TODAS as informações estruturadas.

        INSTRUÇÕES IMPORTANTES:
        1. PRIMEIRO extraia TODO o texto do documento
        2. PROCURE INTELIGENTEMENTE pelo CNPJ em QUALQUER formato:
           - XX.XXX.XXX/0001-XX (formato padrão)
           - XXXXXXXX0001XX (sem formatação)
           - XX XXX XXX/0001 XX (com espaços)
           - Pode estar escrito como "CNPJ:", "C.N.P.J:", "CNPJ nº", etc.
           - Pode estar em cabeçalhos, rodapés ou corpo do texto
           - SEMPRE procure por 14 dígitos que representem um CNPJ
        3. O CNPJ é OBRIGATÓRIO - se encontrar algo parecido, extraia mesmo com formato diferente
        4. Se encontrar múltiplos CNPJs, use o primeiro que aparecer (geralmente do contratante)

        TEXTO COMPLETO DO CONTRATO:
        {full_text[:15000]}  # Aumenta limite para capturar mais texto

        Retorne um JSON estruturado seguindo o formato padrão.
        IMPORTANTE: Se encontrar QUALQUER sequência de 14 dígitos que possa ser um CNPJ,
        inclua no campo cliente.cnpj, mesmo que o formato não seja perfeito.
        """

        response = await self.run(prompt)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                extracted_data = json.loads(json_str)

                # Adicionar o texto completo para análise posterior se necessário
                extracted_data["_full_text"] = full_text[:5000]  # Primeiros 5000 chars para referência

                return extracted_data
        except Exception as e:
            print(f"Error parsing JSON response: {e}")

        return {"error": "Failed to extract structured data", "raw_response": response}
    
    async def validate_contract_data(self, contract_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted contract data with intelligent CNPJ detection"""

        import re

        # Get client data and CNPJ
        cliente_data = contract_data.get("cliente", {})
        cnpj = cliente_data.get("cnpj", "").strip()

        # If no CNPJ found in structured data, try to find it in full text
        if not cnpj or cnpj == "string" or cnpj.lower() == "não identificado":
            full_text = contract_data.get("_full_text", "")

            if full_text:
                # Try multiple patterns to find CNPJ in text
                cnpj_patterns = [
                    r'\b\d{2}[\s\.]?\d{3}[\s\.]?\d{3}[\s\/]?\d{4}[\s\-]?\d{2}\b',  # With separators
                    r'\b\d{14}\b',  # Just 14 digits
                    r'CNPJ[\s:]*([\d\s\.\/-]+)',  # After CNPJ label
                    r'C\.N\.P\.J[\s:]*([\d\s\.\/-]+)',  # After C.N.P.J label
                ]

                for pattern in cnpj_patterns:
                    matches = re.findall(pattern, full_text, re.IGNORECASE)
                    if matches:
                        # Clean the first match
                        potential_cnpj = re.sub(r'[^\d]', '', matches[0])
                        if len(potential_cnpj) >= 14:
                            cnpj = potential_cnpj[:14]
                            # Update the contract data with found CNPJ
                            if "cliente" not in contract_data:
                                contract_data["cliente"] = {}
                            contract_data["cliente"]["cnpj"] = self._format_cnpj(cnpj)
                            break

        # Clean CNPJ for validation (remove all non-digits)
        cnpj_digits = re.sub(r'[^\d]', '', cnpj)

        # Check if we have at least 14 digits
        if len(cnpj_digits) < 14:
            return {
                "status": "invalid",
                "error": "CNPJ não identificado ou incompleto",
                "message": "O CNPJ é obrigatório e não foi possível identificá-lo no documento.",
                "validation_report": {
                    "status": "invalid",
                    "issues": ["CNPJ não encontrado ou com menos de 14 dígitos"],
                    "suggestions": [
                        "Verifique se o documento contém o CNPJ da empresa",
                        "O CNPJ pode estar em formato não padrão - revise manualmente"
                    ]
                },
                "extracted_cnpj": cnpj if cnpj else None
            }

        # Format CNPJ if we have 14+ digits
        if len(cnpj_digits) >= 14:
            formatted_cnpj = self._format_cnpj(cnpj_digits[:14])
            contract_data["cliente"]["cnpj"] = formatted_cnpj

        # Remove full text before validation to avoid token overflow
        clean_contract_data = {k: v for k, v in contract_data.items() if k != "_full_text"}

        validation_prompt = f"""
        Valide estes dados extraídos de contrato:

        {json.dumps(clean_contract_data, indent=2, ensure_ascii=False)}

        Verifique:
        1. Completude dos campos obrigatórios (CNPJ já foi processado e formatado)
        2. Consistência de datas (início < fim)
        3. Coerência entre tipo de contrato e serviços
        4. Valores numéricos válidos

        Retorne um relatório de validação com:
        - status: "valid" | "invalid" | "warning"
        - issues: lista de problemas encontrados
        - suggestions: sugestões de correção
        """

        response = await self.run(validation_prompt)
        return {
            "status": "valid",
            "validation_report": response,
            "cnpj_extracted": formatted_cnpj if 'formatted_cnpj' in locals() else cnpj
        }

    def _format_cnpj(self, cnpj_digits: str) -> str:
        """Format CNPJ digits to standard format XX.XXX.XXX/0001-XX"""
        if len(cnpj_digits) < 14:
            return cnpj_digits

        # Ensure we have exactly 14 digits
        cnpj_digits = cnpj_digits[:14]

        # Format: XX.XXX.XXX/0001-XX
        return f"{cnpj_digits[0:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:14]}"
