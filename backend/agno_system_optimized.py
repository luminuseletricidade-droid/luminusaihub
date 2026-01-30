import os
import logging
from typing import Dict, Any, Optional
import json
import re
import openai
from datetime import datetime
from dotenv import load_dotenv
import asyncio
from functools import lru_cache
import hashlib
from google import genai
from google.genai import types
from utils.prompt_loader import get_prompt_loader

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedAgnoSystem:
    """
    Optimized Agno system for faster contract processing
    """
    
    def __init__(self):
        # Initialize OpenAI client for general use and chat agents
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.client = self.openai_client  # Alias for compatibility with chat_with_user
        logger.info("✅ OpenAI client initialized for chat agents")

        # Initialize Gemini client for contract processing
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_api_key:
            self.gemini_client = genai.Client(api_key=gemini_api_key)
            logger.info("✅ Gemini client initialized for contract processing")
        else:
            logger.warning("⚠️ Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable")
            self.gemini_client = None

        # System status
        self.system_status = {
            "initialized": True,
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
            "gemini_configured": bool(gemini_api_key),
            "last_health_check": datetime.now().isoformat()
        }
        
        # Cache for processed documents
        self._cache = {}
        
        logger.info("🚀 Optimized Agno System initialized")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Return current system status"""
        self.system_status["last_health_check"] = datetime.now().isoformat()
        return self.system_status
    
    def _get_cache_key(self, pdf_content: bytes) -> str:
        """Generate cache key from PDF content"""
        return hashlib.md5(pdf_content).hexdigest()
    
    def _extract_all_cnpjs_from_text(self, text: str) -> list:
        """
        Extract ALL CNPJs from text with maximum flexibility
        Returns list of clean CNPJs (numbers only)
        """
        all_cnpjs = []
        seen_cnpjs = set()

        # Try multiple patterns in order of specificity
        patterns = [
            # Most specific patterns first - with CNPJ keyword
            r'CNPJ[:\s\-nº]*(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[/\s]?\d{4}[\-\s]?\d{2})',
            r'C\.?N\.?P\.?J\.?[:\s\-nº]*(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[/\s]?\d{4}[\-\s]?\d{2})',
            r'CNPJ/MF[:\s\-nº]*(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[/\s]?\d{4}[\-\s]?\d{2})',
            # Standard CNPJ format
            r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})',
            # Direct CNPJ patterns with flexible separators
            r'(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[/\s]?\d{4}[\-\s]?\d{2})',
            r'(\d{8}/\d{4}-\d{2})\b',
            # Sequence of 14 digits that could be CNPJ
            r'\b(\d{14})\b',
            # With spaces
            r'(\d{2}\s\d{3}\s\d{3}\s\d{4}\s\d{2})\b',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Clean the match
                cnpj = re.sub(r'\D', '', match)
                if len(cnpj) == 14 and cnpj not in seen_cnpjs:  # Exact CNPJ length
                    seen_cnpjs.add(cnpj)
                    all_cnpjs.append(cnpj)
                    logger.info(f"✅ CNPJ found: {cnpj}")

        # Fallback: look for any 14-digit sequence near CNPJ keyword
        cnpj_context = re.findall(r'(?:CNPJ|C\.?N\.?P\.?J\.?|CGC)[^0-9]{0,50}(\d[\d\s\.\-/]{10,20})', text, re.IGNORECASE)
        for match in cnpj_context:
            cnpj = re.sub(r'\D', '', match)
            if len(cnpj) == 14 and cnpj not in seen_cnpjs:
                seen_cnpjs.add(cnpj)
                all_cnpjs.append(cnpj)
                logger.info(f"✅ CNPJ found (context): {cnpj}")

        return all_cnpjs

    def _extract_cnpj_from_text(self, text: str) -> str:
        """
        Extract CLIENT CNPJ (CONTRATANTE) from text, filtering out known service providers
        Returns clean CNPJ (numbers only) or empty string
        """
        # Known service provider CNPJs (CONTRATADA - not the client!)
        SERVICE_PROVIDER_CNPJS = [
            '26670456000152',  # Luminus Geradores e Energia Ltda
        ]

        # Get ALL CNPJs from document
        all_cnpjs = self._extract_all_cnpjs_from_text(text)

        if not all_cnpjs:
            logger.warning("⚠️ No CNPJs found in document")
            return ""

        logger.info(f"🔍 Found {len(all_cnpjs)} CNPJ(s) in document: {all_cnpjs}")

        # Filter out service provider CNPJs
        client_cnpjs = [cnpj for cnpj in all_cnpjs if cnpj not in SERVICE_PROVIDER_CNPJS]

        if not client_cnpjs:
            logger.warning(f"⚠️ All found CNPJs are service providers! Using first CNPJ as fallback")
            return all_cnpjs[0]

        # Return the first client CNPJ (should be CONTRATANTE)
        client_cnpj = client_cnpjs[0]
        logger.info(f"✅ CLIENT (CONTRATANTE) CNPJ identified: {client_cnpj}")

        if len(client_cnpjs) > 1:
            logger.warning(f"⚠️ Multiple client CNPJs found: {client_cnpjs}, using first one")

        return client_cnpj

    def _extract_key_fields_with_similarity(self, text: str) -> Dict[str, Any]:
        """
        Extract key contract fields using text similarity and patterns
        This runs BEFORE sending to LLM for better accuracy
        """
        from difflib import SequenceMatcher

        extracted = {
            "client_cnpj": "",
            "client_name": "",
            "contract_value_monthly": "",
            "contract_value_total": "",
            "start_date": "",
            "end_date": "",
            "equipment_type": "",
            "equipment_model": "",
            "equipment_brand": "",
            "equipment_power": ""
        }

        # 1. Extract CNPJ first (most reliable)
        extracted["client_cnpj"] = self._extract_cnpj_from_text(text)

        # 2. Extract client name near CNPJ or with company indicators
        if extracted["client_cnpj"]:
            # Known service provider names to EXCLUDE
            SERVICE_PROVIDER_NAMES = ['luminus', 'geradores', 'energia ltda']

            # Look for company name near CNPJ
            cnpj_position = text.find(extracted["client_cnpj"][:8])
            if cnpj_position > 0:
                # Get text around CNPJ (before and after)
                context_start = max(0, cnpj_position - 300)
                context_end = min(len(text), cnpj_position + 300)
                context = text[context_start:context_end]

                # Look for company patterns (broader patterns for associations, etc)
                company_patterns = [
                    r'CONTRATANTE[:\s]+([^\n]+)',
                    r'Raz[ãa]o\s+Social[:\s]+([^\n]+)',
                    r'Cliente[:\s]+([^\n]+)',
                    r'(ASSOCIA[ÇC][ÃA]O\s+[A-Z\s]+)',
                    r'(CONDOM[ÍI]NIO\s+[A-Z\s]+)',
                    r'(EDIF[ÍI]CIO\s+[A-Z\s]+)',
                    r'([A-Z][A-Za-z\s&]+(?:LTDA|EIRELI|S/A|SA|ME|EPP|Ltda|Ltd)\.?)',
                ]

                for pattern in company_patterns:
                    match = re.search(pattern, context, re.IGNORECASE)
                    if match:
                        candidate_name = match.group(1).strip()
                        # Filter out service provider names
                        candidate_lower = candidate_name.lower()
                        if not any(sp_name in candidate_lower for sp_name in SERVICE_PROVIDER_NAMES):
                            extracted["client_name"] = candidate_name
                            logger.info(f"✅ Extracted client name near CNPJ: {candidate_name}")
                            break

        # 3. Extract dates with context
        date_patterns = [
            (r'(?:in[íi]cio|come[çc]a|vigente\s+a\s+partir|partir\s+de)[:\s]+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})', 'start_date'),
            (r'(?:t[ée]rmino|fim|encerra|at[ée]|validade)[:\s]+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})', 'end_date'),
            (r'(?:per[íi]odo|prazo).*?de\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s+a\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})', 'both')
        ]

        for pattern, field in date_patterns:
            matches = re.search(pattern, text, re.IGNORECASE)
            if matches:
                if field == 'both':
                    extracted['start_date'] = matches.group(1)
                    extracted['end_date'] = matches.group(2)
                else:
                    extracted[field] = matches.group(1)

        # 4. Extract values with context
        value_patterns = [
            (r'(?:valor\s+mensal|mensalidade|pagamento\s+mensal)[:\s]+R?\$?\s*([\d.,]+)', 'contract_value_monthly'),
            (r'(?:valor\s+total|total\s+do\s+contrato|valor\s+global)[:\s]+R?\$?\s*([\d.,]+)', 'contract_value_total'),
            (r'R\$\s*([\d.,]+)(?:\s*[/p]\s*m[êe]s|\s*mensais?)', 'contract_value_monthly')
        ]

        for pattern, field in value_patterns:
            matches = re.search(pattern, text, re.IGNORECASE)
            if matches:
                value = matches.group(1).replace('.', '').replace(',', '.')
                try:
                    float(value)  # Validate it's a number
                    extracted[field] = matches.group(1)
                except:
                    pass

        # 5. Extract equipment information
        equipment_keywords = ['gerador', 'grupo gerador', 'motor', 'equipamento', 'máquina']
        for keyword in equipment_keywords:
            if keyword in text.lower():
                # Find context around keyword
                pattern = rf'{keyword}[^.]*?(?:marca|modelo|pot[êe]ncia|kva|kw)[^.]*'
                matches = re.findall(pattern, text, re.IGNORECASE)

                for match in matches:
                    # Extract brand
                    brand_match = re.search(r'(?:marca)[:\s]+([A-Za-z]+)', match, re.IGNORECASE)
                    if brand_match:
                        extracted['equipment_brand'] = brand_match.group(1)

                    # Extract model
                    model_match = re.search(r'(?:modelo)[:\s]+([A-Za-z0-9\-]+)', match, re.IGNORECASE)
                    if model_match:
                        extracted['equipment_model'] = model_match.group(1)

                    # Extract power
                    power_match = re.search(r'(\d+)\s*(?:kva|kw|cv|hp)', match, re.IGNORECASE)
                    if power_match:
                        extracted['equipment_power'] = power_match.group(0)

                if not extracted['equipment_type'] and keyword != 'equipamento':
                    extracted['equipment_type'] = keyword.capitalize()

        return extracted

    def _analyze_pdf_content(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive PDF content analysis using Python tools
        Returns structured data before sending to AI
        """
        analysis = {
            "raw_text": text,
            "text_length": len(text),
            "potential_dates": [],
            "potential_values": [],
            "potential_client_info": [],
            "potential_equipment": [],
            "document_sections": [],
            "extracted_cnpj": ""  # Add direct CNPJ extraction
        }
        
        from datetime import datetime
        
        # Extract potential dates (multiple formats)
        date_patterns = [
            r'\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}',  # DD/MM/YYYY, DD-MM-YYYY
            r'\d{2,4}[/.-]\d{1,2}[/.-]\d{1,2}',  # YYYY/MM/DD, YYYY-MM-DD
            r'\d{1,2}\s+de\s+\w+\s+de\s+\d{4}',  # 15 de janeiro de 2024
            r'\w+,?\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}',  # Segunda, 15 de janeiro de 2024
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                analysis["potential_dates"].append(match.strip())
        
        # Extract potential monetary values
        value_patterns = [
            r'R\$\s*[\d.,]+',  # R$ 1.500,00
            r'[\d.,]+\s*reais?',  # 1500 reais
            r'valor\s*:?\s*R?\$?\s*[\d.,]+',  # valor: R$ 1500
            r'pre[çc]o\s*:?\s*R?\$?\s*[\d.,]+',  # preço: 1500
            r'mensal\s*:?\s*R?\$?\s*[\d.,]+',  # mensal: R$ 500
            r'total\s*:?\s*R?\$?\s*[\d.,]+',  # total: R$ 6000
        ]
        
        for pattern in value_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                analysis["potential_values"].append(match.strip())
        
        # Extract potential client information - enhanced for different PDF formats
        client_patterns = [
            # CNPJ patterns - EXTREMELY FLEXIBLE to catch all variations
            r'CNPJ[:\s\-nº]*[\d./\-\s]+',  # CNPJ: 12.345.678/0001-90
            r'C\.?N\.?P\.?J\.?[:\s\-nº]*[\d./\-\s]+',  # C.N.P.J.: 12.345.678/0001-90
            r'\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b',  # Direct CNPJ format with dots
            r'\b\d{14}\b',  # 14 digits together
            r'\b\d{2}\s?\d{3}\s?\d{3}\s?\d{4}\s?\d{2}\b',  # Spaces instead of dots
            r'\b\d{8}/\d{4}-\d{2}\b',  # Without dots: 12345678/0001-90
            r'\b\d{8}\d{6}\b',  # All digits together: 12345678000190
            r'CNPJ/MF[:\s\-nº]*[\d./\-\s]+',  # CNPJ/MF variation
            r'Inscri[çc][ãa]o\s+CNPJ[:\s]*[\d./\-\s]+',  # Inscrição CNPJ
            r'CGC[:\s\-nº]*[\d./\-\s]+',  # Old CGC format (legacy)
            
            # Company name patterns
            r'Raz[ãa]o\s+Social:?\s*([^\n]+)',  # Razão Social: EMPRESA LTDA
            r'Nome\s+Fantasia:?\s*([^\n]+)',  # Nome Fantasia: EMPRESA
            r'Contratante:?\s*([^\n]+)',  # Contratante: EMPRESA
            r'Cliente:?\s*([^\n]+)',  # Cliente: EMPRESA
            r'Empresa:?\s*([^\n]+)',  # Empresa: EMPRESA
            r'Pessoa\s+Jur[íi]dica:?\s*([^\n]+)',  # Pessoa Jurídica
            r'Denomina[çc][ãa]o:?\s*([^\n]+)',  # Denominação
            
            # Contact patterns - more flexible
            r'Telefone:?\s*[\d()\-\s\+]+',  # Telefone: (11) 1234-5678
            r'Tel\.?:?\s*[\d()\-\s\+]+',  # Tel.: (11) 1234-5678
            r'Fone:?\s*[\d()\-\s\+]+',  # Fone: (11) 1234-5678
            r'Celular:?\s*[\d()\-\s\+]+',  # Celular
            r'\(\d{2}\)\s*\d{4,5}-?\d{4}',  # Direct phone format
            
            # Email patterns
            r'E-?mail:?\s*[\w@.\-]+',  # Email: contato@empresa.com
            r'Email:?\s*[\w@.\-]+',  # Email variation
            r'\b[\w\.-]+@[\w\.-]+\.\w+\b',  # Direct email format
            
            # Address patterns - more comprehensive
            r'Endere[çc]o:?\s*([^\n]+)',  # Endereço: Rua X, 123
            r'Rua:?\s*([^\n]+)',  # Rua: Nome da rua
            r'Avenida:?\s*([^\n]+)',  # Avenida
            r'Logradouro:?\s*([^\n]+)',  # Logradouro
            r'Bairro:?\s*([^\n]+)',  # Bairro
            r'Cidade:?\s*([^\n]+)',  # Cidade
            r'Estado:?\s*([^\n]+)',  # Estado
            r'CEP:?\s*[\d\-\s]+',  # CEP: 12345-678
            r'\b\d{5}-?\d{3}\b',  # Direct CEP format
        ]
        
        for pattern in client_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match[0] else match
                analysis["potential_client_info"].append(str(match).strip())

        # Try to extract CNPJ directly
        analysis["extracted_cnpj"] = self._extract_cnpj_from_text(text)
        if analysis["extracted_cnpj"]:
            logger.info(f"✅ CNPJ extracted directly: {analysis['extracted_cnpj']}")
            # Also add to potential_client_info for redundancy
            analysis["potential_client_info"].insert(0, f"CNPJ: {analysis['extracted_cnpj']}")
        
        # Extract potential equipment information - enhanced for different formats
        equipment_patterns = [
            # Equipment type patterns - mais abrangentes
            r'Gerador[es]?\s+[^.\n]*',
            r'Equipamento[s]?\s+[^.\n]*',
            r'M[áa]quina[s]?\s+[^.\n]*',
            r'Aparelho[s]?\s+[^.\n]*',
            r'No-?Break\s+[^.\n]*',
            r'UPS\s+[^.\n]*',
            r'Sistema\s+de\s+energia\s+[^.\n]*',
            r'Grupo\s+gerador\s+[^.\n]*',
            
            # Context-aware model and brand patterns
            r'Modelo:?\s*([^\n,;.]+)',
            r'Model[eo]:?\s*([^\n,;.]+)',
            r'Marca:?\s*([^\n,;.]+)',
            r'Brand:?\s*([^\n,;.]+)',
            r'Fabricante:?\s*([^\n,;.]+)',
            r'Manufacturer:?\s*([^\n,;.]+)',
            
            # Common generator brands - specific recognition
            r'\b(Cummins|Caterpillar|Cat|Volvo|Perkins|MWM|Scania|Mercedes|Iveco|Detroit|John Deere|Kohler|Generac|Onan)\b[^.\n]*',
            
            # Power specifications - multiple formats
            r'Pot[êe]ncia:?\s*([^\n,;.]+)',
            r'Power:?\s*([^\n,;.]+)',
            r'Capacidade:?\s*([^\n,;.]+)',
            r'(\d+(?:[.,]\d+)?)\s*kVA',
            r'(\d+(?:[.,]\d+)?)\s*kW',
            r'(\d+(?:[.,]\d+)?)\s*HP',
            r'(\d+(?:[.,]\d+)?)\s*CV',
            
            # Voltage patterns - more specific
            r'Tens[ãa]o:?\s*([^\n,;.]+)',
            r'Voltage:?\s*([^\n,;.]+)',
            r'Voltagem:?\s*([^\n,;.]+)',
            r'(\d+)\s*V(?:olts?)?',
            r'(\d+/\d+)\s*V(?:olts?)?',  # 220/380V format
            
            # Serial number patterns - more specific
            r'N[úu]mero\s+de\s+S[ée]rie:?\s*([A-Za-z0-9\-_]+)',
            r'Serial\s+Number:?\s*([A-Za-z0-9\-_]+)',
            r'N[°º]?\s*S[ée]rie:?\s*([A-Za-z0-9\-_]+)',
            r'S/N:?\s*([A-Za-z0-9\-_]+)',
            r'Part\s*Number:?\s*([A-Za-z0-9\-_]+)',
            
            # Location patterns - more comprehensive
            r'Localiza[çc][ãa]o:?\s*([^\n;.]+)',
            r'Local:?\s*([^\n;.]+)',
            r'Instala[çc][ãa]o:?\s*([^\n;.]+)',
            r'Endere[çc]o\s+da\s+Instala[çc][ãa]o:?\s*([^\n;.]+)',
            r'Endere[çc]o\s+de\s+instala[çc][ãa]o:?\s*([^\n;.]+)',
            r'Instalar\s+em:?\s*([^\n;.]+)',
            
            # Year and condition - more specific
            r'Ano\s+de\s+fabrica[çc][ãa]o:?\s*([12]\d{3})',
            r'Ano:?\s*([12]\d{3})',
            r'Year:?\s*([12]\d{3})',
            r'Fabricado\s+em:?\s*([12]\d{3})',
            r'Condi[çc][ãa]o:?\s*([^\n,;.]+)',
            r'Estado:?\s*([^\n,;.]+)',
            r'Condition:?\s*([^\n,;.]+)',
            
            # Technical specifications common in generator contracts
            r'Frequ[êe]ncia:?\s*(\d+)\s*Hz',
            r'Combust[íi]vel:?\s*([^\n,;.]+)',
            r'Tanque:?\s*([^\n,;.]+)',
            r'Autonomia:?\s*([^\n,;.]+)',
            r'Motor:?\s*([^\n,;.]+)',
            r'Alternador:?\s*([^\n,;.]+)',
        ]
        
        for pattern in equipment_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match[0] else match
                analysis["potential_equipment"].append(str(match).strip())
        
        # Extract contract-specific information
        contract_patterns = [
            # Contract numbers and references
            r'Contrato\s+N[°º]?:?\s*([^\n]+)',
            r'Proposta\s+N[°º]?:?\s*([^\n]+)',
            r'Or[çc]amento\s+N[°º]?:?\s*([^\n]+)',
            r'Ref\.?:?\s*([^\n]+)',
            r'N[°º]?\s*Contrato:?\s*([^\n]+)',
            
            # Service patterns
            r'Manuten[çc][ãa]o:?\s*([^\n]+)',
            r'Servi[çc]os?:?\s*([^\n]+)',
            r'Atividades?:?\s*([^\n]+)',
            r'Inclui:?\s*([^\n]+)',
            r'Compreende:?\s*([^\n]+)',
            r'Preventiva:?\s*([^\n]+)',
            r'Corretiva:?\s*([^\n]+)',
            r'Preditiva:?\s*([^\n]+)',
            
            # Duration and frequency
            r'Dura[çc][ãa]o:?\s*([^\n]+)',
            r'Per[íi]odo:?\s*([^\n]+)',
            r'Vigência:?\s*([^\n]+)',
            r'Prazo:?\s*([^\n]+)',
            r'Frequência:?\s*([^\n]+)',
            r'\b\d+\s*meses?\b',
            r'\b\d+\s*anos?\b',
            
            # Payment terms
            r'Pagamento:?\s*([^\n]+)',
            r'Vencimento:?\s*([^\n]+)',
            r'Faturamento:?\s*([^\n]+)',
            r'Condi[çc][õo]es:?\s*([^\n]+)',
        ]
        
        analysis["potential_contracts"] = []
        for pattern in contract_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match[0] else match
                analysis["potential_contracts"].append(str(match).strip())
        
        # Analyze document structure for better context
        analysis["document_structure"] = {
            "has_tables": "tabela" in text.lower() or "|" in text or "┌" in text,
            "has_signatures": "assinatura" in text.lower() or "assinado" in text.lower(),
            "has_legal_terms": any(term in text.lower() for term in ["cláusula", "condições gerais", "termos", "acordo"]),
            "is_formal_contract": "contrato" in text.lower() and "contratante" in text.lower(),
            "is_proposal": "proposta" in text.lower() or "orçamento" in text.lower(),
            "page_count_estimate": text.count("--- PÁGINA") if "--- PÁGINA" in text else 1
        }
        
        return analysis

    def _consolidate_client_info(self, pdf_analysis: Dict[str, Any]) -> Dict[str, str]:
        """
        Consolidate client information from PDF analysis for better extraction
        """
        client_data = {
            "name": "",
            "legal_name": "",
            "cnpj": pdf_analysis.get('extracted_cnpj', ''),
            "email": "",
            "phone": "",
            "address": "",
            "city": "",
            "state": "",
            "zip_code": "",
            "contact_person": ""
        }

        # Process potential client info
        for info in pdf_analysis.get('potential_client_info', []):
            info_str = str(info).strip()

            # Extract email
            if '@' in info_str and not client_data['email']:
                client_data['email'] = info_str

            # Extract phone
            elif any(char.isdigit() for char in info_str) and len(re.findall(r'\d', info_str)) >= 8:
                if not client_data['phone']:
                    client_data['phone'] = info_str

            # Extract CEP
            elif re.match(r'\d{5}-?\d{3}', info_str):
                client_data['zip_code'] = info_str

            # Extract company name
            elif any(suffix in info_str.upper() for suffix in ['LTDA', 'EIRELI', 'S/A', 'S.A', 'ME', 'EPP', 'ASSOCIACAO']):
                if not client_data['legal_name']:
                    client_data['legal_name'] = info_str

            # Extract address components
            elif any(keyword in info_str.lower() for keyword in ['rua', 'avenida', 'av.', 'praça']):
                if not client_data['address']:
                    client_data['address'] = info_str

            # Extract city/state
            elif any(state in info_str.upper() for state in ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE']):
                if not client_data['state']:
                    # Try to extract state abbreviation
                    for state in ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'DF']:
                        if state in info_str.upper():
                            client_data['state'] = state
                            # Extract city (text before state)
                            city_match = re.search(r'([^,\-/]+)[,\-/\s]+' + state, info_str, re.IGNORECASE)
                            if city_match and not client_data['city']:
                                client_data['city'] = city_match.group(1).strip()
                            break

        return client_data

    def _consolidate_equipment_info(self, pdf_analysis: Dict[str, Any]) -> Dict[str, str]:
        """
        Consolidate equipment information from PDF analysis for better extraction
        """
        equipment_data = {
            "type": "",
            "model": "",
            "brand": "",
            "power": "",
            "voltage": "",
            "serial": "",
            "location": "",
            "year": "",
            "condition": ""
        }

        # Process potential equipment info
        for info in pdf_analysis.get('potential_equipment', []):
            info_str = str(info).strip()
            info_lower = info_str.lower()

            # Extract equipment type
            if any(type_word in info_lower for type_word in ['gerador', 'grupo', 'motor', 'no-break', 'ups']):
                if not equipment_data['type']:
                    equipment_data['type'] = info_str

            # Extract brand
            elif any(brand in info_str.upper() for brand in ['CUMMINS', 'CATERPILLAR', 'CAT', 'VOLVO', 'PERKINS', 'MWM']):
                if not equipment_data['brand']:
                    equipment_data['brand'] = info_str

            # Extract power
            elif any(unit in info_str.upper() for unit in ['KVA', 'KW', 'HP', 'CV']):
                if not equipment_data['power']:
                    equipment_data['power'] = info_str

            # Extract voltage
            elif 'V' in info_str and any(char.isdigit() for char in info_str):
                if re.search(r'\d+\s*V', info_str):
                    if not equipment_data['voltage']:
                        equipment_data['voltage'] = info_str

            # Extract model (alphanumeric codes)
            elif re.match(r'^[A-Z0-9\-]+$', info_str.upper()) and len(info_str) > 3:
                if not equipment_data['model']:
                    equipment_data['model'] = info_str

            # Extract location
            elif any(loc_word in info_lower for loc_word in ['local', 'instalação', 'endereço']):
                if not equipment_data['location']:
                    equipment_data['location'] = info_str

            # Extract year
            elif re.match(r'^(19|20)\d{2}$', info_str):
                equipment_data['year'] = info_str

        return equipment_data

    async def process_contract(self, pdf_content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process contract with enhanced PDF analysis and robust date handling
        """
        try:
            # Check cache first for better performance
            cache_key = self._get_cache_key(pdf_content)

            # Enable smart caching - only process if not cached or force refresh requested
            force_refresh = metadata.get('force_refresh', False)

            if cache_key in self._cache and not force_refresh:
                logger.info(f"✨ Using cached result for {cache_key[:16]}...")
                cached_result = self._cache[cache_key]
                cached_result['from_cache'] = True
                return cached_result

            logger.info("🔄 Processing new document (not in cache)")

            # Check if text was already extracted and passed in metadata
            extracted_text = metadata.get("extracted_text")
            extraction_method = metadata.get("extraction_method", "unknown")

            if extracted_text and extracted_text != "PDF_SCANNED_DOCUMENT":
                # Use the already extracted text from metadata
                logger.info(f"✅ Using pre-extracted text from metadata: {len(extracted_text)} characters, method: {extraction_method}")

                # LOG DETALHADO DO TEXTO EXTRAÍDO DO OCR
                logger.info("🔍 ===== TEXTO COMPLETO EXTRAÍDO DO OCR =====")
                logger.info(f"📏 Tamanho total: {len(extracted_text)} caracteres")
                logger.info(f"📏 Tamanho sem espaços: {len(extracted_text.strip())} caracteres")
                logger.info(f"📏 Número de linhas: {len(extracted_text.splitlines())}")
                logger.info(f"🔧 Método de extração: {extraction_method}")

                logger.info("📝 PRIMEIROS 500 CARACTERES:")
                logger.info(f"'{extracted_text[:500]}'")

                if len(extracted_text) > 1000:
                    logger.info("📝 MEIO DO TEXTO (caracteres 500-1000):")
                    logger.info(f"'{extracted_text[500:1000]}'")
                    logger.info("📝 ÚLTIMOS 500 CARACTERES:")
                    logger.info(f"'{extracted_text[-500:]}'")

                # Verificar se há padrões importantes no texto
                cnpj_matches = len(re.findall(r'\d{2}\.?\d{3}\.?\d{3}[/\s]?\d{4}[\-\s]?\d{2}', extracted_text))
                valor_matches = len(re.findall(r'R\$\s*[\d.,]+', extracted_text))
                contratante_matches = len(re.findall(r'[Cc]ontratante', extracted_text, re.IGNORECASE))
                contratada_matches = len(re.findall(r'[Cc]ontratada?', extracted_text, re.IGNORECASE))
                luminus_matches = len(re.findall(r'[Ll]uminus', extracted_text, re.IGNORECASE))

                logger.info(f"🔍 Padrões encontrados no OCR:")
                logger.info(f"  📊 {cnpj_matches} CNPJs")
                logger.info(f"  💰 {valor_matches} valores monetários (R$)")
                logger.info(f"  👤 {contratante_matches} menções a 'contratante'")
                logger.info(f"  🏢 {contratada_matches} menções a 'contratada'")
                logger.info(f"  ⚡ {luminus_matches} menções a 'luminus'")

                # Procurar por palavras-chave importantes
                keywords = ['equipamento', 'manutenção', 'preventiva', 'corretiva', 'gerador', 'energia', 'valor', 'preço']
                for keyword in keywords:
                    matches = len(re.findall(keyword, extracted_text, re.IGNORECASE))
                    if matches > 0:
                        logger.info(f"  🔎 {matches} menções a '{keyword}'")

                logger.info("🔍 ===== FIM DO TEXTO OCR =====")
            else:
                # Only extract if not already provided
                logger.info("📄 No extracted text in metadata, extracting from PDF...")
                from utils.pdf_extractor import PDFExtractor
                try:
                    extracted_text, extraction_method = PDFExtractor.extract_text_from_bytes(pdf_content)

                    # LOG DETALHADO DO TEXTO EXTRAÍDO DIRETAMENTE DO PDF
                    if extracted_text:
                        logger.info("🔍 ===== TEXTO EXTRAÍDO DIRETAMENTE DO PDF =====")
                        logger.info(f"📏 Tamanho total: {len(extracted_text)} caracteres")
                        logger.info(f"📏 Tamanho sem espaços: {len(extracted_text.strip())} caracteres")
                        logger.info(f"📏 Número de linhas: {len(extracted_text.splitlines())}")
                        logger.info(f"🔧 Método de extração: {extraction_method}")

                        logger.info("📝 PRIMEIROS 500 CARACTERES:")
                        logger.info(f"'{extracted_text[:500]}'")

                        if len(extracted_text) > 1000:
                            logger.info("📝 MEIO DO TEXTO (caracteres 500-1000):")
                            logger.info(f"'{extracted_text[500:1000]}'")
                            logger.info("📝 ÚLTIMOS 500 CARACTERES:")
                            logger.info(f"'{extracted_text[-500:]}'")

                        # Verificar padrões importantes
                        cnpj_matches = len(re.findall(r'\d{2}\.?\d{3}\.?\d{3}[/\s]?\d{4}[\-\s]?\d{2}', extracted_text))
                        valor_matches = len(re.findall(r'R\$\s*[\d.,]+', extracted_text))
                        contratante_matches = len(re.findall(r'[Cc]ontratante', extracted_text, re.IGNORECASE))
                        contratada_matches = len(re.findall(r'[Cc]ontratada?', extracted_text, re.IGNORECASE))
                        luminus_matches = len(re.findall(r'[Ll]uminus', extracted_text, re.IGNORECASE))

                        logger.info(f"🔍 Padrões encontrados na extração direta:")
                        logger.info(f"  📊 {cnpj_matches} CNPJs")
                        logger.info(f"  💰 {valor_matches} valores monetários (R$)")
                        logger.info(f"  👤 {contratante_matches} menções a 'contratante'")
                        logger.info(f"  🏢 {contratada_matches} menções a 'contratada'")
                        logger.info(f"  ⚡ {luminus_matches} menções a 'luminus'")

                        # Procurar por palavras-chave importantes
                        keywords = ['equipamento', 'manutenção', 'preventiva', 'corretiva', 'gerador', 'energia', 'valor', 'preço']
                        for keyword in keywords:
                            matches = len(re.findall(keyword, extracted_text, re.IGNORECASE))
                            if matches > 0:
                                logger.info(f"  🔎 {matches} menções a '{keyword}'")

                        logger.info("🔍 ===== FIM DO TEXTO EXTRAÍDO DIRETAMENTE =====")

                    # Check if the extraction failed despite not throwing an exception
                    # This happens when PDFExtractor returns a warning message instead of text
                    if extracted_text and "Não foi possível extrair texto" in extracted_text:
                        logger.warning(f"📷 Scanned PDF detected: {extracted_text}")
                        return {
                            "success": False,
                            "error": "Não foi possível extrair texto do PDF. O documento parece ser escaneado sem OCR.",
                            "technical_error": extracted_text,
                            "workflow_state": {}
                        }

                except Exception as e:
                    error_msg = str(e)
                    # Log the full error for debugging
                    logger.warning(f"📷 Scanned PDF detected: {error_msg}")

                    # Se não conseguiu extrair texto, RETORNAR ERRO
                    if "escaneado" in error_msg.lower() or "sem camada de texto" in error_msg.lower() or "apenas imagem" in error_msg.lower() or "não foi possível extrair" in error_msg.lower():
                        logger.error(f"❌ Falha na extração: {error_msg}")
                        # RETORNAR ERRO - não pode continuar sem texto
                        return {
                            "success": False,
                            "error": "Não foi possível extrair texto do PDF. O documento parece ser escaneado ou não contém texto extraível.",
                            "technical_error": error_msg,
                            "workflow_state": {}
                        }
                    else:
                        # Para outros erros também RETORNAR ERRO
                        logger.error(f"❌ Erro na extração: {error_msg}")
                        return {
                            "success": False,
                            "error": f"Erro ao extrair texto do PDF: {error_msg}",
                            "workflow_state": {}
                        }

            if not extracted_text or not extracted_text.strip() or len(extracted_text.strip()) < 50:
                # Se não tem texto suficiente (menos de 50 caracteres), RETORNAR ERRO
                logger.error(f"❌ PDF com texto insuficiente ({len(extracted_text.strip()) if extracted_text else 0} caracteres) - não é possível processar")
                return {
                    "success": False,
                    "error": "PDF não contém texto suficiente para processamento. Verifique se o documento não está corrompido ou se é um PDF escaneado sem OCR.",
                    "extracted_chars": len(extracted_text.strip()) if extracted_text else 0,
                    "workflow_state": {}
                }
            
            # Analyze PDF content with Python tools first
            logger.info("🔍 Analyzing PDF content with Python tools...")
            pdf_analysis = self._analyze_pdf_content(extracted_text)

            # Extract key fields using similarity matching BEFORE sending to LLM
            logger.info("🎯 Extracting key fields with text similarity...")
            similarity_extracted = self._extract_key_fields_with_similarity(extracted_text)

            # Merge similarity extraction with PDF analysis
            if similarity_extracted["client_cnpj"]:
                pdf_analysis["extracted_cnpj"] = similarity_extracted["client_cnpj"]
                logger.info(f"✅ CNPJ extracted directly: {similarity_extracted['client_cnpj']}")

            logger.info(f"📊 Found: {len(pdf_analysis['potential_dates'])} dates, {len(pdf_analysis['potential_values'])} values, {len(pdf_analysis['potential_client_info'])} client info")
            logger.info(f"🔧 Equipment data found: {len(pdf_analysis['potential_equipment'])} items")
            if pdf_analysis['potential_equipment']:
                logger.info(f"🔧 Equipment details: {pdf_analysis['potential_equipment'][:10]}")  # Log first 10 equipment items

            # Add similarity extracted data to pdf_analysis for use in LLM prompt
            pdf_analysis["similarity_extracted"] = similarity_extracted
            
            # Single optimized OpenAI call for everything
            logger.info("🚀 Processing with enhanced OpenAI analysis...")
            start_time = datetime.now()
            
            result = await self._process_with_enhanced_analysis(extracted_text, pdf_analysis, metadata)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Processing completed in {processing_time:.2f} seconds")
            
            # Prepare response
            # CRITICAL VALIDATION: Check if CNPJ exists before declaring success
            cnpj = result.get('extracted_data', {}).get('client_cnpj', '').strip()

            # Remove any non-numeric characters for validation
            cnpj_clean = re.sub(r'\D', '', cnpj)

            # Use the directly extracted CNPJ if OpenAI didn't find it
            if not cnpj_clean and pdf_analysis.get('extracted_cnpj'):
                cnpj_clean = pdf_analysis['extracted_cnpj']
                result['extracted_data']['client_cnpj'] = cnpj_clean
                logger.info(f"✅ Using directly extracted CNPJ: {cnpj_clean}")

            # More flexible CNPJ validation - accept partial CNPJs if they look valid
            # Some contracts might have only the base CNPJ (8 digits) without branch
            if not cnpj_clean or (len(cnpj_clean) < 8):
                # Only fail if we really couldn't find any CNPJ-like number
                # Try to find CNPJ in the raw analysis as fallback
                found_cnpj = False
                for info in pdf_analysis.get('potential_client_info', []):
                    # Try to extract CNPJ from any client info
                    potential_cnpj = re.sub(r'\D', '', str(info))
                    if len(potential_cnpj) >= 8:  # At least base CNPJ
                        cnpj_clean = potential_cnpj[:14]  # Take max 14 digits
                        found_cnpj = True
                        logger.info(f"✅ Found CNPJ in fallback search: {cnpj_clean}")
                        # Update the result with found CNPJ
                        result['extracted_data']['client_cnpj'] = cnpj_clean
                        break

                if not found_cnpj:
                    logger.warning(f"⚠️ CNPJ not clearly identified. Extracted value: '{cnpj}'")
                    # Instead of hard failure, return with warning
                    result['validation_result'] = result.get('validation_result', {})
                    result['validation_result']['warnings'] = result['validation_result'].get('warnings', [])
                    result['validation_result']['warnings'].append("CNPJ não claramente identificado - verifique manualmente")
            
            # Additional validation: Check if it's just placeholder values
            client_name = result.get('extracted_data', {}).get('client_name', '').strip()

            # If client name is empty but we have CNPJ, try to extract from Python analysis
            if not client_name and pdf_analysis.get('potential_client_info'):
                for info in pdf_analysis['potential_client_info']:
                    info_str = str(info)
                    # Look for company names (usually with LTDA, EIRELI, SA, ME)
                    if any(suffix in info_str.upper() for suffix in ['LTDA', 'EIRELI', 'S/A', 'S.A', 'ME', 'EPP', 'ASSOCIACAO', 'INSTITUTO', 'COMITE']):
                        client_name = info_str.strip()
                        result['extracted_data']['client_name'] = client_name
                        logger.info(f"🏢 Found client name in Python analysis: {client_name}")
                        break

            if len(client_name) <= 1 or client_name.lower() in ['s', 'n/a', 'não especificado', '']:
                logger.error(f"❌ INVALID CONTRACT: Invalid client name: '{client_name}'")
                return {
                    "success": False,
                    "error": "Dados do cliente inválidos",
                    "message": "Documento não contém informações válidas de cliente. Verifique se é um contrato válido.",
                    "validation_errors": ["Nome do cliente inválido ou não encontrado"],
                    "workflow_state": {
                        "extracted_data": result.get('extracted_data', {}),
                        "validation_result": {
                            "is_valid": False,
                            "errors": ["Dados do cliente inválidos"]
                        }
                    }
                }
            
            # Only return success if validation passes
            logger.info(f"✅ Valid contract with CNPJ: {cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:14]}")
            
            # IMPORTANT: Add extracted_text to the result for database storage
            result['extracted_text'] = extracted_text
            result['extraction_method'] = extraction_method

            # Also ensure it's in extracted_data for consistency
            if 'extracted_data' not in result:
                result['extracted_data'] = {}

            # Store the full extracted text for searchability
            result['extracted_data']['_full_text'] = extracted_text

            logger.info(f"📄 Returning {len(extracted_text)} characters of extracted text for database storage")

            response = {
                "success": True,
                "workflow_state": result,
                "processing_time": processing_time,
                "extraction_method": extraction_method,
                "extracted_text": extracted_text,  # CRITICAL: Include full text in response
                "pdf_analysis_summary": {
                    "dates_found": len(pdf_analysis['potential_dates']),
                    "values_found": len(pdf_analysis['potential_values']),
                    "text_length": pdf_analysis['text_length'],
                    "client_info_found": len(pdf_analysis['potential_client_info']),
                    "equipment_found": len(pdf_analysis['potential_equipment'])
                }
            }
            
            # Cache the result
            self._cache[cache_key] = response
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing contract: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "workflow_state": {}
            }
    
    async def _process_with_enhanced_analysis(self, text: str, pdf_analysis: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process with enhanced PDF analysis - uses Python-extracted data for better accuracy
        """
        try:
            # Use FULL text for comprehensive extraction - Gemini supports up to 1M tokens
            # No need to limit text anymore - Gemini 2.5 Flash can handle large documents
            text_preview = text  # Send complete text, no truncation
            logger.info(f"📄 Processando TEXTO COMPLETO: {len(text_preview)} caracteres")

            # LOG DETALHADO DO TEXTO QUE SERÁ ENVIADO PARA O GEMINI
            logger.info("🤖 ===== TEXTO QUE SERÁ ENVIADO PARA O GEMINI =====")
            logger.info(f"📏 Tamanho do texto para Gemini: {len(text_preview)} caracteres")
            logger.info(f"📏 Número de linhas para Gemini: {len(text_preview.splitlines())}")
            logger.info("📝 AMOSTRA DO TEXTO PARA GEMINI (primeiros 300 chars):")
            logger.info(f"'{text_preview[:300]}'")
            if len(text_preview) > 600:
                logger.info("📝 AMOSTRA DO FINAL DO TEXTO (últimos 300 chars):")
                logger.info(f"'{text_preview[-300:]}'")
            logger.info("🤖 ===== FIM DO TEXTO PARA GEMINI =====")
            
            # Load prompts from centralized YAML file - NO FALLBACK ALLOWED
            # All analysis data is now passed directly via pdf_analysis dict to PromptLoader
            prompt_loader = get_prompt_loader()
            system_prompt, user_prompt = prompt_loader.build_contract_extraction_prompt(
                text_preview=text_preview,
                pdf_analysis=pdf_analysis,  # Pass complete pdf_analysis dict
                metadata=metadata
            )

            # CRITICAL: YAML prompts are MANDATORY - no inline fallback
            if not system_prompt or not user_prompt:
                error_msg = "❌ ERRO CRÍTICO: Prompts do YAML não foram carregados! Verifique o arquivo agents_prompts.yaml"
                logger.error(error_msg)
                logger.error(f"System prompt vazio: {not system_prompt}")
                logger.error(f"User prompt vazio: {not user_prompt}")
                raise Exception(error_msg)

            # Log successful prompt loading
            logger.info(f"✅ System prompt carregado do YAML: {len(system_prompt)} chars")
            logger.info(f"✅ User prompt carregado do YAML: {len(user_prompt)} chars")

            # LOG DETALHADO ANTES DA CHAMADA GEMINI
            logger.info("🤖 ===== INICIANDO CHAMADA GEMINI =====")
            logger.info(f"📝 System prompt: {len(system_prompt)} chars")
            logger.info(f"📝 User prompt: {len(user_prompt)} chars")
            logger.info(f"🔧 Modelo: gemini-2.5-flash")

            # Use ONLY Gemini for contract processing
            if not self.gemini_client:
                logger.error("❌ Gemini não configurado! Configure GEMINI_API_KEY no arquivo .env")
                raise Exception("Gemini API não configurado. Configure a variável GEMINI_API_KEY no arquivo .env")

            # Use the complete prompt from YAML
            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            # Configuração simplificada sem AFC
            config = types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=32000,  # Increased limit for complete data extraction
                response_mime_type="application/json"
            )

            # Retry logic with exponential backoff for Gemini API
            max_retries = 3
            retry_delay = 2  # seconds
            response = None

            for attempt in range(max_retries):
                try:
                    logger.info(f"🔄 Tentativa {attempt + 1}/{max_retries} de chamar Gemini API...")
                    response = self.gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=full_prompt,
                        config=config
                    )
                    logger.info(f"✅ Gemini API respondeu na tentativa {attempt + 1}")
                    break  # Success, exit retry loop

                except Exception as api_error:
                    error_str = str(api_error)

                    # Check if it's a 503 (overloaded) or rate limit error
                    if '503' in error_str or 'overloaded' in error_str.lower() or 'UNAVAILABLE' in error_str:
                        logger.warning(f"⚠️ Gemini API sobrecarregada (tentativa {attempt + 1}/{max_retries}): {error_str}")

                        if attempt < max_retries - 1:
                            wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                            logger.info(f"⏳ Aguardando {wait_time}s antes de tentar novamente...")
                            import time
                            time.sleep(wait_time)
                        else:
                            logger.error(f"❌ Gemini API falhou após {max_retries} tentativas")
                            raise api_error
                    else:
                        # For other errors, don't retry
                        logger.error(f"❌ Erro não recuperável na chamada Gemini: {error_str}")
                        raise api_error

            if response is None:
                raise Exception("Gemini API não retornou resposta após todas as tentativas")

            try:

                # Debug: Log full response object
                logger.info(f"🔍 Response object type: {type(response)}")
                logger.info(f"🔍 Response attributes: {dir(response)}")

                # Try different ways to get content
                raw_content = None
                if hasattr(response, 'text'):
                    raw_content = response.text
                    logger.info(f"✅ Got content via .text: {len(raw_content) if raw_content else 0} chars")
                elif hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content'):
                        if hasattr(candidate.content, 'parts'):
                            parts_text = ''.join([part.text for part in candidate.content.parts if hasattr(part, 'text')])
                            raw_content = parts_text
                            logger.info(f"✅ Got content via candidates.content.parts: {len(raw_content)} chars")

                # LOG DETALHADO APÓS RECEBER RESPOSTA GEMINI
                logger.info("🤖 ===== RESPOSTA GEMINI RECEBIDA =====")
                logger.info("📊 Usando Gemini 2.5 Flash para processamento de contratos")
                logger.info(f"📊 Tamanho da resposta: {len(raw_content) if raw_content else 0} caracteres")

                # Check if response is empty and handle it
                if not raw_content or raw_content.strip() == "":
                    logger.warning("⚠️ Gemini retornou resposta vazia - usando processamento fallback")
                    logger.info(f"🔍 Response full object: {response}")
                    logger.info("🤖 ===== FIM DA RESPOSTA GEMINI (VAZIA) =====")
                    # Jump directly to fallback processing
                    import json as json_module
                    raise json_module.JSONDecodeError("Empty response from Gemini", "", 0)

            except AttributeError as attr_err:
                logger.error(f"❌ Erro ao acessar resposta do Gemini: {attr_err}")
                logger.error(f"❌ Response object: {response if 'response' in locals() else 'Not defined'}")
                import json as json_module
                raise json_module.JSONDecodeError("Error accessing Gemini response", "", 0)

            logger.info("📝 PRIMEIROS 800 CARACTERES DA RESPOSTA GEMINI:")
            logger.info(f"'{raw_content[:800] if raw_content else 'RESPOSTA VAZIA'}'")

            if raw_content and len(raw_content) > 1000:
                logger.info("📝 ÚLTIMOS 400 CARACTERES DA RESPOSTA GEMINI:")
                logger.info(f"'{raw_content[-400:]}'")

            logger.info("🤖 ===== FIM DA RESPOSTA GEMINI =====")

            # Parse response with detailed error handling
            try:
                logger.info("🔍 Tentando fazer parse da resposta como JSON...")

                # Clean JSON response to handle common formatting issues
                cleaned_content = raw_content.strip()
                logger.info(f"📝 Conteúdo bruto (primeiros 200 chars): {cleaned_content[:200]}")

                # Remove markdown code blocks if present
                if cleaned_content.startswith('```'):
                    logger.info("🔧 Removendo blocos de código markdown...")
                    # Extract JSON from markdown code block
                    lines = cleaned_content.split('\n')
                    cleaned_content = '\n'.join(lines[1:-1]) if len(lines) > 2 else cleaned_content
                    logger.info(f"📝 Após remover markdown (primeiros 200 chars): {cleaned_content[:200]}")

                # Try to fix trailing commas before closing braces/brackets (be careful with this)
                try:
                    # Only fix obvious issues, don't be too aggressive
                    cleaned_content = re.sub(r',(\s*[}\]])', r'\1', cleaned_content)
                    logger.info("✅ Regex de limpeza aplicado com sucesso")
                except Exception as regex_err:
                    logger.warning(f"⚠️ Erro no regex de limpeza: {regex_err}, usando conteúdo original")

                # Try to parse
                parsed_result = json.loads(cleaned_content)
                logger.info("✅ JSON parsing bem-sucedido!")
                logger.info(f"📋 Chaves encontradas no resultado: {list(parsed_result.keys()) if isinstance(parsed_result, dict) else 'NÃO É DICT'}")

                # Log sample of parsed data
                if isinstance(parsed_result, dict):
                    if 'extracted_data' in parsed_result:
                        logger.info(f"📊 extracted_data keys: {list(parsed_result['extracted_data'].keys())}")
                    if 'client_name' in parsed_result:
                        logger.info(f"👤 client_name found: {parsed_result.get('client_name', 'N/A')[:50]}")
                    if 'client_cnpj' in parsed_result:
                        logger.info(f"💼 client_cnpj found: {parsed_result.get('client_cnpj', 'N/A')}")

                # Map response to expected structure
                if 'extracted_data' not in parsed_result:
                    # GPT/Gemini returned different structure, map it
                    logger.info("📊 Mapeando resposta para estrutura esperada...")

                    # STEP 1: Flatten nested structure if Gemini returned CONTRATO/CLIENTE/EQUIPAMENTO
                    if any(key in parsed_result for key in ['CONTRATO', 'CLIENTE', 'EQUIPAMENTO', 'ENDEREÇO DO CLIENTE', 'ENDEREÇO_DO_CLIENTE']):
                        logger.info("🔄 Detectada estrutura aninhada do Gemini, achatando...")
                        flattened = {}

                        # Merge CONTRATO fields
                        if 'CONTRATO' in parsed_result and isinstance(parsed_result['CONTRATO'], dict):
                            flattened.update(parsed_result['CONTRATO'])
                            logger.info(f"✅ Mesclados {len(parsed_result['CONTRATO'])} campos de CONTRATO")

                        # Merge CLIENTE fields
                        if 'CLIENTE' in parsed_result and isinstance(parsed_result['CLIENTE'], dict):
                            flattened.update(parsed_result['CLIENTE'])
                            logger.info(f"✅ Mesclados {len(parsed_result['CLIENTE'])} campos de CLIENTE")

                        # Merge ENDEREÇO fields
                        endereco_key = 'ENDEREÇO DO CLIENTE' if 'ENDEREÇO DO CLIENTE' in parsed_result else 'ENDEREÇO_DO_CLIENTE'
                        if endereco_key in parsed_result and isinstance(parsed_result[endereco_key], dict):
                            flattened.update(parsed_result[endereco_key])
                            logger.info(f"✅ Mesclados {len(parsed_result[endereco_key])} campos de ENDEREÇO")

                        # Merge EQUIPAMENTO fields
                        if 'EQUIPAMENTO' in parsed_result:
                            flattened['equipment'] = parsed_result['EQUIPAMENTO']
                            logger.info(f"✅ Adicionado EQUIPAMENTO")

                        # Merge SERVIÇOS fields
                        if 'SERVIÇOS' in parsed_result:
                            flattened['services'] = parsed_result['SERVIÇOS']
                            logger.info(f"✅ Adicionados {len(parsed_result['SERVIÇOS']) if isinstance(parsed_result['SERVIÇOS'], list) else 1} SERVIÇOS")

                        # Merge MANUTENÇÃO fields
                        if 'MANUTENÇÃO' in parsed_result:
                            flattened['maintenance_plan'] = parsed_result['MANUTENÇÃO']
                            logger.info(f"✅ Adicionado plano de MANUTENÇÃO")

                        # Merge OBSERVAÇÕES
                        if 'OBSERVAÇÕES' in parsed_result:
                            flattened['observations'] = parsed_result['OBSERVAÇÕES']
                            logger.info(f"✅ Adicionadas OBSERVAÇÕES")

                        # Replace parsed_result with flattened version
                        parsed_result = flattened
                        logger.info(f"✅ Estrutura achatada: {len(parsed_result)} campos no total")

                    # STEP 2: Convert monetary string values to numbers
                    for money_field in ['contract_value', 'monthly_value', 'total_value', 'value']:
                        if money_field in parsed_result and isinstance(parsed_result[money_field], str):
                            # Remove "R$", spaces, dots (thousand separator) and convert comma to dot
                            value_str = parsed_result[money_field]
                            # Remove R$, spaces
                            value_clean = value_str.replace('R$', '').replace(' ', '').strip()
                            # Remove dots (thousand separator) but keep comma (decimal)
                            value_clean = value_clean.replace('.', '')
                            # Replace comma with dot for decimal
                            value_clean = value_clean.replace(',', '.')
                            try:
                                parsed_result[money_field] = float(value_clean)
                                logger.info(f"💰 Convertido {money_field}: '{value_str}' → {parsed_result[money_field]}")
                            except ValueError:
                                logger.warning(f"⚠️ Não foi possível converter {money_field}: '{value_str}'")
                                parsed_result[money_field] = 0

                    # STEP 3: Log COMPLETE parsed_result after flattening for debug
                    logger.info("="*80)
                    logger.info("📊 PARSED_RESULT APÓS ACHATAMENTO E CONVERSÃO:")
                    logger.info("="*80)
                    for key, value in parsed_result.items():
                        if isinstance(value, dict):
                            logger.info(f"  {key}: dict com {len(value)} campos")
                        elif isinstance(value, list):
                            logger.info(f"  {key}: lista com {len(value)} itens")
                        else:
                            value_str = str(value)[:100] if value else "VAZIO"
                            logger.info(f"  {key}: {value_str}")
                    logger.info("="*80)

                    # Map equipment data - handle both equipment and equipment_details keys
                    equipment_data = parsed_result.get('equipment', parsed_result.get('equipment_details', []))

                    # Convert list to dict format if needed
                    if isinstance(equipment_data, list) and equipment_data:
                        # If it's a list, take the first item or create a dict from it
                        first_equipment = equipment_data[0] if equipment_data else {}
                        equipment_dict = {
                            "type": first_equipment.get('type', ''),
                            "model": first_equipment.get('model', ''),
                            "power": first_equipment.get('power_kva', '') or first_equipment.get('power', ''),
                            "quantity": first_equipment.get('quantity', 1),
                            "voltage": first_equipment.get('voltage_v', ''),
                            "frequency": first_equipment.get('frequency_hz', ''),
                            "fuel_type": first_equipment.get('fuel_type', ''),
                            "items": equipment_data  # Keep full list for reference
                        }
                    elif isinstance(equipment_data, dict):
                        equipment_dict = equipment_data
                    elif isinstance(equipment_data, str):
                        # If equipment is a string, create a dict with it as the type
                        equipment_dict = {
                            "type": equipment_data,
                            "model": "",
                            "brand": "",
                            "power": "",
                            "voltage": "",
                            "description": equipment_data
                        }
                        logger.warning(f"⚠️ Equipment data was a string: {equipment_data}")
                    else:
                        equipment_dict = {
                            "type": "",
                            "model": "",
                            "brand": "",
                            "power": "",
                            "voltage": ""
                        }
                        logger.warning(f"⚠️ Unexpected equipment data type: {type(equipment_data)}")

                    # Determine client name from the parsed result
                    # IMPORTANT: Client is the CONTRACTING party, not the CONTRACTED party
                    client_name = ''

                    # Priority 1: Look for explicit client_name field
                    if 'client_name' in parsed_result and parsed_result['client_name']:
                        client_name = parsed_result['client_name']

                    # Priority 2: Look for contracting_party (who's hiring the service)
                    elif 'contracting_party' in parsed_result:
                        client_name = parsed_result['contracting_party'].get('name', '')

                    # Priority 3: Look for client object
                    elif 'client' in parsed_result:
                        client_name = parsed_result['client'].get('legal_name', '') or parsed_result['client'].get('trade_name', '')

                    # NEVER use contracted_company_name as client - this is the service provider
                    # If we got contracted_company_name but no client_name, leave it empty to be filled from OCR analysis
                    if 'contracted_company_name' in parsed_result and client_name == parsed_result.get('contracted_company_name'):
                        client_name = ''  # Reset if mistakenly using contractor as client

                    result = {
                        "extracted_data": {
                            # IDs e números
                            "contract_number": parsed_result.get('contract_number', '') or parsed_result.get('contract_id', ''),
                            "proposal_number": parsed_result.get('proposal_number', ''),

                            # Dados do cliente
                            "client_cnpj": parsed_result.get('client_cnpj', '') or parsed_result.get('client', {}).get('cnpj', ''),
                            "client_name": client_name or parsed_result.get('client_name', ''),
                            "client_legal_name": parsed_result.get('client_legal_name', '') or parsed_result.get('client', {}).get('legal_name', ''),
                            "client_email": parsed_result.get('client_email', '') or parsed_result.get('client', {}).get('email', ''),
                            "client_phone": parsed_result.get('client_phone', '') or parsed_result.get('client', {}).get('phone', ''),

                            # Endereço completo
                            "client_address": parsed_result.get('client_address', '') or parsed_result.get('client', {}).get('address', ''),
                            "client_city": parsed_result.get('client_city', '') or parsed_result.get('client', {}).get('city', ''),
                            "client_state": parsed_result.get('client_state', '') or parsed_result.get('client', {}).get('state', ''),
                            "client_zip_code": parsed_result.get('client_zip_code', '') or parsed_result.get('client', {}).get('zip_code', ''),
                            "client_contact_person": parsed_result.get('client_contact_person', '') or parsed_result.get('client', {}).get('contact_person', ''),

                            # Valores financeiros - mapear todos os formatos possíveis
                            "contract_value": parsed_result.get('total_value', 0) or parsed_result.get('total_contract_value', 0) or parsed_result.get('contract_value', 0) or parsed_result.get('value', 0),
                            "monthly_value": parsed_result.get('monthly_value', 0) or parsed_result.get('monthly_payment_value', 0) or parsed_result.get('monthly_rental_value', 0),
                            "value": parsed_result.get('total_value', 0) or parsed_result.get('total_contract_value', 0) or parsed_result.get('contract_value', 0),

                            # Tipo e datas
                            "contract_type": parsed_result.get('contract_type', 'Locação'),
                            "start_date": parsed_result.get('start_date', '') or parsed_result.get('contract_start_date', ''),
                            "end_date": parsed_result.get('end_date', '') or parsed_result.get('contract_end_date', ''),
                            "contract_date": parsed_result.get('contract_date', ''),
                            "proposal_date": parsed_result.get('proposal_date', ''),
                            "duration": parsed_result.get('duration', ''),
                            "duration_months": parsed_result.get('duration_months', 0),

                            # Equipamento (já está correto)
                            "equipment": equipment_dict,

                            # Serviços e termos
                            "services": parsed_result.get('services', []) or parsed_result.get('included_services', []),
                            "payment_terms": parsed_result.get('payment_terms', '') or parsed_result.get('payment_method', ''),
                            "payment_due_day": parsed_result.get('payment_due_day', 0),
                            "observations": parsed_result.get('observations', ''),

                            # Campos adicionais importantes
                            "supplier_name": parsed_result.get('supplier_name', ''),
                            "supplier_cnpj": parsed_result.get('supplier_cnpj', ''),
                            "is_renewal": parsed_result.get('is_renewal', False),
                            "automatic_renewal": parsed_result.get('automatic_renewal', False),
                            "reajustment_index": parsed_result.get('reajustment_index', ''),
                            "fines_late_payment_percentage": parsed_result.get('fines_late_payment_percentage', 0),
                            "cancellation_fine_percentage": parsed_result.get('cancellation_fine_percentage', 0)
                        },
                        "validation_result": {
                            "is_valid": True,
                            "errors": [],
                            "warnings": []
                        },
                        "workflow_summary": parsed_result.get('workflow_summary', {
                            "summary": "Contrato processado com sucesso",
                            "key_points": [],
                            "recommendations": [],
                            "risks": []
                        })
                    }
                else:
                    result = parsed_result
            except json.JSONDecodeError as e:
                logger.error(f"❌ ERRO JSON DECODE: {e}")
                logger.error(f"❌ Posição do erro: linha {e.lineno}, coluna {e.colno}")
                logger.error(f"❌ Mensagem: {e.msg}")
                logger.error(f"❌ Conteúdo problemático: {raw_content[max(0, e.pos-50):e.pos+50] if hasattr(e, 'pos') else 'N/A'}")
                raise
            except Exception as e:
                logger.error(f"❌ ERRO INESPERADO NO PARSING: {type(e).__name__}: {e}")
                logger.error(f"❌ Conteúdo completo da resposta: {raw_content}")
                raise
            
            # Post-processing validation to ensure no invalid dates
            result = self._validate_and_clean_result(result, pdf_analysis)

            # 🚨 COMPLETE FINAL JSON LOGGING - User requested to see EXACT data sent to backend
            logger.info("="*100)
            logger.info("🚨 JSON FINAL COMPLETO QUE SERÁ RETORNADO PARA O BACKEND/FRONTEND:")
            logger.info("="*100)
            try:
                logger.info(json.dumps(result, indent=2, ensure_ascii=False, default=str))
            except Exception as log_err:
                logger.error(f"❌ Erro ao fazer dump do JSON: {log_err}")
                logger.info(f"Result type: {type(result)}")
                logger.info(f"Result keys: {result.keys() if isinstance(result, dict) else 'NOT A DICT'}")
            logger.info("="*100)

            # 📊 EXTRACTED_DATA FIELD-BY-FIELD ANALYSIS
            logger.info("📊 ANÁLISE CAMPO-A-CAMPO DO EXTRACTED_DATA:")
            logger.info("="*100)
            if 'extracted_data' in result and isinstance(result['extracted_data'], dict):
                extracted = result['extracted_data']
                logger.info(f"📌 Total de campos em extracted_data: {len(extracted)}")
                logger.info("-"*80)

                # Contract fields
                logger.info("📄 CONTRATO:")
                for field in ['contract_number', 'contract_type', 'contract_status', 'contract_value', 'monthly_value', 'start_date', 'end_date']:
                    value = extracted.get(field, 'CAMPO NÃO ENCONTRADO')
                    if value and str(value).strip():
                        logger.info(f"  ✅ {field}: {value}")
                    else:
                        logger.warning(f"  ❌ {field}: VAZIO/NULO")

                # Client fields
                logger.info("-"*80)
                logger.info("👤 CLIENTE:")
                for field in ['client_name', 'client_legal_name', 'client_cnpj', 'client_email', 'client_phone', 'client_contact_person']:
                    value = extracted.get(field, 'CAMPO NÃO ENCONTRADO')
                    if value and str(value).strip():
                        logger.info(f"  ✅ {field}: {value}")
                    else:
                        logger.warning(f"  ❌ {field}: VAZIO/NULO")

                # Address fields
                logger.info("-"*80)
                logger.info("📍 ENDEREÇO:")
                for field in ['client_address', 'client_address_number', 'client_neighborhood', 'client_city', 'client_state', 'client_zipcode']:
                    value = extracted.get(field, 'CAMPO NÃO ENCONTRADO')
                    if value and str(value).strip():
                        logger.info(f"  ✅ {field}: {value}")
                    else:
                        logger.warning(f"  ❌ {field}: VAZIO/NULO")

                # Equipment fields
                logger.info("-"*80)
                logger.info("🔧 EQUIPAMENTO:")
                equipment = extracted.get('equipment', {})
                if isinstance(equipment, dict):
                    for field in ['type', 'brand', 'model', 'serial_number', 'power', 'voltage', 'year', 'condition', 'location', 'fuel_type', 'frequency']:
                        value = equipment.get(field, 'CAMPO NÃO ENCONTRADO')
                        if value and str(value).strip():
                            logger.info(f"  ✅ {field}: {value}")
                        else:
                            logger.warning(f"  ❌ {field}: VAZIO/NULO")
                else:
                    logger.warning(f"  ⚠️ equipment não é dict: {type(equipment)}")

                # Services
                logger.info("-"*80)
                logger.info("🛠️ SERVIÇOS:")
                services = extracted.get('services', [])
                if isinstance(services, list) and services:
                    logger.info(f"  ✅ {len(services)} serviços extraídos")
                    for idx, service in enumerate(services):
                        logger.info(f"  Service {idx+1}: {service}")
                else:
                    logger.warning(f"  ❌ services vazio ou inválido: {services}")

                # Maintenance plan
                logger.info("-"*80)
                logger.info("📅 PLANO DE MANUTENÇÃO:")
                maintenance = extracted.get('maintenance_plan', {})
                if isinstance(maintenance, dict) and maintenance:
                    logger.info(f"  ✅ Plano de manutenção: {maintenance}")
                else:
                    logger.warning(f"  ❌ maintenance_plan vazio ou inválido: {maintenance}")

                # Observations
                logger.info("-"*80)
                logger.info("📝 OBSERVAÇÕES:")
                obs = extracted.get('observations', '')
                if obs and str(obs).strip():
                    logger.info(f"  ✅ observations: {obs[:200]}..." if len(str(obs)) > 200 else f"  ✅ observations: {obs}")
                else:
                    logger.warning(f"  ❌ observations: VAZIO")

            else:
                logger.error("❌ EXTRACTED_DATA NÃO ENCONTRADO OU NÃO É UM DICT!")
                logger.error(f"Type: {type(result.get('extracted_data'))}")
                logger.error(f"Value: {result.get('extracted_data')}")

            logger.info("="*100)

            # CRITICAL: Validate CNPJ before returning success
            cnpj = result.get('extracted_data', {}).get('client_cnpj', '')
            cnpj_clean = re.sub(r'\D', '', str(cnpj))

            # If AI didn't find CNPJ, try to extract it from the Python analysis
            if not cnpj_clean or len(cnpj_clean) != 14:
                logger.warning(f"⚠️ AI didn't extract valid CNPJ: '{cnpj}'. Searching in Python analysis...")

                # Search for CNPJ in the potential_client_info from Python analysis
                for info in pdf_analysis.get('potential_client_info', []):
                    # Extract all numbers from the string
                    potential_cnpj = re.sub(r'\D', '', str(info))
                    # Check if it's a valid CNPJ (14 digits)
                    if len(potential_cnpj) == 14:
                        logger.info(f"✅ Found valid CNPJ in Python analysis: {potential_cnpj}")
                        cnpj_clean = potential_cnpj
                        result["extracted_data"]["client_cnpj"] = cnpj_clean
                        break

            # Final validation
            if not cnpj_clean or len(cnpj_clean) < 8:  # Accept partial CNPJ but not empty
                logger.error(f"❌ INVALID CONTRACT: No valid CNPJ found in document")
                # RETURN ERROR - Don't process without CNPJ
                raise Exception("CNPJ não identificado no documento. Este campo é obrigatório.")
            else:
                # Format CNPJ for logging
                formatted_cnpj = f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:14]}" if len(cnpj_clean) >= 14 else cnpj_clean
                logger.info(f"✅ Valid CNPJ found: {formatted_cnpj}")
            
            # Log extracted equipment data for debugging
            if 'extracted_data' in result and 'equipment' in result['extracted_data']:
                logger.info("🔧 Final equipment data extracted:")
                equipment_data = result['extracted_data']['equipment']
                # Check if equipment_data is a dict or list
                if isinstance(equipment_data, dict):
                    for key, value in equipment_data.items():
                        if value and str(value).strip():
                            logger.info(f"  {key}: {value}")
                        else:
                            logger.warning(f"  {key}: EMPTY or NULL")
                elif isinstance(equipment_data, list):
                    logger.info(f"  Equipment list with {len(equipment_data)} items")
                    for idx, item in enumerate(equipment_data):
                        logger.info(f"  Item {idx}: {item}")
                else:
                    logger.warning(f"  Unexpected equipment data type: {type(equipment_data)}")

            # Log COMPLETE final result that will be sent to frontend
            logger.info("=" * 80)
            logger.info("📤 DADOS FINAIS QUE SERÃO ENVIADOS PARA O FRONTEND:")
            logger.info("=" * 80)
            if 'extracted_data' in result:
                extracted = result['extracted_data']
                logger.info(f"🔢 Número do Contrato: {extracted.get('contract_number', 'VAZIO')}")
                logger.info(f"👤 Nome do Cliente: {extracted.get('client_name', 'VAZIO')}")
                logger.info(f"💼 CNPJ do Cliente: {extracted.get('client_cnpj', 'VAZIO')}")
                logger.info(f"📧 Email: {extracted.get('client_email', 'VAZIO')}")
                logger.info(f"📞 Telefone: {extracted.get('client_phone', 'VAZIO')}")
                logger.info(f"📍 Endereço: {extracted.get('client_address', 'VAZIO')}")
                logger.info(f"💰 Valor Total: R$ {extracted.get('contract_value', 0)}")
                logger.info(f"💵 Valor Mensal: R$ {extracted.get('monthly_value', 0)}")
                logger.info(f"📅 Data Início: {extracted.get('start_date', 'VAZIO')}")
                logger.info(f"📅 Data Término: {extracted.get('end_date', 'VAZIO')}")
                logger.info(f"🔧 Equipamento Tipo: {extracted.get('equipment', {}).get('type', 'VAZIO')}")
                logger.info(f"🏷️ Equipamento Marca: {extracted.get('equipment', {}).get('brand', 'VAZIO')}")
                logger.info(f"📋 Serviços: {len(extracted.get('services', []))} itens")
                logger.info("=" * 80)
            else:
                logger.error("❌ ERRO: extracted_data não encontrado no resultado!")

            return result
                
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Gemini response as JSON: {str(e)}")
            logger.warning("🔧 Trying fallback data extraction from text...")

            # Enhanced fallback data extraction from text analysis
            # USE REAL DATA FROM PDF ANALYSIS - NO MOCKING!

            # First try to use similarity extracted data if available
            sim_data = pdf_analysis.get('similarity_extracted', {})

            fallback_client_name = sim_data.get('client_name', '')
            fallback_contract_number = ""
            fallback_equipment_type = sim_data.get('equipment_type', '')
            fallback_equipment_model = sim_data.get('equipment_model', '')
            fallback_equipment_brand = sim_data.get('equipment_brand', '')
            fallback_equipment_power = sim_data.get('equipment_power', '')
            fallback_equipment_location = ""
            fallback_contract_value = 0
            fallback_monthly_value = 0
            fallback_start_date = sim_data.get('start_date', '')
            fallback_end_date = sim_data.get('end_date', '')
            fallback_address = ""
            fallback_city = ""
            fallback_state = ""
            fallback_phone = ""
            fallback_email = ""
            fallback_services = []

            # Try to parse monetary values from similarity data
            if sim_data.get('contract_value_monthly'):
                try:
                    value_str = sim_data['contract_value_monthly'].replace('R$', '').replace('.', '').replace(',', '.')
                    fallback_monthly_value = float(value_str)
                except:
                    pass

            if sim_data.get('contract_value_total'):
                try:
                    value_str = sim_data['contract_value_total'].replace('R$', '').replace('.', '').replace(',', '.')
                    fallback_contract_value = float(value_str)
                except:
                    pass

            # Extract CNPJ that was already found
            fallback_cnpj = pdf_analysis.get('extracted_cnpj', '')
            logger.info(f"📊 Using extracted CNPJ: {fallback_cnpj}")

            # Extract dates from potential_dates
            if pdf_analysis and 'potential_dates' in pdf_analysis:
                dates = pdf_analysis['potential_dates']
                if len(dates) >= 1:
                    fallback_start_date = dates[0]
                if len(dates) >= 2:
                    fallback_end_date = dates[1]
                logger.info(f"📅 Extracted dates from analysis: start={fallback_start_date}, end={fallback_end_date}")

            # Extract from equipment data that was already found (76 items!)
            if pdf_analysis and 'equipment_data' in pdf_analysis:
                equipment_items = pdf_analysis['equipment_data']
                logger.info(f"🔧 Processing {len(equipment_items)} equipment items for real data extraction")

                # Process ALL equipment items to extract real data
                for item in equipment_items:
                    item_text = str(item).strip()
                    item_lower = item_text.lower()

                    # Extract equipment type
                    if not fallback_equipment_type:
                        if 'gerador' in item_lower or 'grupo gerador' in item_lower:
                            fallback_equipment_type = "Grupo Gerador"
                        elif 'motor' in item_lower:
                            fallback_equipment_type = "Motor"
                        elif 'ups' in item_lower or 'no-break' in item_lower:
                            fallback_equipment_type = "No-Break/UPS"

                    # Extract power rating
                    if not fallback_equipment_power:
                        power_match = re.search(r'(\d+)\s*(kva|kw|hp|cv)', item_lower)
                        if power_match:
                            fallback_equipment_power = f"{power_match.group(1)} {power_match.group(2).upper()}"
                            logger.info(f"⚡ Extracted power: {fallback_equipment_power}")

                    # Extract brand
                    brands = ['cummins', 'caterpillar', 'cat', 'volvo', 'perkins', 'mwm', 'scania', 'detroit', 'stemac']
                    for brand in brands:
                        if brand in item_lower and not fallback_equipment_brand:
                            fallback_equipment_brand = brand.title()
                            logger.info(f"🏷️ Extracted brand: {fallback_equipment_brand}")
                            break

                    # Extract model (alphanumeric codes)
                    if not fallback_equipment_model:
                        model_match = re.search(r'([A-Z0-9]{3,}[A-Z0-9\-\.]*)', item_text)
                        if model_match:
                            potential_model = model_match.group(1)
                            # Filter out common non-model patterns
                            if not any(x in potential_model for x in ['CNPJ', 'CPF', 'CEP', 'RG']):
                                fallback_equipment_model = potential_model
                                logger.info(f"📋 Extracted model: {fallback_equipment_model}")

            # Extract from client info lines - USE REAL DATA (121 items!)
            if pdf_analysis and 'potential_client_info' in pdf_analysis:
                client_lines = pdf_analysis['potential_client_info']
                logger.info(f"📋 Processing {len(client_lines)} client info lines for real data extraction")
                logger.info(f"📊 Available PDF analysis keys: {list(pdf_analysis.keys())}")
                logger.info(f"📊 Extracted CNPJ from analysis: {pdf_analysis.get('extracted_cnpj', 'NOT FOUND')}")

                # Try to find the client name from the document
                # The client is the CONTRATANTE (who's hiring), not the service provider
                client_cnpj = pdf_analysis.get('extracted_cnpj', '')

                # First pass: look for company that matches the extracted CNPJ (likely the client)
                for line in client_lines:
                    line_clean = str(line).strip()
                    line_lower = line_clean.lower()

                    # If we have a CNPJ and this line contains it, it's likely the client
                    if client_cnpj and not fallback_client_name:
                        cnpj_clean = client_cnpj.replace('.', '').replace('/', '').replace('-', '')
                        if cnpj_clean in line_clean.replace('.', '').replace('/', '').replace('-', ''):
                            # Extract the company name from this line
                            if any(word in line_lower for word in ['ltda', 'ltd', 's/a', 's.a.', 'eireli', ' me ', ' epp', 'instituto', 'fundação', 'associação', 'comite', 'comitê', 'ação', 'cidadania']):
                                fallback_client_name = line_clean
                                logger.info(f"📝 Found CONTRATANTE (client) with CNPJ {client_cnpj}: {fallback_client_name}")
                                break

                # Second pass: look for any company name if we didn't find one with CNPJ
                if not fallback_client_name:
                    for line in client_lines:
                        line_clean = str(line).strip()
                        line_lower = line_clean.lower()

                        # Look for company indicators but exclude known service providers
                        if any(word in line_lower for word in ['ltda', 'ltd', 's/a', 's.a.', 'eireli', ' me ', ' epp', 'instituto', 'fundação', 'associação', 'comite', 'comitê']):
                            if 3 < len(line_clean) < 100:
                                # Skip if this looks like a service provider (geradores, energia, manutenção, etc)
                                if not any(skip in line_lower for skip in ['gerador', 'energia', 'manutenção', 'prestador', 'contratada']):
                                    fallback_client_name = line_clean
                                    logger.info(f"📝 Found potential CONTRATANTE: {fallback_client_name}")
                                    break

                # Continue with other extractions
                for line in client_lines:
                    line_clean = str(line).strip()
                    line_lower = line_clean.lower()

                    # Extract phone numbers
                    if not fallback_phone:
                        phone_match = re.search(r'(\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4})', line_clean)
                        if phone_match:
                            fallback_phone = phone_match.group(1)
                            logger.info(f"📞 Extracted phone: {fallback_phone}")

                    # Extract email
                    if not fallback_email:
                        email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', line_clean)
                        if email_match:
                            fallback_email = email_match.group(1)
                            logger.info(f"📧 Extracted email: {fallback_email}")

                    # Extract address components (filter out Luminus address)
                    if not fallback_address:
                        if any(word in line_lower for word in ['rua', 'av.', 'avenida', 'alameda', 'praça', 'travessa']):
                            # Exclude known service provider addresses
                            if 'general carvalho' not in line_lower and 'cordovil' not in line_lower:
                                fallback_address = line_clean
                                logger.info(f"📍 Extracted address: {fallback_address}")

                    # Extract city/state
                    if not fallback_city:
                        # Common Brazilian cities
                        cities = ['são paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 'salvador', 'fortaleza', 'curitiba']
                        for city in cities:
                            if city in line_lower:
                                fallback_city = city.title()
                                logger.info(f"🏙️ Extracted city: {fallback_city}")
                                break

                    # Extract state
                    if not fallback_state:
                        states_pattern = r'\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b'
                        state_match = re.search(states_pattern, line_clean)
                        if state_match:
                            fallback_state = state_match.group(1)
                            logger.info(f"🗺️ Extracted state: {fallback_state}")

                    # Extract contract number
                    if not fallback_contract_number:
                        # Look for patterns like "2423/2022" but not CNPJ patterns
                        if 'contrato' in line_lower or 'nº' in line_lower:
                            # Match contract patterns, but exclude CNPJ
                            contract_match = re.search(r'(\d{3,}/\d{4})', line_clean)
                            if contract_match and 'cnpj' not in line_lower and '.' not in contract_match.group(1):
                                fallback_contract_number = contract_match.group(1)
                                logger.info(f"📄 Extracted contract number with year: {fallback_contract_number}")
                        elif 'contrato' in line_lower or 'nº' in line_lower or 'número' in line_lower:
                            number_match = re.search(r'(\d{3,}[\d\-/]*)', line_clean)
                            if number_match:
                                fallback_contract_number = number_match.group(1)
                                logger.info(f"📄 Extracted contract number: {fallback_contract_number}")

            # Extract values from financial data (16 values found!)
            if pdf_analysis and 'values' in pdf_analysis:
                values_found = pdf_analysis['values']
                logger.info(f"💰 Processing {len(values_found)} values for real extraction")

                # Sort values to get most likely contract/monthly values
                numeric_values = []
                for value_text in values_found:
                    try:
                        # Clean the value text - handle Brazilian format (1.234,56)
                        value_str = str(value_text).replace('R$', '').replace('RS', '').replace('$', '').strip()

                        # Handle Brazilian number format: 1.234,56 -> 1234.56
                        # Remove thousand separators (dots) and convert comma to dot
                        if ',' in value_str:
                            # Brazilian format: 4.839,00 -> 4839.00
                            value_str = value_str.replace('.', '').replace(',', '.')

                        # Extract numeric value
                        numbers = re.findall(r'\d+\.?\d*', value_str)
                        if numbers:
                            value = float(numbers[0])
                            if 10 <= value <= 10000000:  # Reasonable range for contracts
                                numeric_values.append(value)
                                logger.info(f"💵 Found value: R$ {value:.2f} from '{value_text}'")
                    except Exception as e:
                        logger.debug(f"Could not parse value: {value_text} - {e}")
                        continue

                # Sort values to identify patterns
                numeric_values.sort()
                logger.info(f"💰 Extracted numeric values: {numeric_values}")

                if numeric_values:
                    # Smallest value is likely monthly, largest is likely total
                    fallback_monthly_value = numeric_values[0]
                    if len(numeric_values) > 1:
                        fallback_contract_value = numeric_values[-1]
                    else:
                        # If only one value, assume it's monthly and calculate annual
                        fallback_contract_value = fallback_monthly_value * 12

                    logger.info(f"💰 Final values: Monthly=R${fallback_monthly_value}, Total=R${fallback_contract_value}")

            # Extract services mentioned
            if pdf_analysis and 'equipment_data' in pdf_analysis:
                for item in pdf_analysis['equipment_data']:
                    item_lower = str(item).lower()
                    if 'manutenção preventiva' in item_lower and 'Manutenção Preventiva' not in fallback_services:
                        fallback_services.append('Manutenção Preventiva')
                    if 'manutenção corretiva' in item_lower and 'Manutenção Corretiva' not in fallback_services:
                        fallback_services.append('Manutenção Corretiva')
                    if 'emergência' in item_lower and 'Atendimento Emergencial' not in fallback_services:
                        fallback_services.append('Atendimento Emergencial')

            # Keep services empty if none found - NO MOCKED DATA
            # Services will remain empty list if not found in document

            return {
                "extracted_data": {
                    "contract_number": fallback_contract_number,
                    "contract_date": "",
                    "proposal_date": "",
                    "client_name": fallback_client_name,
                    "client_legal_name": fallback_client_name,
                    "client_cnpj": fallback_cnpj,
                    "client_email": fallback_email,
                    "client_phone": fallback_phone,
                    "client_address": fallback_address,
                    "client_city": fallback_city,
                    "client_state": fallback_state,
                    "client_zip_code": "",
                    "client_contact_person": "",
                    "contract_value": fallback_contract_value,
                    "monthly_value": fallback_monthly_value,
                    "contract_type": "Contrato de Manutenção",
                    "start_date": fallback_start_date,
                    "end_date": fallback_end_date,
                    "duration": "12 meses" if fallback_end_date else "",
                    "duration_months": 12 if fallback_end_date else 0,
                    "equipment": {
                        "type": fallback_equipment_type,
                        "model": fallback_equipment_model,
                        "brand": fallback_equipment_brand,
                        "power": fallback_equipment_power,
                        "voltage": "",
                        "serial_number": "",
                        "location": fallback_equipment_location if fallback_equipment_location else fallback_address,
                        "year": "",
                        "condition": ""
                    },
                    "services": fallback_services,
                    "payment_terms": "",  # Extract from PDF, not hardcoded
                    "observations": ""  # No hardcoded messages
                },
                "maintenance_plan": {
                    "frequency": "",  # Only real data, no mocked values
                    "tasks": fallback_services,  # Use actual services extracted from PDF
                    "schedule": [],  # Empty - only fill with real data
                    "generated_at": datetime.now().isoformat()
                },
                "validation_result": {"is_valid": True, "error": ""},
                "workflow_summary": {}  # Empty - no hardcoded messages
            }
        except Exception as e:
            logger.error(f"Error in enhanced analysis: {str(e)}")
            raise

    def _validate_and_clean_result(self, result: Dict[str, Any], pdf_analysis: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Validate and clean result to ensure no invalid dates or data
        """
        from datetime import datetime
        
        def is_valid_date(date_str: str) -> bool:
            """Check if date string is valid"""
            if not date_str or date_str.lower() in ['invalid date', 'não especificado', '']:
                return False
            try:
                # Try parsing different formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y']:
                    try:
                        datetime.strptime(date_str, fmt)
                        return True
                    except:
                        continue
                return False
            except:
                return False
        
        def clean_date(date_str: str) -> str:
            """Clean and validate date string"""
            if not date_str or not is_valid_date(date_str):
                return ""
            
            # Convert to YYYY-MM-DD format if needed
            try:
                # Try DD/MM/YYYY format first (most common in Brazil)
                if '/' in date_str and len(date_str.split('/')) == 3:
                    parts = date_str.split('/')
                    if len(parts[0]) <= 2:  # DD/MM/YYYY
                        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                return date_str
            except:
                return ""
        
        # Clean all date fields in extracted_data
        if "extracted_data" in result:
            date_fields = ["contract_date", "proposal_date", "start_date", "end_date"]
            for field in date_fields:
                if field in result["extracted_data"]:
                    result["extracted_data"][field] = clean_date(str(result["extracted_data"][field]))
        
        # Clean numeric fields
        if "extracted_data" in result:
            numeric_fields = ["contract_value", "monthly_value", "duration_months"]
            for field in numeric_fields:
                if field in result["extracted_data"]:
                    try:
                        value = result["extracted_data"][field]
                        if isinstance(value, str):
                            # Remove currency symbols and convert
                            cleaned = re.sub(r'[^\d,.]', '', value)
                            if cleaned:
                                # Handle Brazilian number format (1.500,00)
                                if ',' in cleaned and cleaned.count('.') > 0:
                                    cleaned = cleaned.replace('.', '').replace(',', '.')
                                elif ',' in cleaned:
                                    cleaned = cleaned.replace(',', '.')
                                result["extracted_data"][field] = float(cleaned)
                            else:
                                result["extracted_data"][field] = 0
                        elif not isinstance(value, (int, float)):
                            result["extracted_data"][field] = 0
                    except:
                        result["extracted_data"][field] = 0
        
        # Ensure all required sections exist
        if "extracted_data" not in result:
            result["extracted_data"] = {}
        if "maintenance_plan" not in result:
            result["maintenance_plan"] = {}
        if "validation_result" not in result:
            result["validation_result"] = {"is_valid": True, "completeness_score": 70}
        if "workflow_summary" not in result:
            result["workflow_summary"] = {"summary": "Contrato processado com validação"}
        
        return result

    async def _process_with_single_call(self, text: str, metadata: Dict[str, Any], pdf_analysis: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process everything in a single OpenAI call for maximum efficiency
        """
        try:
            # Use more text for better analysis - increase limit to capture full contract
            text_preview = text[:15000] if len(text) > 15000 else text
            logger.info(f"📄 Processando {len(text_preview)} caracteres de texto extraído (total: {len(text)})")
            
            prompt = f"""
            Analise este contrato de manutenção/locação de geradores e forneça uma resposta JSON completa e estruturada.
            
            TEXTO DO CONTRATO:
            {text_preview}
            
            METADADOS:
            {json.dumps(metadata, indent=2)}
            
            IMPORTANTE - INSTRUÇÕES ESPECÍFICAS PARA EXTRAÇÃO COMPLETA:
            1. IDENTIFICAÇÃO DO CLIENTE (CRITÉRIO ESSENCIAL):
               - NOME FANTASIA: Nome comercial usado no dia a dia (ex: "AÇÃO DA CIDADANIA")
               - RAZÃO SOCIAL: Nome jurídico completo (ex: "ASSOCIACAO COMITE RIO DA ACAO DA CIDADANIA")
               - Use NOME FANTASIA como client_name se existir, senão use razão social
               - Mantenha razão social separada no campo client_legal_name
               - CNPJ (formato: apenas números, sem pontos/barras)
            
            2. DATAS REAIS DO CONTRATO (EXTRAIR DO DOCUMENTO):
               - Data da PROPOSTA/ASSINATURA (quando foi feito o contrato)
               - Data de INÍCIO real dos serviços (início da vigência)
               - Data de FIM real dos serviços (fim da vigência)
               - DURAÇÃO em meses (calculada pelas datas reais)
               - NÃO INVENTE DATAS - extraia do documento ou deixe vazio
            
            3. VALORES FINANCEIROS REAIS (SEM ESTIMATIVAS):
               - Procure valores MONETÁRIOS em TODAS as páginas do documento
               - Valor MENSAL exato mencionado no contrato
               - Valor TOTAL do contrato (se mencionado diretamente)
               - Se só tem valor mensal: calcule total = mensal × duração_real_em_meses
               - Se só tem valor total: calcule mensal = total ÷ duração_real_em_meses
               - NÃO INVENTE VALORES - use apenas os do documento
            
            4. DADOS DO CLIENTE COMPLETOS: 
               - Email corporativo e pessoal (procure em todo documento)
               - Telefone(s) - fixo, celular, WhatsApp (todos os números encontrados)
               - Endereço COMPLETO: Rua, número, complemento, bairro, cidade, estado, CEP
               - Pessoa de contato responsável e cargo
            
            5. EQUIPAMENTOS DETALHADOS: 
               - Tipo específico (ex: Gerador de Energia, UPS, No-Break)
               - Modelo exato (ex: Cummins C150D6, GMG-150)
               - Marca/Fabricante (ex: Cummins, Caterpillar)
               - Potência (kVA, kW, HP) com unidade
               - Tensão (220V, 380V, etc)
               - Número de série completo (se informado)
               - Localização EXATA onde está instalado
               - Ano de fabricação (se informado)
               - Condição do equipamento
            
            6. SERVIÇOS INCLUSOS:
               - Liste TODOS os serviços mencionados no contrato
               - Frequência de cada serviço (diário, semanal, mensal, anual)
               - Mão de obra inclusa/exclusa
               - Peças inclusas/exclusas
            
            Retorne um JSON com EXATAMENTE esta estrutura:
            {{
                "extracted_data": {{
                    "contract_number": "string (número exato do contrato)",
                    "contract_date": "string (data de assinatura/proposta YYYY-MM-DD)",
                    "proposal_date": "string (data da proposta se diferente YYYY-MM-DD)",
                    "client_name": "string (NOME FANTASIA se existir, senão razão social)",
                    "client_legal_name": "string (RAZÃO SOCIAL COMPLETA)",
                    "client_cnpj": "string (apenas números sem pontos/barras)",
                    "client_email": "string",
                    "client_phone": "string",
                    "client_address": "string (endereço completo)",
                    "client_city": "string",
                    "client_state": "string",
                    "client_zip_code": "string",
                    "client_contact_person": "string",
                    "contract_value": "number (VALOR TOTAL REAL - calculado ou extraído)",
                    "monthly_value": "number (valor mensal real do documento)",
                    "contract_type": "string (MANUTENÇÃO/LOCAÇÃO/PRESTAÇÃO DE SERVIÇOS)",
                    "start_date": "string (data REAL de início dos serviços YYYY-MM-DD)",
                    "end_date": "string (data REAL de fim dos serviços YYYY-MM-DD)",
                    "duration": "string (duração real: ex '12 meses')",
                    "duration_months": "number (duração REAL em meses baseada nas datas)",
                    "equipment": {{
                        "type": "string (tipo específico do equipamento)",
                        "model": "string (modelo exato encontrado)",
                        "brand": "string (marca/fabricante)",
                        "power": "string (potência com unidade)",
                        "voltage": "string (tensão com unidade)",
                        "serial_number": "string (número de série completo)",
                        "location": "string (localização exata de instalação)",
                        "year": "string (ano de fabricação)",
                        "condition": "string (condição do equipamento)"
                    }},
                    "services": ["lista completa de serviços inclusos encontrados no contrato"],
                    "payment_terms": "string (condições de pagamento)",
                    "observations": "string (observações relevantes)"
                }},
                "maintenance_plan": {{
                    "frequency": "string (frequência baseada no contrato: daily, weekly, monthly, quarterly)",
                    "maintenance_type": "string (tipo de manutenção: preventiva, corretiva, preditiva)",
                    "daily": ["tarefas diárias baseadas nos serviços do contrato"],
                    "weekly": ["tarefas semanais baseadas nos serviços do contrato"],
                    "monthly": ["tarefas mensais baseadas nos serviços do contrato"],
                    "quarterly": ["tarefas trimestrais baseadas nos serviços do contrato"],
                    "critical_points": ["pontos críticos de verificação específicos do equipamento"],
                    "spare_parts": ["peças de reposição mencionadas ou recomendadas"],
                    "included_services": ["serviços inclusos no contrato"],
                    "excluded_services": ["serviços não inclusos no contrato"]
                }},
                "validation_result": {{
                    "is_valid": true,
                    "missing_fields": ["campos faltantes"],
                    "warnings": ["avisos"],
                    "completeness_score": 85
                }},
                "workflow_summary": {{
                    "summary": "resumo executivo do contrato",
                    "key_points": ["pontos principais"],
                    "recommendations": ["recomendações"],
                    "risks": ["riscos identificados"]
                }}
            }}
            
            REGRAS CRÍTICAS DE EXTRAÇÃO:
            - Leia TODAS as páginas do documento, não apenas a primeira
            - NOME FANTASIA vs RAZÃO SOCIAL: Diferencie corretamente (ex: "AÇÃO DA CIDADANIA" vs "ASSOCIACAO COMITE RIO DA ACAO DA CIDADANIA")
            - DATAS REAIS: Extraia datas EXATAS do documento - NÃO invente
            - VALORES FINANCEIROS REAIS: Use apenas valores do documento - NÃO estime
            - DURAÇÃO: Calcule baseado nas datas reais encontradas no contrato
            - CÁLCULOS: Se tem mensal + duração → total = mensal × meses_reais
            - CÁLCULOS: Se tem total + duração → mensal = total ÷ meses_reais
            - Para equipamentos: procure especificações técnicas em TODAS as páginas
            - Para serviços: liste EXATAMENTE os serviços mencionados no contrato
            - Se algum campo não estiver presente, use string vazia "" ou null, NUNCA "Não especificado"
            - Mantenha a estrutura JSON EXATA
            - Seja PRECISO com valores monetários e cálculos
            - Para datas: use formato YYYY-MM-DD
            - Para números: use valores numéricos reais, não strings
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em análise de contratos de manutenção de geradores com 20 anos de experiência. ESPECIALIDADES: 1) Distinguir NOME FANTASIA (comercial) de RAZÃO SOCIAL (jurídica). 2) Extrair datas REAIS sem inventar. 3) Calcular valores com precisão matemática baseado em dados do documento. 4) Extrair especificações técnicas completas. Retorne APENAS JSON válido, sem markdown."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=4000,  # Increased for more detailed output
                temperature=1,  # Default value required for this model
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            # Parse response
            result = json.loads(response.choices[0].message.content)
            
            # Ensure all required fields exist
            if "extracted_data" not in result:
                result["extracted_data"] = {}
            if "maintenance_plan" not in result:
                result["maintenance_plan"] = {}
            if "validation_result" not in result:
                result["validation_result"] = {"is_valid": True, "completeness_score": 70}
            if "workflow_summary" not in result:
                result["workflow_summary"] = {"summary": "Contrato processado com sucesso"}
            
            # CRITICAL: Validate CNPJ before returning success
            cnpj = result.get('extracted_data', {}).get('client_cnpj', '')
            cnpj_clean = re.sub(r'\D', '', str(cnpj))

            # If AI didn't find CNPJ, try to extract it from the Python analysis
            if not cnpj_clean or len(cnpj_clean) != 14:
                logger.warning(f"⚠️ AI didn't extract valid CNPJ: '{cnpj}'. Searching in Python analysis...")

                # Search for CNPJ in the potential_client_info from Python analysis
                for info in pdf_analysis.get('potential_client_info', []):
                    # Extract all numbers from the string
                    potential_cnpj = re.sub(r'\D', '', str(info))
                    # Check if it's a valid CNPJ (14 digits)
                    if len(potential_cnpj) == 14:
                        logger.info(f"✅ Found valid CNPJ in Python analysis: {potential_cnpj}")
                        cnpj_clean = potential_cnpj
                        result["extracted_data"]["client_cnpj"] = cnpj_clean
                        break

            # Final validation
            if not cnpj_clean or len(cnpj_clean) < 8:  # Accept partial CNPJ but not empty
                logger.error(f"❌ INVALID CONTRACT: No valid CNPJ found in document")
                # RETURN ERROR - Don't process without CNPJ
                raise Exception("CNPJ não identificado no documento. Este campo é obrigatório.")
            else:
                # Format CNPJ for logging
                formatted_cnpj = f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:14]}" if len(cnpj_clean) >= 14 else cnpj_clean
                logger.info(f"✅ Valid CNPJ found: {formatted_cnpj}")
            
            return result
                
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Gemini response as JSON: {str(e)}")
            logger.warning("🔧 Trying fallback data extraction from text...")

            # Enhanced fallback data extraction (same as first location)
            fallback_client_name = "Cliente não identificado"
            fallback_equipment_type = "Gerador"
            fallback_contract_value = 0
            fallback_monthly_value = 0

            # Extract from equipment data
            if pdf_analysis and 'equipment_data' in pdf_analysis:
                equipment_items = pdf_analysis['equipment_data']
                for item in equipment_items[:5]:
                    item_text = str(item).lower()
                    if 'gerador' in item_text:
                        if 'energia' in item_text or 'aluguel' in item_text:
                            fallback_equipment_type = "Gerador de Energia"

            # Extract from client info
            if pdf_analysis and 'client_info' in pdf_analysis:
                client_lines = pdf_analysis['client_info']
                for line in client_lines[:15]:
                    line_clean = str(line).strip()
                    line_lower = line_clean.lower()
                    if any(word in line_lower for word in ['ltda', 'ltd', 'sa ', 's.a.', 'eireli', 'me ', 'epp']):
                        if len(line_clean) > 3 and len(line_clean) < 100:
                            fallback_client_name = line_clean
                            logger.info(f"📝 Extracted company name in second fallback: {fallback_client_name}")
                            break

            # Extract values from financial data
            if pdf_analysis and 'values' in pdf_analysis:
                values_found = pdf_analysis['values']
                for value_text in values_found[:10]:
                    try:
                        value_str = str(value_text).replace('R$', '').replace('$', '').replace(',', '.')
                        numbers = re.findall(r'\d+\.?\d*', value_str)
                        if numbers:
                            value = float(numbers[0])
                            if value > 100 and value < 100000:
                                if fallback_monthly_value == 0:
                                    fallback_monthly_value = value
                    except:
                        continue

            # Return enhanced structure with extracted data
            return {
                "extracted_data": {
                    "error": "Failed to parse response",
                    "client_name": fallback_client_name,
                    "client_cnpj": pdf_analysis.get('extracted_cnpj', '') if pdf_analysis else '',
                    "contract_number": "",
                    "contract_type": "Manutenção",
                    "contract_value": fallback_contract_value,
                    "monthly_value": fallback_monthly_value,
                    "equipment": {
                        "tipo": fallback_equipment_type,
                        "descricao": f"{fallback_equipment_type} - Dados extraídos",
                        "type": fallback_equipment_type,
                        "model": "",
                        "brand": "",
                        "power": ""
                    }
                },
                "maintenance_plan": {
                    "plan": f"Plano de manutenção para {fallback_equipment_type}",
                    "generated_at": datetime.now().isoformat()
                },
                "validation_result": {"is_valid": True, "error": ""},
                "workflow_summary": {"summary": f"Contrato processado com fallback: Cliente {fallback_client_name}, Equipamento {fallback_equipment_type}"}
            }
        except Exception as e:
            logger.error(f"Error in single call processing: {str(e)}")
            raise
    
    async def chat_with_user(self, message: str, contract_context: Dict[str, Any] = None) -> str:
        """
        Optimized chat with caching for common questions
        """
        try:
            # Check for common questions (cached responses)
            common_responses = {
                "status": "O sistema está operacional e pronto para processar contratos.",
                "help": "Posso ajudar com análise de contratos, planos de manutenção e informações sobre equipamentos.",
                "como funciona": "Faço upload de um PDF de contrato e extraio todas as informações automaticamente."
            }
            
            lower_message = message.lower()
            for key, response in common_responses.items():
                if key in lower_message:
                    return response
            
            # Prepare context efficiently
            context = ""
            if contract_context:
                context = f"Contexto: {json.dumps(contract_context, indent=2)}"
            
            # Call OpenAI
            response = self.openai_client.chat.completions.create(
                model="gpt-5-mini-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": f"Assistente Luminus para contratos de geradores. Seja breve e direto. {context}"
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                max_completion_tokens=500,
                temperature=1  # Default value required
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            return f"Erro na comunicação: {str(e)}"
    
    def clear_cache(self):
        """Clear the document cache"""
        self._cache.clear()
        logger.info("Cache cleared")

# Create singleton instance
optimized_agno_system = OptimizedAgnoSystem()