from .base_agent import LuminusBaseAgent
from agno.tools import Tool
from typing import Dict, Any, Optional
import json
import base64
import requests

class LangExtractAgent(LuminusBaseAgent):
    """
    Agent specialized in advanced PDF extraction using LangExtract/Gemini
    Level 3: Advanced knowledge-enabled agent with source grounding
    """
    
    def __init__(self):
        super().__init__(
            name="LangExtract Specialist",
            description="Especialista em extração avançada de dados de PDFs com mapeamento de origem",
            level=3
        )
        
        self.add_tools([
            Tool(
                name="extract_with_langextract",
                description="Extract structured data from PDF using LangExtract/Gemini with source grounding",
                function=self.extract_with_langextract
            ),
            Tool(
                name="validate_extraction_quality",
                description="Validate and score extraction quality with confidence metrics",
                function=self.validate_extraction_quality
            ),
            Tool(
                name="map_source_grounding",
                description="Map extracted data to specific positions in source document",
                function=self.map_source_grounding
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Extração Avançada de PDFs com LangExtract
        
        Você é responsável por:
        1. Extrair dados estruturados de PDFs usando LangExtract/Gemini
        2. Fornecer mapeamento de origem (source grounding) para cada campo extraído
        3. Calcular métricas de confiança para validação de qualidade
        4. Identificar inconsistências e sugerir melhorias na extração
        5. Otimizar schemas de extração baseados no tipo de documento
        
        CAPACIDADES AVANÇADAS:
        - Source grounding: mapear extrações para posições específicas no PDF
        - Confidence scoring: avaliar qualidade e confiabilidade dos dados
        - Schema adaptation: ajustar estruturas baseadas no conteúdo
        - Multi-page processing: processar documentos com múltiplas páginas
        - Fallback integration: usar métodos alternativos quando necessário
        
        FORMATO DE SAÍDA ENRIQUECIDO:
        {{
            "data": {{ extracted_structured_data }},
            "sourceGrounding": [
                {{
                    "field": "client_name",
                    "value": "extracted_value",
                    "page": 1,
                    "position": {{"x": 100, "y": 200}},
                    "confidence": 0.95,
                    "source_text": "original text context"
                }}
            ],
            "metadata": {{
                "overall_confidence": 0.87,
                "pages_processed": 3,
                "extraction_method": "langextract-gemini",
                "processing_time": 2.3,
                "quality_score": "high"
            }}
        }}
        """
    
    async def extract_with_langextract(
        self, 
        pdf_content: bytes, 
        extraction_type: str = "contract",
        custom_schema: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Extract structured data using LangExtract with Gemini"""
        
        try:
            # Convert PDF to base64
            pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            # Prepare extraction request
            extraction_request = {
                "pdfBase64": pdf_base64,
                "extractionType": extraction_type,
                "schema": custom_schema
            }
            
            # Call LangExtract edge function (simulated - would be actual call)
            result = await self._call_langextract_service(extraction_request)
            
            if result.get("success"):
                return {
                    "extraction_result": result.get("data", {}),
                    "source_grounding": result.get("sourceGrounding", []),
                    "confidence_metrics": {
                        "overall_confidence": result.get("confidence", 0.8),
                        "processing_time": result.get("metadata", {}).get("processingTime", 0),
                        "method": result.get("metadata", {}).get("method", "langextract")
                    }
                }
            else:
                return {"error": f"LangExtract failed: {result.get('error', 'Unknown error')}"}
                
        except Exception as e:
            return {"error": f"LangExtract extraction failed: {str(e)}"}
    
    async def validate_extraction_quality(self, extraction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and score extraction quality"""
        
        prompt = f"""
        Analise a qualidade desta extração de dados e forneça métricas detalhadas:
        
        DADOS EXTRAÍDOS:
        {json.dumps(extraction_result.get('extraction_result', {}), indent=2, ensure_ascii=False)}
        
        SOURCE GROUNDING:
        {json.dumps(extraction_result.get('source_grounding', []), indent=2, ensure_ascii=False)}
        
        MÉTRICAS A AVALIAR:
        1. Completude: % de campos obrigatórios preenchidos
        2. Consistência: coerência entre campos relacionados
        3. Confiança: média das confianças individuais
        4. Source Coverage: % de extrações com source grounding válido
        5. Qualidade geral: high/medium/low
        
        Retorne análise detalhada com:
        - scores numéricos (0-1)
        - problemas identificados
        - sugestões de melhoria
        - recomendações para re-extração se necessário
        """
        
        response = await self.run(prompt)
        return {"quality_analysis": response}
    
    async def map_source_grounding(self, extraction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced source grounding mapping"""
        
        source_grounding = extraction_data.get('source_grounding', [])
        
        mapped_data = {}
        for grounding in source_grounding:
            field = grounding.get('field')
            if field:
                mapped_data[field] = {
                    'value': grounding.get('value'),
                    'source_location': {
                        'page': grounding.get('page'),
                        'position': grounding.get('position'),
                        'confidence': grounding.get('confidence')
                    },
                    'source_context': grounding.get('source_text', '')
                }
        
        return {
            "mapped_fields": mapped_data,
            "grounding_coverage": len(mapped_data),
            "total_fields": len(extraction_data.get('extraction_result', {}))
        }
    
    async def _call_langextract_service(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call to LangExtract service - Supabase function call"""
        # TODO: Implement actual Supabase function invocation
        # This placeholder needs to be connected to the actual LangExtract service
        raise NotImplementedError(
            "LangExtract service integration pending. "
            "Please configure the Supabase function connection."
        )