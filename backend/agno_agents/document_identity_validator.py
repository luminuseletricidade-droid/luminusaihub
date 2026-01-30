"""
Document Identity Validator Agent
Validates if a document (addendum or attachment) belongs to the correct contract.
Extracts identifying information and compares with contract data.
"""

import os
import json
import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class DocumentIdentityValidator:
    """
    Agent that validates document identity by extracting key information
    and comparing with the target contract data.
    """

    def __init__(self):
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
        self.client = genai.Client(api_key=gemini_api_key)
        self.model = "gemini-2.5-flash"

    def get_extraction_prompt(self) -> str:
        """Get prompt for extracting identifying information from document."""
        return """Extraia informações de identificação do documento para validação.

EXTRAIA (se presentes):
- CNPJ/CPF: números de documento
- Nomes: empresas e pessoas
- Contrato: números de referência
- Cidades e estados
- Equipamentos mencionados

RESPOSTA: JSON puro, SEM markdown, SEM ```json```:
{"extracted_identifiers":{"cnpj_cpf":[],"company_names":[],"person_names":[],"contract_numbers":[],"cities":[],"states":[],"equipment":[]},"document_type":"","main_subject":"","confidence":0.9}

REGRAS CRÍTICAS:
- Responda APENAS o objeto JSON, começando com { e terminando com }
- NÃO use markdown ou blocos de código
- Use arrays vazios [] se não encontrar
- Máximo 3 itens mais relevantes por array
- Strings curtas (máx 50 caracteres cada)"""

    def normalize_cnpj(self, cnpj: str) -> str:
        """Normalize CNPJ by removing formatting."""
        if not cnpj:
            return ""
        return re.sub(r'[^\d]', '', cnpj)

    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison (lowercase, remove extra spaces)."""
        if not text:
            return ""
        return ' '.join(text.lower().split())

    def calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings (0-1)."""
        if not str1 or not str2:
            return 0.0

        str1 = self.normalize_text(str1)
        str2 = self.normalize_text(str2)

        if str1 == str2:
            return 1.0

        # Check if one contains the other
        if str1 in str2 or str2 in str1:
            return 0.8

        # Simple word overlap
        words1 = set(str1.split())
        words2 = set(str2.split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        return len(intersection) / len(union) if union else 0.0

    def _parse_json_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """
        Robustly parse JSON from LLM response with multiple fallback strategies.

        Args:
            response_text: Raw response text from Gemini

        Returns:
            Parsed JSON dict or None if all strategies fail
        """
        if not response_text:
            return None

        # Strategy 1: Try direct parse
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Remove markdown code blocks
        cleaned = response_text
        if "```" in cleaned:
            # Handle ```json ... ``` or ``` ... ```
            import re
            json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', cleaned, re.DOTALL)
            if json_match:
                cleaned = json_match.group(1).strip()
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    pass

        # Strategy 3: Find JSON object boundaries
        try:
            start = response_text.find('{')
            end = response_text.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = response_text[start:end+1]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Strategy 4: Try to fix truncated JSON
        try:
            start = response_text.find('{')
            if start != -1:
                json_str = response_text[start:]
                # Count brackets to find if JSON is truncated
                open_braces = json_str.count('{')
                close_braces = json_str.count('}')
                open_brackets = json_str.count('[')
                close_brackets = json_str.count(']')

                # Add missing closing brackets/braces
                missing_brackets = ']' * (open_brackets - close_brackets)
                missing_braces = '}' * (open_braces - close_braces)

                # Also handle unterminated strings by adding closing quote
                fixed_json = json_str + '"' + missing_brackets + missing_braces
                try:
                    return json.loads(fixed_json)
                except json.JSONDecodeError:
                    # Try without the extra quote
                    fixed_json = json_str + missing_brackets + missing_braces
                    return json.loads(fixed_json)
        except json.JSONDecodeError:
            pass

        # Strategy 5: Extract key identifiers manually using regex
        try:
            result = {
                "extracted_identifiers": {
                    "cnpj_cpf": [],
                    "company_names": [],
                    "person_names": [],
                    "contract_numbers": [],
                    "addresses": [],
                    "values": [],
                    "dates": [],
                    "equipment": [],
                    "cities": [],
                    "states": []
                },
                "document_type": "unknown",
                "main_subject": "Extraído via fallback",
                "confidence": 0.5
            }

            # Extract CNPJs using regex (format: XX.XXX.XXX/XXXX-XX)
            import re
            cnpj_pattern = r'\d{2}\.?\d{3}\.?\d{3}/?0001-?\d{2}'
            cnpjs = re.findall(cnpj_pattern, response_text)
            if cnpjs:
                result["extracted_identifiers"]["cnpj_cpf"] = list(set(cnpjs))

            logger.info("Used regex fallback for identifier extraction")
            return result
        except Exception:
            pass

        logger.error("All JSON parsing strategies failed")
        return None

    def extract_identifiers(
        self,
        document_text: str,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract identifying information from document text.

        Args:
            document_text: Extracted text from the document
            filename: Optional filename for context

        Returns:
            Dictionary with extracted identifiers
        """
        try:
            context = ""
            if filename:
                context = f"Nome do arquivo: {filename}\n\n"

            user_message = f"""{context}TEXTO DO DOCUMENTO:
{document_text[:30000]}

Extraia todas as informações de identificação conforme especificado."""

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=self.get_extraction_prompt())]
                    ),
                    types.Content(
                        role="model",
                        parts=[types.Part(text="Entendido. Vou extrair as informações de identificação e retornar em JSON.")]
                    ),
                    types.Content(
                        role="user",
                        parts=[types.Part(text=user_message)]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                    response_mime_type="application/json"
                )
            )

            response_text = response.text.strip()
            logger.debug(f"Gemini extraction response (first 500 chars): {response_text[:500]}")

            # Parse JSON with robust cleanup
            result = self._parse_json_response(response_text)
            if result:
                logger.info(f"Extracted identifiers from document: {filename}")
                return result

            # If parsing failed, return empty but valid structure
            logger.warning(f"Could not parse identifiers, returning empty structure for: {filename}")
            return {
                "extracted_identifiers": {
                    "cnpj_cpf": [],
                    "company_names": [],
                    "person_names": [],
                    "contract_numbers": [],
                    "addresses": [],
                    "values": [],
                    "dates": [],
                    "equipment": [],
                    "cities": [],
                    "states": []
                },
                "document_type": "unknown",
                "main_subject": "Documento não analisado",
                "confidence": 0.0,
                "parse_error": True
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {e}")
            return {
                "extracted_identifiers": {
                    "cnpj_cpf": [],
                    "company_names": [],
                    "person_names": [],
                    "contract_numbers": [],
                    "addresses": [],
                    "values": [],
                    "dates": [],
                    "equipment": [],
                    "cities": [],
                    "states": []
                },
                "document_type": "unknown",
                "error": f"Parse error: {e}"
            }
        except Exception as e:
            logger.error(f"Error extracting identifiers: {e}")
            return {
                "extracted_identifiers": {},
                "error": str(e)
            }

    def extract_identifiers_from_image(
        self,
        image_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Extract identifying information from an image using Gemini Vision.

        Args:
            image_bytes: Raw image bytes
            filename: Image filename

        Returns:
            Dictionary with extracted identifiers
        """
        try:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(filename)
            mime_type = mime_type or 'image/jpeg'

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(text=self.get_extraction_prompt() + f"\n\nArquivo: {filename}"),
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
                    temperature=0.1,
                    max_output_tokens=2048,
                    response_mime_type="application/json"
                )
            )

            response_text = response.text.strip()
            result = self._parse_json_response(response_text)
            if result:
                logger.info(f"Extracted identifiers from image: {filename}")
                return result

            return {
                "extracted_identifiers": {},
                "error": "Failed to parse image extraction response"
            }

        except Exception as e:
            logger.error(f"Error extracting identifiers from image: {e}")
            return {
                "extracted_identifiers": {},
                "error": str(e)
            }

    def validate_against_contract(
        self,
        extracted_data: Dict[str, Any],
        contract_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate extracted document identifiers against contract data.

        Args:
            extracted_data: Identifiers extracted from document
            contract_data: Target contract data to validate against

        Returns:
            Validation result with score, matches, and warnings
        """
        identifiers = extracted_data.get("extracted_identifiers", {})

        matches = []
        warnings = []
        critical_warnings = []

        # Track what was checked
        checks_performed = 0
        checks_passed = 0

        # 1. CNPJ Validation (CRITICAL)
        doc_cnpjs = [self.normalize_cnpj(c) for c in identifiers.get("cnpj_cpf", [])]
        contract_cnpj = self.normalize_cnpj(
            contract_data.get("cnpj") or
            contract_data.get("client_cnpj") or
            ""
        )

        if doc_cnpjs and contract_cnpj:
            checks_performed += 1
            if contract_cnpj in doc_cnpjs:
                checks_passed += 1
                matches.append({
                    "field": "CNPJ",
                    "document_value": contract_cnpj,
                    "contract_value": contract_cnpj,
                    "status": "match"
                })
            else:
                critical_warnings.append({
                    "field": "CNPJ",
                    "document_values": doc_cnpjs,
                    "contract_value": contract_cnpj,
                    "message": f"CNPJ do documento não corresponde ao contrato. Documento: {doc_cnpjs}, Contrato: {contract_cnpj}",
                    "severity": "critical"
                })

        # 2. Company Name Validation
        doc_companies = identifiers.get("company_names", [])
        contract_client = contract_data.get("client_name", "")

        if doc_companies and contract_client:
            checks_performed += 1
            best_similarity = 0
            best_match = None

            for company in doc_companies:
                sim = self.calculate_similarity(company, contract_client)
                if sim > best_similarity:
                    best_similarity = sim
                    best_match = company

            if best_similarity >= 0.6:
                checks_passed += 1
                matches.append({
                    "field": "Nome do Cliente",
                    "document_value": best_match,
                    "contract_value": contract_client,
                    "similarity": best_similarity,
                    "status": "match"
                })
            else:
                warnings.append({
                    "field": "Nome do Cliente",
                    "document_values": doc_companies,
                    "contract_value": contract_client,
                    "message": f"Nome do cliente no documento pode não corresponder. Documento: {doc_companies}, Contrato: {contract_client}",
                    "severity": "warning"
                })

        # 3. Contract Number Validation
        doc_contract_numbers = identifiers.get("contract_numbers", [])
        contract_number = contract_data.get("contract_number", "")

        if doc_contract_numbers and contract_number:
            checks_performed += 1
            # Normalize contract numbers for comparison
            normalized_contract = re.sub(r'[^\w]', '', contract_number.lower())
            found_match = False

            for doc_num in doc_contract_numbers:
                normalized_doc = re.sub(r'[^\w]', '', doc_num.lower())
                if normalized_contract in normalized_doc or normalized_doc in normalized_contract:
                    found_match = True
                    checks_passed += 1
                    matches.append({
                        "field": "Número do Contrato",
                        "document_value": doc_num,
                        "contract_value": contract_number,
                        "status": "match"
                    })
                    break

            if not found_match:
                warnings.append({
                    "field": "Número do Contrato",
                    "document_values": doc_contract_numbers,
                    "contract_value": contract_number,
                    "message": f"Número de contrato no documento difere. Documento: {doc_contract_numbers}, Contrato: {contract_number}",
                    "severity": "warning"
                })

        # 4. Address/City Validation
        doc_cities = identifiers.get("cities", [])
        contract_city = contract_data.get("client_city", "")

        if doc_cities and contract_city:
            checks_performed += 1
            normalized_contract_city = self.normalize_text(contract_city)

            found_city = False
            for city in doc_cities:
                if self.calculate_similarity(city, contract_city) >= 0.7:
                    found_city = True
                    checks_passed += 1
                    matches.append({
                        "field": "Cidade",
                        "document_value": city,
                        "contract_value": contract_city,
                        "status": "match"
                    })
                    break

            if not found_city:
                warnings.append({
                    "field": "Cidade",
                    "document_values": doc_cities,
                    "contract_value": contract_city,
                    "message": f"Cidade no documento pode diferir. Documento: {doc_cities}, Contrato: {contract_city}",
                    "severity": "info"
                })

        # 5. Equipment Validation
        doc_equipment = identifiers.get("equipment", [])
        contract_equipment = contract_data.get("equipment_type", "")

        if doc_equipment and contract_equipment:
            checks_performed += 1
            found_equipment = False

            for equip in doc_equipment:
                if self.calculate_similarity(equip, contract_equipment) >= 0.5:
                    found_equipment = True
                    checks_passed += 1
                    matches.append({
                        "field": "Equipamento",
                        "document_value": equip,
                        "contract_value": contract_equipment,
                        "status": "match"
                    })
                    break

        # Calculate overall score
        if checks_performed > 0:
            base_score = (checks_passed / checks_performed) * 100
        else:
            base_score = 50  # Uncertain if no checks could be performed

        # Penalize for critical warnings
        score = base_score
        if critical_warnings:
            score = min(score, 30)  # Cap at 30% if CNPJ doesn't match

        # Determine validation status
        if score >= 70 and not critical_warnings:
            status = "validated"
            message = "Documento validado com sucesso - identificadores correspondem ao contrato."
        elif score >= 50 and not critical_warnings:
            status = "warning"
            message = "Documento parcialmente validado - algumas informações não puderam ser verificadas."
        else:
            status = "alert"
            if critical_warnings:
                message = "ATENÇÃO: Documento pode não pertencer a este contrato - CNPJ ou informações críticas não correspondem."
            else:
                message = "ATENÇÃO: Não foi possível validar se o documento pertence a este contrato."

        return {
            "validation_status": status,
            "confidence_score": round(score, 1),
            "message": message,
            "matches": matches,
            "warnings": warnings,
            "critical_warnings": critical_warnings,
            "checks_performed": checks_performed,
            "checks_passed": checks_passed,
            "document_type": extracted_data.get("document_type"),
            "main_subject": extracted_data.get("main_subject")
        }


def validate_document_identity(
    document_text: str,
    contract_data: Dict[str, Any],
    filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to validate a document against a contract.

    Args:
        document_text: Extracted text from document
        contract_data: Contract data to validate against
        filename: Optional filename

    Returns:
        Validation result
    """
    validator = DocumentIdentityValidator()
    extracted = validator.extract_identifiers(document_text, filename)
    return validator.validate_against_contract(extracted, contract_data)


def validate_image_identity(
    image_bytes: bytes,
    contract_data: Dict[str, Any],
    filename: str
) -> Dict[str, Any]:
    """
    Convenience function to validate an image document against a contract.

    Args:
        image_bytes: Raw image bytes
        contract_data: Contract data to validate against
        filename: Image filename

    Returns:
        Validation result
    """
    validator = DocumentIdentityValidator()
    extracted = validator.extract_identifiers_from_image(image_bytes, filename)
    return validator.validate_against_contract(extracted, contract_data)
