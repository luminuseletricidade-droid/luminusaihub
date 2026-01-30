
import os
import logging
from typing import Dict, Any, Optional
import json
import openai
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimplifiedAgnoSystem:
    """
    Simplified Agno-inspired system for Luminus
    Handles PDF processing, chat, and maintenance planning
    """
    
    def __init__(self):
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # System status
        self.system_status = {
            "initialized": True,
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
            "last_health_check": datetime.now().isoformat()
        }
        
        logger.info("🚀 Simplified Agno System initialized")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status"""
        self.system_status["last_health_check"] = datetime.now().isoformat()
        return self.system_status
    
    async def process_contract(self, pdf_content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process contract with PDF extraction and analysis
        """
        try:
            # Check if text was already extracted (for scanned PDFs)
            if metadata.get("is_scanned_pdf", False):
                logger.warning("⚠️ PDF escaneado detectado - processando com IA mesmo assim")
                # For scanned PDFs, we'll use AI to try to process whatever we can
                extracted_text = metadata.get("extracted_text", "")

                # Se não tem texto, RETORNAR ERRO - não processar com dados falsos
                if not extracted_text or extracted_text == "PDF_SCANNED_DOCUMENT":
                    logger.error("❌ Sem texto extraído - não é possível processar")
                    return {
                        "success": False,
                        "error": "Não foi possível extrair texto do PDF. O documento parece ser escaneado sem OCR.",
                        "workflow_state": {}
                    }

                logger.info(f"Processando com IA: {len(extracted_text)} caracteres")
                # Always try to analyze with AI, even with minimal data
                analysis_result = await self._analyze_contract_with_openai(extracted_text, metadata)
            elif metadata.get("extracted_text"):
                # Use already extracted text from metadata
                extracted_text = metadata["extracted_text"]
                logger.info(f"Using pre-extracted text: {len(extracted_text)} chars")
                # Analyze contract with OpenAI
                analysis_result = await self._analyze_contract_with_openai(extracted_text, metadata)
            else:
                # Extract text from PDF as fallback
                from utils.pdf_extractor import PDFExtractor
                extracted_text, method = PDFExtractor.extract_text_from_bytes(pdf_content)
                # Analyze contract with OpenAI
                analysis_result = await self._analyze_contract_with_openai(extracted_text, metadata)
            
            # Generate maintenance plan
            maintenance_plan = await self._generate_maintenance_plan(analysis_result)
            
            # Validate results
            validation_result = self._validate_contract_data(analysis_result)
            
            # Generate summary
            summary = await self._generate_summary(analysis_result, maintenance_plan)
            
            return {
                "success": True,
                "workflow_state": {
                    "extracted_data": analysis_result,
                    "maintenance_plan": maintenance_plan,
                    "validation_result": validation_result,
                    "workflow_summary": summary
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing contract: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "workflow_state": {}
            }
    
    async def chat_with_user(self, message: str, contract_context: Dict[str, Any] = None) -> str:
        """
        Chat with user using OpenAI
        """
        try:
            # Prepare context
            context = ""
            if contract_context:
                context = f"""
                Contexto do Contrato:
                - Número: {contract_context.get('contract_number', 'N/A')}
                - Cliente: {contract_context.get('client_name', 'N/A')}
                - Tipo: {contract_context.get('contract_type', 'N/A')}
                - Status: {contract_context.get('status', 'N/A')}
                - Equipamento: {contract_context.get('equipment_details', 'N/A')}
                - Localização: {contract_context.get('location', 'N/A')}
                """
            
            # Call OpenAI
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": f"""Você é um assistente especializado em gestão de contratos da Luminus, 
                        empresa de manutenção e locação de geradores. Responda de forma clara e profissional.
                        
                        {context}
                        
                        Foque em:
                        - Análise de contratos
                        - Planos de manutenção
                        - Gestão de equipamentos
                        - Cronogramas técnicos
                        - Relatórios operacionais
                        """
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                max_completion_tokens=1000,
                temperature=1  # Default value required
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            return f"Desculpe, ocorreu um erro na comunicação: {str(e)}"
    
    async def generate_maintenance_plan(self, equipment_data: Dict[str, Any], contract_type: str) -> Dict[str, Any]:
        """
        Generate maintenance plan using OpenAI
        """
        try:
            prompt = f"""
            Gere um plano de manutenção detalhado para:
            
            Equipamento: {equipment_data}
            Tipo de Contrato: {contract_type}
            
            Inclua:
            1. Cronograma de manutenções preventivas
            2. Procedimentos técnicos
            3. Peças de reposição recomendadas
            4. Frequência das inspeções
            5. Alertas e observações importantes
            
            Responda em formato JSON estruturado.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em manutenção de geradores. Gere planos técnicos detalhados e práticos."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=1500,
                temperature=1  # Default value required
            )
            
            return {
                "maintenance_plan": response.choices[0].message.content,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating maintenance plan: {str(e)}")
            return {
                "maintenance_plan": f"Erro ao gerar plano: {str(e)}",
                "generated_at": datetime.now().isoformat()
            }
    
    async def _analyze_contract_with_openai(self, text: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze contract text with OpenAI"""
        try:
            prompt = f"""
            Analise o seguinte contrato e extraia informações estruturadas:
            
            TEXTO DO CONTRATO:
            {text[:3000]}...
            
            METADADOS:
            {json.dumps(metadata, indent=2)}
            
            Extraia e estruture:
            1. Dados do contrato (número, data, valor)
            2. Informações do cliente
            3. Detalhes dos equipamentos
            4. Tipo de serviço (manutenção/locação)
            5. Cronograma e prazos
            6. Observações técnicas
            
            Responda em formato JSON estruturado.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em análise de contratos de manutenção de geradores. Extraia informações precisas e estruturadas."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=1200,
                temperature=1  # Default value required
            )
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(response.choices[0].message.content)
            except:
                return {"analysis": response.choices[0].message.content}
                
        except Exception as e:
            logger.error(f"Error analyzing contract: {str(e)}")
            return {"error": str(e)}
    
    async def _generate_maintenance_plan(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate maintenance plan based on analysis"""
        try:
            equipment_info = analysis_data.get("equipamentos", analysis_data.get("equipment", "Gerador padrão"))
            
            prompt = f"""
            Com base na análise do contrato, gere um plano de manutenção:
            
            DADOS ANALISADOS:
            {json.dumps(analysis_data, indent=2)}
            
            Gere um plano que inclua:
            1. Cronograma de manutenções (diária, semanal, mensal)
            2. Procedimentos específicos para cada tipo de manutenção
            3. Lista de peças e consumíveis
            4. Pontos de verificação críticos
            5. Registro de conformidade
            
            Formato: JSON estruturado e prático.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em manutenção preventiva de geradores. Crie planos técnicos detalhados e executáveis."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=1000,
                temperature=1  # Default value required
            )
            
            return {
                "plan": response.choices[0].message.content,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating maintenance plan: {str(e)}")
            return {"error": str(e)}
    
    def _validate_contract_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted contract data"""
        validation_result = {
            "valid": True,
            "warnings": [],
            "errors": []
        }
        
        # Check for required fields
        required_fields = ["contrato", "cliente", "equipamentos"]
        for field in required_fields:
            if field not in data:
                validation_result["warnings"].append(f"Campo '{field}' não encontrado")
        
        # Check data quality
        if not data.get("contrato", {}).get("numero"):
            validation_result["warnings"].append("Número do contrato não identificado")
        
        if not data.get("cliente", {}).get("nome"):
            validation_result["warnings"].append("Nome do cliente não identificado")
        
        if validation_result["warnings"]:
            validation_result["valid"] = False
        
        return validation_result
    
    async def _generate_summary(self, analysis: Dict[str, Any], maintenance_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Generate workflow summary"""
        try:
            prompt = f"""
            Gere um resumo executivo do processamento do contrato:
            
            ANÁLISE: {json.dumps(analysis, indent=2)[:1000]}...
            PLANO DE MANUTENÇÃO: {json.dumps(maintenance_plan, indent=2)[:1000]}...
            
            Inclua:
            1. Status geral do processamento
            2. Informações principais identificadas
            3. Próximos passos recomendados
            4. Alertas ou observações importantes
            
            Seja conciso e objetivo.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um assistente executivo. Gere resumos claros e acionáveis."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=500,
                temperature=1  # Default value required
            )
            
            return {
                "summary": response.choices[0].message.content,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return {"error": str(e)}

# Global instance
luminos_agno_system = SimplifiedAgnoSystem()
