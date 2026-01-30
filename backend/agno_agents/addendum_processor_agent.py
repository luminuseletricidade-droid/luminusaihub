"""
Addendum Processor Agent
Specialized agent for analyzing contract addendums and extracting changes
Uses Gemini for larger context window and better comparison capabilities
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class AddendumProcessorAgent:
    """
    Agent specialized in processing contract addendums (aditivos)
    and extracting change suggestions using Gemini AI
    """

    def __init__(self):
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
        self.client = genai.Client(api_key=gemini_api_key)
        self.model = "gemini-2.5-flash"

    def get_system_prompt(self) -> str:
        """Get system prompt for addendum analysis"""
        return """Você é um especialista em análise de aditivos contratuais da Luminus, empresa de manutenção e locação de geradores.

Sua função é analisar o texto extraído de um aditivo contratual e identificar todas as alterações que ele faz ao contrato original.

TIPOS DE ALTERAÇÕES A IDENTIFICAR:

1. **date_change**: Alterações em datas
   - Prorrogação de vigência (end_date)
   - Nova data de início (start_date)
   - Alteração de data de renovação

2. **value_change**: Alterações em valores
   - Novo valor mensal (monthly_value)
   - Novo valor total (value)
   - Reajustes de preço

3. **service_add**: Adição de novos serviços
   - Novos serviços de manutenção
   - Novos itens incluídos no escopo

4. **service_remove**: Remoção de serviços
   - Serviços excluídos do escopo

5. **maintenance_add**: Novas manutenções
   - Novos tipos de manutenção
   - Novas frequências de manutenção
   - Novos equipamentos para manutenção

6. **equipment_update**: Alterações em equipamentos
   - Troca de equipamento
   - Atualização de especificações

7. **condition_change**: Alterações em condições
   - Novas condições especiais
   - Alterações em termos de garantia
   - Novas cláusulas contratuais

FORMATO DE RESPOSTA:
Responda SEMPRE em JSON válido com a estrutura:
{
    "summary": "Resumo geral das alterações identificadas no aditivo",
    "detected_changes": [
        {
            "type": "tipo_da_alteracao",
            "field_name": "nome_do_campo_afetado",
            "current_value": "valor_atual_se_conhecido",
            "suggested_value": "novo_valor_sugerido",
            "description": "Descrição clara da alteração",
            "confidence_score": 0.95
        }
    ]
}

REGRAS:
- O confidence_score deve ser entre 0.0 e 1.0
- field_name deve corresponder aos campos do banco: start_date, end_date, value, monthly_value, services, special_conditions, warranty_terms, equipment_type, etc.
- Para maintenance_add, inclua maintenance_data com: title, description, frequency, equipment_type
- Seja preciso e objetivo nas descrições
- Se não identificar alterações, retorne detected_changes como array vazio
- IMPORTANTE: Sua resposta deve ser APENAS o JSON, sem markdown, sem ```json, apenas o objeto JSON puro"""

    def analyze_addendum(
        self,
        addendum_text: str,
        contract_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes addendum text and extracts suggested changes using Gemini

        Gemini provides a larger context window (1M+ tokens) which allows
        full comparison between contract and addendum for better similarity detection.

        Args:
            addendum_text: Extracted text from the addendum PDF
            contract_data: Optional current contract data for comparison

        Returns:
            Dictionary with summary and detected changes
        """
        try:
            # Build comprehensive context with contract data if available
            # Gemini's large context allows sending full contract data
            context = ""
            if contract_data:
                # Include more detailed contract information for better comparison
                services_list = contract_data.get('services', [])
                services_str = json.dumps(services_list, ensure_ascii=False) if services_list else 'N/A'

                context = f"""
DADOS COMPLETOS DO CONTRATO ATUAL (para comparação e identificação de similaridades):

INFORMAÇÕES GERAIS:
- Número do Contrato: {contract_data.get('contract_number', 'N/A')}
- Tipo de Contrato: {contract_data.get('contract_type', 'N/A')}
- Status: {contract_data.get('status', 'N/A')}
- Descrição: {contract_data.get('description', 'N/A')}

CLIENTE:
- Nome/Razão Social: {contract_data.get('client_name', 'N/A')}
- CNPJ: {contract_data.get('cnpj', contract_data.get('client_cnpj', 'N/A'))}
- Email: {contract_data.get('client_email', 'N/A')}
- Telefone: {contract_data.get('client_phone', 'N/A')}
- Endereço: {contract_data.get('client_address', 'N/A')}
- Cidade/Estado: {contract_data.get('client_city', 'N/A')}/{contract_data.get('client_state', 'N/A')}

VALORES:
- Valor Mensal: R$ {contract_data.get('monthly_value', 'N/A')}
- Valor Total: R$ {contract_data.get('value', contract_data.get('contract_value', 'N/A'))}
- Dia de Vencimento: {contract_data.get('payment_due_day', 'N/A')}

DATAS:
- Data de Início: {contract_data.get('start_date', 'N/A')}
- Data de Fim: {contract_data.get('end_date', 'N/A')}
- Duração (meses): {contract_data.get('duration_months', 'N/A')}
- Renovação Automática: {contract_data.get('automatic_renewal', 'N/A')}

EQUIPAMENTO:
- Tipo: {contract_data.get('equipment_type', 'N/A')}
- Marca: {contract_data.get('equipment_brand', 'N/A')}
- Modelo: {contract_data.get('equipment_model', 'N/A')}
- Número de Série: {contract_data.get('equipment_serial', 'N/A')}
- Potência: {contract_data.get('equipment_power', 'N/A')}
- Voltagem: {contract_data.get('equipment_voltage', 'N/A')}
- Localização: {contract_data.get('equipment_location', 'N/A')}

SERVIÇOS CONTRATADOS:
{services_str}

CONDIÇÕES:
- Frequência de Manutenção: {contract_data.get('maintenance_frequency', 'N/A')}
- Condições Especiais: {contract_data.get('special_conditions', 'N/A')}
- Termos de Garantia: {contract_data.get('warranty_terms', 'N/A')}
- Notas Técnicas: {contract_data.get('technical_notes', 'N/A')}
- Observações: {contract_data.get('observations', contract_data.get('notes', 'N/A'))}
"""

            # Full prompt combining system instructions and user request
            full_prompt = f"""{self.get_system_prompt()}

{context}

================================================================================
TEXTO COMPLETO DO ADITIVO A SER ANALISADO:
================================================================================
{addendum_text}

================================================================================
INSTRUÇÕES FINAIS:
================================================================================
1. Compare DETALHADAMENTE o texto do aditivo com os dados do contrato acima
2. Identifique TODAS as alterações, mesmo as sutis
3. Preste atenção especial a:
   - Mudanças de datas (prorrogações, novos prazos)
   - Alterações de valores (reajustes, novos preços)
   - Adição ou remoção de serviços
   - Novas manutenções ou equipamentos
   - Mudanças em condições contratuais
4. Retorne APENAS o JSON válido, sem explicações adicionais"""

            # Configure Gemini for JSON output
            config = types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )

            logger.info(f"Calling Gemini API with model {self.model} for addendum analysis...")

            response = self.client.models.generate_content(
                model=self.model,
                contents=full_prompt,
                config=config
            )

            result_text = response.text

            # Clean response if needed (remove markdown code blocks)
            if result_text.startswith("```"):
                result_text = result_text.strip()
                if result_text.startswith("```json"):
                    result_text = result_text[7:]
                elif result_text.startswith("```"):
                    result_text = result_text[3:]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            result = json.loads(result_text)

            logger.info(f"Addendum analysis completed with Gemini: {len(result.get('detected_changes', []))} changes detected")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Gemini response as JSON: {e}")
            logger.error(f"Raw response: {result_text[:500] if 'result_text' in locals() else 'N/A'}")
            return {
                "summary": "Erro ao processar resposta da IA",
                "detected_changes": [],
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Error analyzing addendum with Gemini: {e}")
            return {
                "summary": f"Erro na análise: {str(e)}",
                "detected_changes": [],
                "error": str(e)
            }


async def process_addendum_async(
    addendum_id: str,
    extracted_text: str,
    contract_id: str,
    db
) -> Dict[str, Any]:
    """
    Async function to process an addendum with AI analysis

    Args:
        addendum_id: ID of the addendum to process
        extracted_text: Text extracted from the addendum PDF
        contract_id: ID of the parent contract
        db: Database instance

    Returns:
        Processing result with insights and created changes
    """
    try:
        logger.info(f"Starting async processing of addendum {addendum_id}")

        # Get contract data for context
        contract_data = db.get_contract(contract_id)

        # Initialize agent and analyze
        agent = AddendumProcessorAgent()
        analysis_result = agent.analyze_addendum(extracted_text, contract_data)

        # Update addendum with insights
        db.update_addendum(addendum_id, {
            "extracted_insights": analysis_result,
            "processing_status": "completed",
            "status": "analyzed"
        })

        # Create pending changes for each detected change
        detected_changes = analysis_result.get("detected_changes", [])
        created_changes = []

        for change in detected_changes:
            change_data = {
                "addendum_id": addendum_id,
                "contract_id": contract_id,
                "change_type": change.get("type"),
                "field_name": change.get("field_name"),
                "current_value": change.get("current_value"),
                "suggested_value": change.get("suggested_value"),
                "change_description": change.get("description"),
                "confidence_score": change.get("confidence_score"),
                "status": "pending"
            }

            # Handle maintenance_add with extra data
            if change.get("type") == "maintenance_add" and change.get("maintenance_data"):
                change_data["maintenance_data"] = change.get("maintenance_data")

            created_change = db.create_pending_change(change_data)
            if created_change:
                created_changes.append(created_change)

        logger.info(f"Addendum {addendum_id} processed: {len(created_changes)} pending changes created")

        return {
            "success": True,
            "addendum_id": addendum_id,
            "summary": analysis_result.get("summary", ""),
            "changes_created": len(created_changes)
        }

    except Exception as e:
        logger.error(f"Error in async addendum processing: {e}")

        # Update addendum with error status
        try:
            db.update_addendum(addendum_id, {
                "processing_status": "error",
                "processing_error": str(e)
            })
        except Exception:
            pass

        return {
            "success": False,
            "addendum_id": addendum_id,
            "error": str(e)
        }


def process_addendum_sync(
    addendum_id: str,
    extracted_text: str,
    contract_id: str,
    db
) -> Dict[str, Any]:
    """
    Synchronous wrapper for addendum processing

    Args:
        addendum_id: ID of the addendum to process
        extracted_text: Text extracted from the addendum PDF
        contract_id: ID of the parent contract
        db: Database instance

    Returns:
        Processing result
    """
    return asyncio.run(process_addendum_async(addendum_id, extracted_text, contract_id, db))
