"""
Document Summarizer Agent
Creates AI summaries for any contract document to provide context for the Chat AI.
Uses Gemini for document understanding and summary generation.
Supports multiple file formats through MultiFormatExtractor.
"""

import os
import json
import logging
import asyncio
import base64
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class DocumentSummarizerAgent:
    """
    Agent specialized in summarizing contract documents for Chat AI context.
    Creates concise summaries that help the AI understand document contents.
    Supports: PDF, CSV, PNG, JPG, Excel, Doc and more.
    """

    # Image extensions that should use Gemini Vision
    IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}

    def __init__(self):
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
        self.client = genai.Client(api_key=gemini_api_key)
        self.model = "gemini-2.5-flash"

    def get_system_prompt(self) -> str:
        """Get system prompt for document summarization"""
        return """Você é um especialista em análise de documentos contratuais da Luminus, empresa de manutenção e locação de geradores.

Sua função é analisar o texto extraído de um documento e criar um resumo detalhado que será usado como contexto para um assistente de IA em conversas com o usuário.

OBJETIVO:
Criar um resumo completo que capture:
1. O tipo e propósito do documento
2. Informações-chave (datas, valores, partes envolvidas, equipamentos)
3. Obrigações e responsabilidades
4. Condições especiais ou cláusulas importantes
5. Dados técnicos relevantes (especificações, frequências de manutenção, etc.)

FORMATO DE RESPOSTA:
Responda SEMPRE em JSON válido com a estrutura:
{
    "summary": "Resumo narrativo do documento em 2-4 parágrafos",
    "document_type": "Tipo identificado (contrato, proposta, laudo, certificado, etc.)",
    "key_information": {
        "parties": ["Lista das partes envolvidas"],
        "dates": {"start": "data início", "end": "data fim", "others": []},
        "values": {"total": "valor total", "monthly": "valor mensal", "others": []},
        "equipment": ["Lista de equipamentos mencionados"],
        "services": ["Lista de serviços"]
    },
    "highlights": [
        "Ponto importante 1",
        "Ponto importante 2",
        "Ponto importante 3"
    ],
    "technical_details": "Detalhes técnicos relevantes se houver"
}

REGRAS:
- Seja conciso mas completo
- Capture todas as informações numéricas (valores, datas, quantidades)
- Identifique corretamente o tipo de documento
- Se não encontrar alguma informação, use null ou array vazio
- IMPORTANTE: Sua resposta deve ser APENAS o JSON, sem markdown, sem ```json, apenas o objeto JSON puro"""

    def get_image_prompt(self) -> str:
        """Get system prompt for image analysis"""
        return """Você é um especialista em análise de documentos da Luminus, empresa de manutenção e locação de geradores.

Analise esta IMAGEM de documento e extraia todas as informações relevantes.

OBJETIVO:
1. Identificar o tipo de documento na imagem
2. Extrair TODO o texto visível
3. Identificar informações-chave (datas, valores, nomes, equipamentos)
4. Descrever tabelas, formulários ou diagramas se presentes
5. Notar carimbos, assinaturas ou marcações importantes

FORMATO DE RESPOSTA - JSON válido:
{
    "summary": "Descrição completa do que a imagem contém e seu propósito",
    "document_type": "Tipo identificado (foto de equipamento, documento digitalizado, etc.)",
    "key_information": {
        "parties": ["Nomes/empresas identificados"],
        "dates": {"start": null, "end": null, "others": ["datas visíveis"]},
        "values": {"total": null, "monthly": null, "others": ["valores visíveis"]},
        "equipment": ["Equipamentos identificados na imagem"],
        "services": ["Serviços mencionados"]
    },
    "highlights": [
        "Informação importante 1",
        "Informação importante 2"
    ],
    "technical_details": "Especificações técnicas, números de série, medições visíveis",
    "visual_elements": "Descrição de elementos visuais relevantes (fotos, diagramas, estado do equipamento)"
}

REGRAS:
- Se for foto de equipamento, descreva o estado visível e identificações
- Extraia números de série, placas, etiquetas
- Para documentos, extraia todo texto legível
- Responda APENAS com JSON puro"""

    def _is_image_file(self, filename: str) -> bool:
        """Check if file is an image based on extension."""
        from pathlib import Path
        return Path(filename).suffix.lower() in self.IMAGE_EXTENSIONS

    def _get_mime_type(self, filename: str) -> str:
        """Get MIME type for a file."""
        import mimetypes
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'

    def summarize_document(
        self,
        document_text: str,
        document_name: Optional[str] = None,
        document_category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Summarizes document text using Gemini AI.

        Args:
            document_text: Extracted text from the document
            document_name: Optional document filename for context
            document_category: Optional category for context

        Returns:
            Dictionary with summary and extracted information
        """
        try:
            # Build context
            context = ""
            if document_name:
                context += f"Nome do documento: {document_name}\n"
            if document_category:
                context += f"Categoria: {document_category}\n"

            user_message = f"""{context}

TEXTO DO DOCUMENTO:
{document_text[:50000]}

Analise o documento acima e gere o resumo estruturado conforme especificado."""

            # Call Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=self.get_system_prompt())]
                    ),
                    types.Content(
                        role="model",
                        parts=[types.Part(text="Entendido. Vou analisar o documento e retornar um JSON estruturado com o resumo.")]
                    ),
                    types.Content(
                        role="user",
                        parts=[types.Part(text=user_message)]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=4096
                )
            )

            return self._parse_response(response.text, document_name, document_category)

        except Exception as e:
            logger.error(f"Error summarizing document: {e}")
            return {
                "summary": None,
                "error": str(e),
                "document_type": None,
                "key_information": {},
                "highlights": []
            }

    def summarize_image(
        self,
        image_bytes: bytes,
        filename: str,
        document_category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Summarizes an image document using Gemini Vision.

        Args:
            image_bytes: Raw image bytes
            filename: Image filename
            document_category: Optional category for context

        Returns:
            Dictionary with summary and extracted information
        """
        try:
            mime_type = self._get_mime_type(filename)

            context = f"Arquivo: {filename}\n"
            if document_category:
                context += f"Categoria: {document_category}\n"

            # Call Gemini Vision
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(text=self.get_image_prompt() + f"\n\nContexto:\n{context}"),
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=mime_type,
                                    data=image_bytes
                                )
                            )
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=4096
                )
            )

            result = self._parse_response(response.text, filename, document_category)
            result["extraction_method"] = "gemini_vision"
            return result

        except Exception as e:
            logger.error(f"Error summarizing image: {e}")
            return {
                "summary": None,
                "error": str(e),
                "document_type": None,
                "key_information": {},
                "highlights": [],
                "extraction_method": "gemini_vision"
            }

    def summarize_from_file(
        self,
        file_bytes: bytes,
        filename: str,
        document_category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Summarizes a document from raw file bytes.
        Automatically detects format and uses appropriate extraction method.

        Args:
            file_bytes: Raw file bytes
            filename: Original filename (used to detect format)
            document_category: Optional category for context

        Returns:
            Dictionary with summary and extracted information
        """
        try:
            # For images, use Gemini Vision directly for richer analysis
            if self._is_image_file(filename):
                logger.info(f"Processing image with Gemini Vision: {filename}")
                return self.summarize_image(file_bytes, filename, document_category)

            # For other formats, use MultiFormatExtractor first
            from utils.multi_format_extractor import MultiFormatExtractor

            extractor = MultiFormatExtractor()

            if not extractor.is_supported(filename):
                return {
                    "summary": None,
                    "error": f"Formato não suportado: {filename}",
                    "document_type": None,
                    "key_information": {},
                    "highlights": []
                }

            # Extract text from file
            extraction_result = extractor.extract(file_bytes, filename, document_category)

            if not extraction_result.get("success"):
                return {
                    "summary": None,
                    "error": extraction_result.get("error", "Falha na extração"),
                    "document_type": None,
                    "key_information": {},
                    "highlights": []
                }

            extracted_text = extraction_result.get("text", "")

            if not extracted_text or len(extracted_text.strip()) < 10:
                return {
                    "summary": "Documento sem texto extraível",
                    "document_type": document_category or "unknown",
                    "key_information": {},
                    "highlights": ["Nenhum texto foi encontrado no documento"],
                    "extraction_method": extraction_result.get("method")
                }

            # Summarize extracted text
            result = self.summarize_document(extracted_text, filename, document_category)
            result["extraction_method"] = extraction_result.get("method")
            result["extracted_data"] = extraction_result.get("data")

            return result

        except Exception as e:
            logger.error(f"Error in summarize_from_file: {e}")
            return {
                "summary": None,
                "error": str(e),
                "document_type": None,
                "key_information": {},
                "highlights": []
            }

    def _parse_response(
        self,
        response_text: str,
        document_name: Optional[str],
        document_category: Optional[str]
    ) -> Dict[str, Any]:
        """Parse Gemini response into structured format."""
        response_text = response_text.strip()

        # Clean response (remove markdown code blocks if present)
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Try to parse JSON
        try:
            result = json.loads(response_text)
            logger.info(f"Document summarized successfully: {document_name}")
            return result
        except json.JSONDecodeError as json_err:
            logger.warning(f"Failed to parse JSON response: {json_err}")
            # Return basic structure with raw summary
            return {
                "summary": response_text,
                "document_type": document_category or "unknown",
                "key_information": {},
                "highlights": [],
                "technical_details": None,
                "parse_error": str(json_err)
            }


async def process_document_async(
    document_id: str,
    extracted_text: str,
    document_name: Optional[str],
    document_category: Optional[str],
    db
) -> Dict[str, Any]:
    """
    Async function to process a document with AI summarization.

    Args:
        document_id: ID of the contract_documents record
        extracted_text: Text extracted from the document
        document_name: Document filename
        document_category: Document category
        db: Database instance

    Returns:
        Processing result with summary
    """
    try:
        logger.info(f"Starting async processing of document {document_id}")

        # Initialize agent and summarize
        agent = DocumentSummarizerAgent()
        summary_result = agent.summarize_document(
            extracted_text,
            document_name,
            document_category
        )

        # Update document with insights
        db.execute_query(
            """
            UPDATE contract_documents
            SET extracted_insights = %s,
                processing_status = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (json.dumps(summary_result), "completed", document_id)
        )

        logger.info(f"Document {document_id} summarized successfully")

        return {
            "success": True,
            "document_id": document_id,
            "summary": summary_result.get("summary", "")
        }

    except Exception as e:
        logger.error(f"Error in async document processing: {e}")

        # Update document with error status
        try:
            db.execute_query(
                """
                UPDATE contract_documents
                SET processing_status = %s,
                    processing_error = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                ("error", str(e), document_id)
            )
        except Exception:
            pass

        return {
            "success": False,
            "document_id": document_id,
            "error": str(e)
        }


async def process_document_from_bytes_async(
    document_id: str,
    file_bytes: bytes,
    filename: str,
    document_category: Optional[str],
    db
) -> Dict[str, Any]:
    """
    Async function to process a document from raw bytes.
    Automatically extracts text and generates summary.

    Args:
        document_id: ID of the contract_documents record
        file_bytes: Raw file content
        filename: Original filename
        document_category: Document category
        db: Database instance

    Returns:
        Processing result with summary
    """
    try:
        logger.info(f"Starting async processing of document {document_id} from bytes")

        # Update status to processing
        db.execute_query(
            """
            UPDATE contract_documents
            SET processing_status = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            ("processing", document_id)
        )

        # Initialize agent and summarize from file
        agent = DocumentSummarizerAgent()
        summary_result = agent.summarize_from_file(
            file_bytes,
            filename,
            document_category
        )

        # Update document with insights
        db.execute_query(
            """
            UPDATE contract_documents
            SET extracted_insights = %s,
                processing_status = %s,
                extraction_method = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (
                json.dumps(summary_result),
                "completed" if summary_result.get("summary") else "error",
                summary_result.get("extraction_method"),
                document_id
            )
        )

        logger.info(f"Document {document_id} processed successfully")

        return {
            "success": True,
            "document_id": document_id,
            "summary": summary_result.get("summary", "")
        }

    except Exception as e:
        logger.error(f"Error in async document processing from bytes: {e}")

        # Update document with error status
        try:
            db.execute_query(
                """
                UPDATE contract_documents
                SET processing_status = %s,
                    processing_error = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                ("error", str(e), document_id)
            )
        except Exception:
            pass

        return {
            "success": False,
            "document_id": document_id,
            "error": str(e)
        }


def process_document_sync(
    document_id: str,
    extracted_text: str,
    document_name: Optional[str],
    document_category: Optional[str],
    db
) -> Dict[str, Any]:
    """
    Synchronous wrapper for document processing.

    Args:
        document_id: ID of the contract_documents record
        extracted_text: Text extracted from the document
        document_name: Document filename
        document_category: Document category
        db: Database instance

    Returns:
        Processing result
    """
    return asyncio.run(process_document_async(
        document_id,
        extracted_text,
        document_name,
        document_category,
        db
    ))


def process_document_from_bytes_sync(
    document_id: str,
    file_bytes: bytes,
    filename: str,
    document_category: Optional[str],
    db
) -> Dict[str, Any]:
    """
    Synchronous wrapper for document processing from bytes.

    Args:
        document_id: ID of the contract_documents record
        file_bytes: Raw file content
        filename: Original filename
        document_category: Document category
        db: Database instance

    Returns:
        Processing result
    """
    return asyncio.run(process_document_from_bytes_async(
        document_id,
        file_bytes,
        filename,
        document_category,
        db
    ))
