from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
from typing import Dict, Any, Optional, AsyncGenerator, Tuple, List
import time
import base64
import os
import jwt
import math
import asyncio
import json
import uuid
from google import genai
from google.genai import types

# Configure logging first
from config import Config
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Configure timezone (must be before other imports that use datetime)
import os
os.environ.setdefault('TZ', 'America/Sao_Paulo')
try:
    import time
    time.tzset()  # Aplicar timezone no sistema operacional
    logger.info(f"✅ Sistema timezone configurado: {os.getenv('TZ')}")
except Exception as tz_error:
    logger.warning(f"⚠️ Falha ao configurar timezone do sistema: {tz_error}")

# Import timezone configuration
from timezone_config import get_timezone_info

# Log timezone info
tz_info = get_timezone_info()
logger.info(
    f"🌍 Backend Timezone: {tz_info['name']} "
    f"({tz_info['timezone']}, UTC{tz_info['offset']:+d})"
)

# Import configuration and systems
from agno_system_optimized import optimized_agno_system as luminus_agno_system
from utils.pdf_extractor import PDFExtractor
from agno_agents.document_generators import DocumentGeneratorFactory, ContractDocument
from utils.business_days import adjust_to_business_day, is_business_day
from datetime import datetime, date, timedelta
from datetime import time as datetime_time

# Import Database layer (Direct PostgreSQL)
try:
    from database import get_db
    from auth import create_access_token, authenticate_user, create_user, get_user_by_id, ACCESS_TOKEN_EXPIRE_MINUTES
    database_available = True
    logger.info("✅ Direct PostgreSQL database module loaded successfully")
except ImportError as e:
    logger.error(f"Database module not available: {e}")
    database_available = False


# Define tags for organizing endpoints in Swagger
tags_metadata = [
    {
        "name": "auth",
        "description": "Autenticação e gerenciamento de usuários",
        "externalDocs": {
            "description": "Docs externos",
            "url": "https://luminus.trustyu.com.br/docs/auth",
        },
    },
    {
        "name": "contracts",
        "description": "Operações com contratos"
    },
    {
        "name": "maintenances",
        "description": "Operações com manutenções"
    },
    {
        "name": "clients",
        "description": "Operações com clientes"
    },
    {
        "name": "pdf",
        "description": "Processamento e análise de PDFs"
    },
    {
        "name": "ai-agents",
        "description": "Agentes AI e geração de documentos"
    },
    {
        "name": "chat",
        "description": "Chat AI e assistência inteligente"
    },
    {
        "name": "dashboard",
        "description": "Métricas e análises do dashboard"
    },
    {
        "name": "health",
        "description": "Status e saúde do sistema"
    },
    {
        "name": "admin",
        "description": "Funções administrativas"
    }
]

app = FastAPI(
    title="Luminus AI Hub API",
    description="""
    🚀 **Luminus AI Hub Backend API**
    
    Sistema inteligente de gestão de contratos e manutenções com análise AI.
    
    ## Recursos Principais
    
    * 📄 **Processamento de PDF** - Extração inteligente de dados de contratos
    * 🤖 **Agentes AI** - Sistema Agno com múltiplos agentes especializados
    * 📊 **Dashboard** - Métricas e análises em tempo real
    * 🔐 **Autenticação** - Sistema seguro com JWT
    * 🗃️ **Gestão de Dados** - CRUD completo para contratos, clientes e manutenções
    * 💬 **Chat AI** - Assistente inteligente para análise de contratos
    
    ## Ambientes
    
    * **Desenvolvimento**: http://localhost:8000
    * **Produção**: https://luminus-ai-hub-back-production.up.railway.app
    
    ## Autenticação
    
    Use o endpoint `/api/auth/signin` para obter um token JWT.
    Inclua o token no header: `Authorization: Bearer <token>`
    """,
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    contact={
        "name": "Luminus AI Hub Support",
        "email": "support@luminus.ai",
        "url": "https://luminus.trustyu.com.br"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
)

# Security scheme for JWT
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here-change-in-production")

# Simple auth verification for development
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """JWT token verification - supports both Supabase and local JWT"""
    token = credentials.credentials

    try:
        # First try to decode Supabase JWT without verification for development
        if token.startswith("eyJ"):  # JWT format
            # Decode without verification to get user data from Supabase JWT
            decoded = jwt.decode(token, options={"verify_signature": False})

            # Extract user info from Supabase JWT
            user_id = decoded.get("sub")
            email = decoded.get("email")

            if user_id and email:
                logger.info(f"JWT decoded successfully - user_id: {user_id}, email: {email}")
                return {
                    "sub": str(user_id),
                    "id": str(user_id),
                    "email": email
                }
            else:
                logger.error(f"Invalid JWT payload: {decoded}")
                raise HTTPException(status_code=401, detail="Invalid token payload")

    except Exception as e:
        logger.error(f"JWT decode error: {e}")
        # Fallback: try to validate with local secret
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return decoded
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

# Optional auth dependency
def get_current_user_optional(request: Request) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
        # No mock users allowed - require real authentication
        # Token validation will be done below
        
        try:
            # Validate JWT token with actual secret
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return decoded
        except jwt.InvalidTokenError:
            return None
    return None

# CORS configuration from Config (reads from CORS_ORIGINS env var)
logger.info(f"🌐 CORS Origins: {Config.CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Explicit OPTIONS handler to ensure preflight works
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    """Handle OPTIONS requests explicitly for CORS preflight"""
    return JSONResponse(
        content={},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Helper function for timeout-aware processing
async def process_with_timeout(coro, timeout_ms: int):
    """Process coroutine with configurable timeout"""
    try:
        timeout_seconds = timeout_ms / 1000.0
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.error(f"Operation timed out after {timeout_seconds} seconds")
        raise HTTPException(
            status_code=408,
            detail={
                "error": "Request timeout",
                "timeout_seconds": timeout_seconds,
                "message": f"Operation exceeded {timeout_seconds}s timeout limit"
            }
        )


def _normalize_date_input(value: Any) -> Optional[date]:
    """Normalize different representations of date into a date object."""
    if value is None:
        return None

    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None

        iso_candidate = candidate[:-1] + '+00:00' if candidate.endswith('Z') else candidate
        try:
            return datetime.fromisoformat(iso_candidate).date()
        except ValueError:
            pass

        if 'T' in candidate:
            candidate = candidate.split('T')[0]
        if ' ' in candidate:
            candidate = candidate.split(' ')[0]

        for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue

    return None


def _normalize_time_input(value: Any) -> Optional[datetime_time]:
    """Normalize different representations of time into a time object."""
    if value is None:
        return None

    if isinstance(value, datetime_time):
        return value

    if isinstance(value, datetime):
        return value.time()

    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None

        # Remove timezone offsets or fractional seconds if present
        if '+' in candidate:
            candidate = candidate.split('+')[0]
        if '-' in candidate and candidate.count(':') == 2 and candidate.index('-') > candidate.index(':'):
            candidate = candidate.split('-')[0]
        if '.' in candidate:
            candidate = candidate.split('.')[0]

        parts = candidate.split(':')
        try:
            if len(parts) >= 2:
                hours = int(parts[0])
                minutes = int(parts[1])
                seconds = int(parts[2]) if len(parts) > 2 else 0
                return datetime_time(hour=hours, minute=minutes, second=seconds)
        except (ValueError, TypeError):
            return None

    return None


def _combine_schedule(date_obj: Optional[date], time_obj: Optional[datetime_time]) -> Optional[datetime]:
    if not date_obj:
        return None
    return datetime.combine(date_obj, time_obj or datetime_time.min)


def _lookup_status_id(db, candidates: List[str]) -> Optional[str]:
    """Resolve a maintenance_status ID from potential names/descriptions."""
    if not candidates:
        return None

    normalized: List[str] = []
    for term in candidates:
        if not term:
            continue
        lowered = term.strip().lower()
        if lowered and lowered not in normalized:
            normalized.append(lowered)

    if not normalized:
        return None

    placeholders = ', '.join(['%s'] * len(normalized))
    query = f"""
        SELECT id
        FROM maintenance_status
        WHERE LOWER(name) IN ({placeholders})
           OR LOWER(description) IN ({placeholders})
        LIMIT 1
    """

    result = db.execute_query(query, tuple(normalized + normalized))
    if result:
        return result[0].get('id')
    return None


def _map_status_candidate(candidate: Optional[str]) -> Tuple[Optional[str], Optional[str], List[str]]:
    if not candidate:
        return None, None, []

    normalized = candidate.strip().lower()

    if normalized in {'pending', 'scheduled', 'agendado', 'agendada', 'pendente'}:
        return 'scheduled', 'pending', ['scheduled', 'pending', 'agendado', 'agendada', 'pendente']
    if normalized in {'overdue', 'atrasado', 'atrasada', 'em atraso', 'late'}:
        return 'overdue', 'overdue', ['overdue', 'atrasado', 'atrasada']
    if normalized in {'in_progress', 'executing', 'executando', 'em andamento', 'andamento', 'em execucao', 'em execução'}:
        return 'in_progress', 'in_progress', ['in_progress', 'executing', 'executando', 'em andamento', 'andamento', 'em execucao', 'em execução']
    if normalized in {'completed', 'concluido', 'concluida', 'finalizado', 'finalizada', 'concluído', 'concluída'}:
        return 'completed', 'completed', ['completed', 'concluido', 'concluida', 'concluído', 'concluída', 'finalizado', 'finalizada']
    if normalized in {'cancelled', 'canceled', 'cancelado', 'cancelada'}:
        return 'cancelled', 'cancelled', ['cancelled', 'canceled', 'cancelado', 'cancelada']

    return normalized, normalized, [normalized]


def _normalize_status_payload(db, payload: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    status_value = payload.get('status')
    status_id = payload.get('status_id')

    candidate = None
    if isinstance(status_value, str):
        candidate = status_value
    elif status_value is not None:
        candidate = str(status_value)

    if not candidate and status_id:
        rows = db.execute_query(
            "SELECT name, description FROM maintenance_status WHERE id = %s LIMIT 1",
            (status_id,)
        )
        if rows:
            record = rows[0]
            candidate = record.get('name') or record.get('description')

    storage_slug, validation_slug, lookup_terms = _map_status_candidate(candidate)

    if storage_slug:
        payload['status'] = storage_slug

    if storage_slug and not payload.get('status_id'):
        resolved_id = _lookup_status_id(db, lookup_terms)
        if resolved_id:
            payload['status_id'] = resolved_id

    return storage_slug, validation_slug


def _fetch_existing_schedule(db, maintenance_id: str) -> Tuple[Optional[date], Optional[datetime_time]]:
    rows = db.execute_query(
        "SELECT scheduled_date, scheduled_time FROM maintenances WHERE id = %s LIMIT 1",
        (maintenance_id,)
    )
    if not rows:
        return None, None

    record = rows[0]
    return (
        _normalize_date_input(record.get('scheduled_date')),
        _normalize_time_input(record.get('scheduled_time')),
    )

# Progress tracking system for SSE
progress_streams = {}

class ProgressTracker:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.progress = 0
        self.status = "starting"
        self.message = "Iniciando processamento..."
        self.details = {}
        self.completed = False
        self.error = None

    def update(self, progress: int, status: str, message: str, details: Dict = None):
        """Update progress information"""
        self.progress = progress
        self.status = status
        self.message = message
        self.details = details or {}

    def set_completed(self, success: bool, final_message: str, result_data: Dict = None):
        """Mark as completed"""
        self.completed = True
        self.progress = 100 if success else self.progress
        self.status = "completed" if success else "failed"
        self.message = final_message
        self.details = result_data or {}

    def set_error(self, error_message: str, error_details: Dict = None):
        """Set error state"""
        self.completed = True
        self.error = error_message
        self.status = "error"
        self.message = error_message
        self.details = error_details or {}

async def generate_progress_stream(session_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE stream for progress updates"""
    tracker = progress_streams.get(session_id)
    if not tracker:
        yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
        return

    try:
        while not tracker.completed and not tracker.error:
            progress_data = {
                "session_id": session_id,
                "progress": tracker.progress,
                "status": tracker.status,
                "message": tracker.message,
                "details": tracker.details,
                "timestamp": time.time()
            }

            yield f"data: {json.dumps(progress_data)}\n\n"

            # Wait before next update
            await asyncio.sleep(1)

        # Send final update
        final_data = {
            "session_id": session_id,
            "progress": tracker.progress,
            "status": tracker.status,
            "message": tracker.message,
            "details": tracker.details,
            "completed": tracker.completed,
            "error": tracker.error,
            "timestamp": time.time()
        }

        yield f"data: {json.dumps(final_data)}\n\n"

    except asyncio.CancelledError:
        logger.info(f"SSE connection cancelled for session {session_id}")
    finally:
        # Clean up session after streaming
        if session_id in progress_streams:
            del progress_streams[session_id]

def _prepare_contract_data_for_save(extracted_data: Dict[str, Any], extracted_text: str = None, extraction_method: str = None, db = None, user_id: str = None) -> Dict[str, Any]:
    """
    Prepare extracted data for database save with all fields properly mapped
    Including full OCR text for searchability
    Handles CNPJ-based client lookup and client_users relationship creation
    """
    contract_data = {}

    # Extract client data for lookup/creation
    client_data_from_pdf = {
        'name': extracted_data.get('client_name') or extracted_data.get('client_legal_name'),
        'cnpj': extracted_data.get('client_cnpj'),
        'email': extracted_data.get('client_email'),
        'phone': extracted_data.get('client_phone'),
        'address': extracted_data.get('client_address'),
        'city': extracted_data.get('client_city'),
        'state': extracted_data.get('client_state'),
        'zip_code': extracted_data.get('client_zip_code'),
        'contact_person': extracted_data.get('client_contact_person')
    }

    # CNPJ-based client lookup and creation
    client_id = None
    if db and user_id and client_data_from_pdf.get('cnpj'):
        try:
            cnpj = client_data_from_pdf['cnpj']
            logger.info(f"🔍 [CLIENT LOOKUP] Searching for existing client with CNPJ: {cnpj}")

            # Step 1: Check if client exists by CNPJ (without user_id filter for multi-tenant)
            existing_client = db.find_client_by_cnpj(cnpj, user_id=None)

            if existing_client:
                client_id = existing_client['id']
                logger.info(f"✅ [CLIENT LOOKUP] Found existing client: {existing_client.get('name')} (ID: {client_id})")

                # Step 2: Create client_users relationship for current user
                relationship = db.create_client_user_relationship(client_id, user_id, role='owner')
                if relationship:
                    logger.info(f"✅ [CLIENT RELATIONSHIP] Created/verified client_users relationship")
                else:
                    logger.warning(f"⚠️ [CLIENT RELATIONSHIP] Could not create client_users relationship")
            else:
                # Step 3: Client not found, create new one
                logger.info(f"🆕 [CLIENT CREATE] No existing client found, creating new client")

                # Only create if we have at least a name and CNPJ
                if client_data_from_pdf.get('name') and client_data_from_pdf.get('cnpj'):
                    new_client = db.create_client(client_data_from_pdf, user_id=user_id)

                    if new_client:
                        client_id = new_client['id']
                        logger.info(f"✅ [CLIENT CREATE] Created new client: {new_client.get('name')} (ID: {client_id})")

                        # Step 4: Create client_users relationship for the new client
                        relationship = db.create_client_user_relationship(client_id, user_id, role='owner')
                        if relationship:
                            logger.info(f"✅ [CLIENT RELATIONSHIP] Created client_users relationship for new client")
                        else:
                            logger.error(f"❌ [CLIENT RELATIONSHIP] Failed to create relationship, deleting client")
                            # Rollback: delete the newly created client
                            db.delete_client(client_id)
                            client_id = None
                    else:
                        logger.error(f"❌ [CLIENT CREATE] Failed to create client")
                else:
                    logger.warning(f"⚠️ [CLIENT CREATE] Cannot create client: missing name or CNPJ")

        except Exception as e:
            logger.error(f"❌ [CLIENT PROCESSING] Error during client lookup/creation: {e}")
            client_id = None

    # Direct field mapping (excluding client fields if we have client_id)
    field_mapping = {
        'contract_number': 'contract_number',
        'contract_date': 'contract_date',
        'proposal_date': 'proposal_date',
        'contract_value': 'value',
        'monthly_value': 'monthly_value',
        'contract_type': 'contract_type',
        'start_date': 'start_date',
        'end_date': 'end_date',
        'duration': 'duration',
        'duration_months': 'duration_months',
        'payment_terms': 'payment_terms',
        'technical_notes': 'technical_notes',
        'special_conditions': 'special_conditions',
        'warranty_terms': 'warranty_terms',
        'observations': 'observations'
    }

    # If we successfully created/found a client, use client_id
    # Otherwise, fall back to storing client fields directly in contract (legacy)
    if client_id:
        contract_data['client_id'] = client_id
        logger.info(f"✅ [CONTRACT DATA] Using client_id: {client_id}")
    else:
        # Fallback: store client fields directly in contract (legacy behavior)
        logger.warning(f"⚠️ [CONTRACT DATA] No client_id available, storing client fields directly")
        client_field_mapping = {
            'client_name': 'client_name',
            'client_legal_name': 'client_legal_name',
            'client_cnpj': 'client_cnpj',
            'client_email': 'client_email',
            'client_phone': 'client_phone',
            'client_address': 'client_address',
            'client_city': 'client_city',
            'client_state': 'client_state',
            'client_zip_code': 'client_zip_code',
            'client_contact_person': 'client_contact_person',
        }
        field_mapping.update(client_field_mapping)

    # Map standard fields
    for src_field, dst_field in field_mapping.items():
        if src_field in extracted_data and extracted_data[src_field]:
            contract_data[dst_field] = extracted_data[src_field]

    # Handle equipment data separately (nested object)
    logger.info("🔧 [EQUIPMENT MAPPING] Starting equipment data mapping...")
    logger.info(f"🔧 [EQUIPMENT MAPPING] 'equipment' key exists: {'equipment' in extracted_data}")

    if 'equipment' in extracted_data:
        logger.info(f"🔧 [EQUIPMENT MAPPING] Equipment type: {type(extracted_data['equipment'])}")
        logger.info(f"🔧 [EQUIPMENT MAPPING] Equipment raw data: {extracted_data['equipment']}")

        if isinstance(extracted_data['equipment'], dict):
            equipment = extracted_data['equipment']
            logger.info(f"🔧 [EQUIPMENT MAPPING] Equipment dict keys: {list(equipment.keys())}")

            equipment_mapping = {
                'type': 'equipment_type',
                'model': 'equipment_model',
                'brand': 'equipment_brand',
                'power': 'equipment_power',
                'voltage': 'equipment_voltage',
                'serial_number': 'equipment_serial',
                'location': 'equipment_location',
                'year': 'equipment_year',
                'condition': 'equipment_condition'
            }

            logger.info(f"🔧 [EQUIPMENT MAPPING] Starting field-by-field mapping...")
            for src_field, dst_field in equipment_mapping.items():
                src_value = equipment.get(src_field, '')
                logger.info(f"🔧 [EQUIPMENT MAPPING]   {src_field} -> {dst_field}: '{src_value}' (exists: {src_field in equipment}, has_value: {bool(src_value)})")

                if src_field in equipment and equipment[src_field]:
                    contract_data[dst_field] = equipment[src_field]
                    logger.info(f"✅ [EQUIPMENT MAPPING]   Mapped {src_field}='{equipment[src_field]}' to {dst_field}")
                else:
                    logger.warning(f"⚠️ [EQUIPMENT MAPPING]   Skipped {src_field} (not present or empty)")

            logger.info(f"🔧 [EQUIPMENT MAPPING] Mapping complete. contract_data equipment fields:")
            for dst_field in equipment_mapping.values():
                logger.info(f"     {dst_field}: '{contract_data.get(dst_field, 'NOT SET')}'")
        else:
            logger.warning(f"⚠️ [EQUIPMENT MAPPING] Equipment data is not a dict: {type(extracted_data['equipment'])}")
    else:
        logger.warning("⚠️ [EQUIPMENT MAPPING] No 'equipment' key in extracted_data")

    # Handle services array
    logger.info("📋 [SERVICES MAPPING] Starting services data mapping...")
    if 'services' in extracted_data:
        logger.info(f"📋 [SERVICES MAPPING] Services type: {type(extracted_data['services'])}")
        logger.info(f"📋 [SERVICES MAPPING] Services raw data: {extracted_data['services']}")

        if isinstance(extracted_data['services'], list):
            logger.info(f"📋 [SERVICES MAPPING] Services count: {len(extracted_data['services'])}")
            contract_data['services'] = json.dumps(extracted_data['services'])
            logger.info(f"✅ [SERVICES MAPPING] Mapped {len(extracted_data['services'])} services")
        else:
            logger.warning(f"⚠️ [SERVICES MAPPING] Services is not a list: {type(extracted_data['services'])}")
    else:
        logger.warning("⚠️ [SERVICES MAPPING] No 'services' key in extracted_data")

    # Set default status if not present
    if 'status' not in contract_data:
        contract_data['status'] = 'active'

    # Check if contract number exists and is valid
    existing_contract_number = contract_data.get('contract_number', '').strip()

    # Only generate if truly empty or placeholder values
    if not existing_contract_number or existing_contract_number in ['', 'N/A', 'Não informado', 'null', 'undefined']:
        # Generate unique contract number with timestamp and random component
        from datetime import datetime
        import random
        import string

        now = datetime.now()
        year = now.year
        month = str(now.month).zfill(2)
        day = str(now.day).zfill(2)
        timestamp = str(int(now.timestamp() * 1000))[-6:]  # Last 6 digits of timestamp
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

        contract_data['contract_number'] = f"CONT-{year}{month}{day}-{timestamp}-{random_str}"
        logger.info(f"📋 Generated NEW contract number: {contract_data['contract_number']}")
    else:
        # Keep the original contract number from extraction
        logger.info(f"📋 Using EXTRACTED contract number: {existing_contract_number}")

    # Ensure contract_type has a default
    if 'contract_type' not in contract_data or not contract_data['contract_type']:
        contract_data['contract_type'] = 'maintenance'

    # Add full extracted OCR text if provided
    if extracted_text:
        contract_data['extracted_text'] = extracted_text
        logger.info(f"📄 Saving {len(extracted_text)} characters of extracted text")

    # Calculate completeness score
    completeness_score = _calculate_completeness_score(contract_data)

    # Add extraction metadata for tracking
    extraction_metadata = {
        'extracted_at': datetime.now().isoformat(),
        'extraction_source': 'agno_system',
        'extraction_method': extraction_method or 'unknown',
        'completeness_score': completeness_score,
        'text_length': len(extracted_text) if extracted_text else 0,
        'fields_extracted': len([k for k, v in contract_data.items() if v]),
        'has_cnpj': bool(contract_data.get('client_cnpj')),
        'has_equipment': bool(contract_data.get('equipment_type')),
        'has_values': bool(contract_data.get('value') or contract_data.get('monthly_value'))
    }

    contract_data['extraction_metadata'] = json.dumps(extraction_metadata)

    # Legacy metadata field for compatibility
    contract_data['metadata'] = json.dumps({
        'extracted_at': datetime.now().isoformat(),
        'extraction_source': 'agno_system',
        'completeness_score': completeness_score
    })

    logger.info(f"📊 Contract data prepared with {extraction_metadata['fields_extracted']} fields, completeness: {completeness_score}%")

    # Final summary of equipment and services data
    logger.info("=" * 80)
    logger.info("📦 [FINAL CONTRACT DATA SUMMARY]")
    logger.info(f"   Client: {contract_data.get('client_name', 'NOT SET')}")
    logger.info(f"   Contract Number: {contract_data.get('contract_number', 'NOT SET')}")
    logger.info(f"   Equipment Type: {contract_data.get('equipment_type', 'NOT SET')}")
    logger.info(f"   Equipment Model: {contract_data.get('equipment_model', 'NOT SET')}")
    logger.info(f"   Equipment Brand: {contract_data.get('equipment_brand', 'NOT SET')}")
    logger.info(f"   Equipment Power: {contract_data.get('equipment_power', 'NOT SET')}")
    logger.info(f"   Equipment Voltage: {contract_data.get('equipment_voltage', 'NOT SET')}")
    logger.info(f"   Equipment Serial: {contract_data.get('equipment_serial', 'NOT SET')}")
    logger.info(f"   Equipment Location: {contract_data.get('equipment_location', 'NOT SET')}")
    logger.info(f"   Equipment Year: {contract_data.get('equipment_year', 'NOT SET')}")
    logger.info(f"   Equipment Condition: {contract_data.get('equipment_condition', 'NOT SET')}")

    services_str = contract_data.get('services', 'NOT SET')
    if services_str and services_str != 'NOT SET':
        try:
            services_data = json.loads(services_str) if isinstance(services_str, str) else services_str
            logger.info(f"   Services: {len(services_data)} services")
            for i, service in enumerate(services_data[:3]):  # Show first 3
                logger.info(f"      [{i+1}] {service}")
        except:
            logger.info(f"   Services: {services_str}")
    else:
        logger.info(f"   Services: NOT SET")
    logger.info("=" * 80)

    return contract_data

def _calculate_completeness_score(data: Dict[str, Any]) -> float:
    """
    Calculate how complete the extracted data is (0-100%)
    """
    essential_fields = [
        'client_name', 'client_cnpj', 'contract_number',
        'start_date', 'value', 'equipment_type'
    ]
    important_fields = [
        'client_email', 'client_phone', 'client_address',
        'end_date', 'monthly_value', 'equipment_model',
        'equipment_brand', 'equipment_power'
    ]

    essential_count = sum(1 for field in essential_fields if field in data and data[field])
    important_count = sum(1 for field in important_fields if field in data and data[field])

    # Essential fields worth 60%, important fields worth 40%
    essential_score = (essential_count / len(essential_fields)) * 60
    important_score = (important_count / len(important_fields)) * 40

    return round(essential_score + important_score, 2)

@app.get("/api/progress-stream/{session_id}", tags=["upload"], summary="SSE Progress Stream", description="Server-Sent Events stream for upload progress")
async def progress_stream(session_id: str):
    """SSE endpoint for real-time progress updates"""
    return StreamingResponse(
        generate_progress_stream(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/api/start-upload-session", tags=["upload"], summary="Start upload session", description="Initialize upload session for progress tracking")
async def start_upload_session(request: Dict[str, Any] = Body(...)):
    """Start a new upload session with progress tracking"""
    session_id = str(uuid.uuid4())
    filename = request.get("filename", "unknown")
    file_size = request.get("file_size", 0)

    # Initialize progress tracker
    tracker = ProgressTracker(session_id)
    tracker.update(0, "initialized", f"Sessão iniciada para {filename}", {
        "filename": filename,
        "file_size": file_size,
        "file_size_mb": file_size / (1024 * 1024) if file_size else 0
    })

    progress_streams[session_id] = tracker

    logger.info(f"Started upload session: {session_id} for file: {filename}")

    return JSONResponse(content={
        "success": True,
        "session_id": session_id,
        "stream_url": f"/api/progress-stream/{session_id}"
    })

# Endpoint to get timeout configuration
@app.get("/api/timeout-config", tags=["config"], summary="Get timeout configuration", description="Returns synchronized timeout settings")
async def get_timeout_config():
    """Get timeout configuration synchronized with frontend"""
    return JSONResponse(content={
        "success": True,
        "timeout_config": Config.TIMEOUT_CONFIG,
        "get_timeout_for_file_size": "Use the helper function with file size in MB"
    })

# All authentication handled by auth.py

# Authentication endpoints
@app.post("/api/auth/signup", tags=["auth"], summary="Criar nova conta", description="Registra um novo usuário no sistema")
async def signup(data: dict):
    """User registration"""
    try:
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return JSONResponse(
                content={"error": "Email and password are required"}, 
                status_code=400
            )
        
        user = create_user(email, password)
        if not user:
            return JSONResponse(
                content={"error": "Email already exists or failed to create user"}, 
                status_code=400
            )
        
        # Generate JWT token
        from datetime import timedelta
        token = create_access_token(
            data={"sub": user["id"], "email": user["email"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "user": user,
                "session": {"access_token": token}
            }
        })
    except Exception as e:
        logger.error(f"Signup error: {e}")
        return JSONResponse(
            content={"error": "Registration failed"}, 
            status_code=500
        )

@app.post("/api/auth/signin", tags=["auth"], summary="Fazer login", description="Autentica um usuário e retorna um token JWT") 
async def signin(data: dict):
    """User login"""
    try:
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return JSONResponse(
                content={"error": "Email and password are required"}, 
                status_code=400
            )
        
        user = authenticate_user(email, password)
        if not user:
            return JSONResponse(
                content={"error": "Invalid credentials"}, 
                status_code=401
            )
        
        # Generate JWT token
        from datetime import timedelta
        token = create_access_token(
            data={"sub": user["id"], "email": user["email"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "user": user,
                "session": {"access_token": token}
            }
        })
    except Exception as e:
        logger.error(f"Signin error: {e}")
        return JSONResponse(
            content={"error": "Login failed"}, 
            status_code=500
        )

@app.post("/api/auth/signout", tags=["auth"], summary="Fazer logout", description="Encerra a sessão do usuário")
async def signout():
    """User logout"""
    return JSONResponse(content={"success": True})

@app.get("/api/auth/user")
async def get_current_user_info(current_user: dict = Depends(verify_token)):
    """Get current user info"""
    try:
        user_id = current_user.get("sub") or current_user.get("id")
        user = get_user_by_id(user_id)
        if not user:
            return JSONResponse(
                content={"error": "User not found"}, 
                status_code=404
            )
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "user": user,
                "session": {"access_token": "current"}  # Placeholder
            }
        })
    except Exception as e:
        logger.error(f"Get user error: {e}")
        return JSONResponse(
            content={"error": "Failed to get user"}, 
            status_code=500
        )

@app.put("/api/auth/update-profile", tags=["auth"], summary="Atualizar perfil", description="Atualiza informações do perfil do usuário")
async def update_profile(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Update user profile"""
    try:
        user_id = current_user.get("sub") or current_user.get("id")
        if not user_id:
            return JSONResponse(
                content={"error": "User ID not found"}, 
                status_code=400
            )
        
        db = get_db()
        # Update user profile in database
        success = db.update_user_profile(user_id, data)
        
        if success:
            return JSONResponse(content={
                "success": True,
                "message": "Profile updated successfully"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to update profile"}, 
                status_code=500
            )
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        return JSONResponse(
            content={"error": "Failed to update profile"}, 
            status_code=500
        )

@app.put("/api/auth/change-password", tags=["auth"], summary="Alterar senha", description="Altera a senha do usuário")
async def change_password(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Change user password"""
    try:
        user_id = current_user.get("sub") or current_user.get("id")
        user_email = current_user.get("email")
        
        if not user_id or not user_email:
            return JSONResponse(
                content={"error": "User information not found"}, 
                status_code=400
            )
        
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not current_password or not new_password:
            return JSONResponse(
                content={"error": "Current and new password are required"}, 
                status_code=400
            )
        
        # Verify current password
        user = authenticate_user(user_email, current_password)
        if not user:
            return JSONResponse(
                content={"error": "Current password is incorrect"}, 
                status_code=401
            )
        
        # Update password
        db = get_db()
        success = db.update_user_password(user_id, new_password)
        
        if success:
            return JSONResponse(content={
                "success": True,
                "message": "Password changed successfully"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to change password"}, 
                status_code=500
            )
    except Exception as e:
        logger.error(f"Change password error: {e}")
        return JSONResponse(
            content={"error": "Failed to change password"},
            status_code=500
        )

# Admin verification dependency
def verify_admin(current_user: dict = Depends(verify_token)) -> dict:
    """Verify that the current user is an admin"""
    try:
        user_id = current_user.get("sub") or current_user.get("id")
        db = get_db()
        user = db.get_user_by_id(user_id)

        if not user or user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")

        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin verification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify admin status")

# ADMIN USER MANAGEMENT ENDPOINTS
@app.get("/api/admin/users", tags=["admin"], summary="Listar todos os usuários", description="Lista todos os usuários do sistema (apenas admin)")
async def list_users(admin: dict = Depends(verify_admin)):
    """List all users - Admin only"""
    try:
        db = get_db()
        users = db.list_all_users()
        return JSONResponse(content={
            "success": True,
            "data": users
        })
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return JSONResponse(
            content={"error": "Failed to list users"},
            status_code=500
        )

@app.post("/api/admin/users", tags=["admin"], summary="Criar novo usuário", description="Cria um novo usuário com role especificada (apenas admin)")
async def create_user_admin(data: Dict[str, Any], admin: dict = Depends(verify_admin)):
    """Create new user - Admin only"""
    try:
        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "user")
        full_name = data.get("full_name")

        if not email or not password:
            return JSONResponse(
                content={"error": "Email and password are required"},
                status_code=400
            )

        db = get_db()
        user = db.create_user_admin(email, password, role, full_name)

        if user:
            return JSONResponse(content={
                "success": True,
                "data": user,
                "message": "User created successfully"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to create user"},
                status_code=500
            )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.put("/api/admin/users/{user_id}", tags=["admin"], summary="Atualizar usuário", description="Atualiza informações de um usuário (apenas admin)")
async def update_user_admin(user_id: str, data: Dict[str, Any], admin: dict = Depends(verify_admin)):
    """Update user information - Admin only"""
    try:
        db = get_db()

        # Update email if provided
        if "email" in data:
            success = db.update_user_email(user_id, data["email"])
            if not success:
                return JSONResponse(
                    content={"error": "Failed to update email"},
                    status_code=500
                )

        # Update profile if full_name is provided
        if "full_name" in data:
            success = db.update_user_profile(user_id, {"full_name": data["full_name"]})
            if not success:
                return JSONResponse(
                    content={"error": "Failed to update profile"},
                    status_code=500
                )

        # Get updated user
        user = db.get_user_by_id(user_id)

        return JSONResponse(content={
            "success": True,
            "data": user,
            "message": "User updated successfully"
        })
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.put("/api/admin/users/{user_id}/role", tags=["admin"], summary="Alterar role do usuário", description="Altera o role de um usuário (apenas admin)")
async def update_user_role(user_id: str, data: Dict[str, Any], admin: dict = Depends(verify_admin)):
    """Update user role - Admin only"""
    try:
        new_role = data.get("role")

        if not new_role or new_role not in ['admin', 'user']:
            return JSONResponse(
                content={"error": "Invalid role. Must be 'admin' or 'user'"},
                status_code=400
            )

        db = get_db()
        success = db.update_user_role(user_id, new_role)

        if success:
            user = db.get_user_by_id(user_id)
            return JSONResponse(content={
                "success": True,
                "data": user,
                "message": f"User role updated to {new_role}"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to update user role"},
                status_code=500
            )
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.put("/api/admin/users/{user_id}/status", tags=["admin"], summary="Ativar/desativar usuário", description="Ativa ou desativa um usuário (apenas admin)")
async def toggle_user_status(user_id: str, data: Dict[str, Any], admin: dict = Depends(verify_admin)):
    """Activate or deactivate user - Admin only"""
    try:
        is_active = data.get("is_active")

        if is_active is None:
            return JSONResponse(
                content={"error": "is_active field is required"},
                status_code=400
            )

        db = get_db()
        success = db.toggle_user_status(user_id, is_active)

        if success:
            user = db.get_user_by_id(user_id)
            return JSONResponse(content={
                "success": True,
                "data": user,
                "message": f"User {'activated' if is_active else 'deactivated'} successfully"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to update user status"},
                status_code=500
            )
    except Exception as e:
        logger.error(f"Error toggling user status: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.delete("/api/admin/users/{user_id}", tags=["admin"], summary="Deletar usuário", description="Remove um usuário do sistema (apenas admin)")
async def delete_user(user_id: str, admin: dict = Depends(verify_admin)):
    """Delete user - Admin only"""
    try:
        # Prevent admin from deleting themselves
        admin_id = admin.get("sub") or admin.get("id")
        if user_id == admin_id:
            return JSONResponse(
                content={"error": "Cannot delete your own account"},
                status_code=400
            )

        db = get_db()
        success = db.delete_user_admin(user_id)

        if success:
            return JSONResponse(content={
                "success": True,
                "message": "User deleted successfully"
            })
        else:
            return JSONResponse(
                content={"error": "Failed to delete user"},
                status_code=500
            )
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/contracts", tags=["contracts"], summary="Listar contratos", description="Retorna todos os contratos do usuário")
async def get_contracts(current_user: dict = Depends(verify_token)):
    """Get contracts from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None

        logger.info(f"🧾 get_contracts endpoint user_id={user_id}")

        if not user_id:
            logger.error("Attempt to fetch contracts without authenticated user context")
            raise HTTPException(status_code=401, detail="Sessão inválida. Faça login novamente.")
        contracts = db.get_contracts(user_id)
        logger.info(f"📦 get_contracts returning {len(contracts) if contracts else 0} registros para user {user_id}")
        return JSONResponse(content=contracts)
    except Exception as e:
        logger.error(f"Error getting contracts: {str(e)}")
        return JSONResponse(content=[], status_code=200)  # Return empty array on error

@app.get("/api/maintenances", tags=["maintenances"], summary="Listar manutenções", description="Retorna todas as manutenções")
async def get_maintenances(current_user: dict = Depends(verify_token)):
    """Get maintenances from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        maintenances = db.get_maintenances(user_id)
        return JSONResponse(content=maintenances)
    except Exception as e:
        logger.error(f"Error getting maintenances: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.get("/api/clients", tags=["clients"], summary="Listar clientes", description="Retorna todos os clientes")
async def get_clients(current_user: dict = Depends(verify_token)):
    """Get clients from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        clients = db.get_clients(user_id)
        return JSONResponse(content=clients)
    except Exception as e:
        logger.error(f"Error getting clients: {str(e)}")
        return JSONResponse(content=[], status_code=200)  # Return empty array on error

@app.get("/api/ai-agents", tags=["ai_agents"], summary="Listar agentes IA", description="Retorna todos os agentes IA disponíveis")
async def get_ai_agents(current_user: dict = Depends(verify_token)):
    """Get AI agents from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        agents = db.get_ai_agents(user_id)
        return JSONResponse(content=agents)
    except Exception as e:
        logger.error(f"Error getting AI agents: {str(e)}")
        return JSONResponse(content=[], status_code=200)  # Return empty array on error

@app.get("/api/chat-sessions", tags=["chat"], summary="Listar sessões de chat", description="Retorna todas as sessões de chat do usuário")
async def get_chat_sessions(current_user: dict = Depends(verify_token)):
    """Get chat sessions from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        sessions = db.get_chat_sessions(user_id)
        return JSONResponse(content=sessions)
    except Exception as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.post("/api/chat-sessions", tags=["chat"], summary="Criar sessão de chat", description="Cria uma nova sessão de chat")
async def create_chat_session(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create chat session in PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        session = db.create_chat_session(data, user_id)
        return JSONResponse(content=session if session else {})
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/chat-sessions/{session_id}", tags=["chat"], summary="Buscar sessão específica", description="Retorna uma sessão de chat específica")
async def get_chat_session(session_id: str, current_user: dict = Depends(verify_token)):
    """Get specific chat session from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        session = db.get_chat_session_by_id(session_id, user_id)
        return JSONResponse(content=session if session else {})
    except Exception as e:
        logger.error(f"Error getting chat session: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=404)

@app.get("/api/chat-sessions", tags=["chat"], summary="Obter sessões de chat", description="Lista todas as sessões de chat do usuário")
async def get_chat_sessions(agent_id: str = None, current_user: dict = Depends(verify_token)):
    """Get chat sessions from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        sessions = db.get_chat_sessions(user_id, agent_id)
        return JSONResponse(content=sessions)
    except Exception as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.post("/api/chat-sessions", tags=["chat"], summary="Criar sessão de chat", description="Cria uma nova sessão de chat")
async def create_chat_session(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create chat session in PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        session = db.create_chat_session(data, user_id)
        return JSONResponse(content=session if session else {})
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/chat-messages/{session_id}", tags=["chat"], summary="Obter mensagens do chat", description="Lista todas as mensagens de uma sessão de chat")
async def get_chat_messages(session_id: str, current_user: dict = Depends(verify_token)):
    """Get chat messages for a session"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        messages = db.get_chat_messages(session_id, user_id)
        return JSONResponse(content=messages)
    except Exception as e:
        logger.error(f"Error getting chat messages: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.post("/api/chat-messages", tags=["chat"], summary="Adicionar mensagem ao chat", description="Adiciona uma nova mensagem a uma sessão de chat")
async def add_chat_message(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Add message to chat session"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        message = db.add_chat_message(data, user_id)
        return JSONResponse(content=message if message else {})
    except Exception as e:
        logger.error(f"Error adding chat message: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/ai-agents", tags=["ai-agents"], summary="Obter agentes IA", description="Lista todos os agentes de IA disponíveis")
async def get_ai_agents(current_user: dict = Depends(verify_token)):
    """Get AI agents from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        agents = db.get_ai_agents(user_id)
        return JSONResponse(content=agents)
    except Exception as e:
        logger.error(f"Error getting AI agents: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.post("/api/contracts", tags=["contracts"], summary="Criar contrato", description="Cria um novo contrato")
async def create_contract(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create contract in PostgreSQL with enhanced data handling"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None

        # Check if this is extracted data that needs processing
        if 'extracted_data' in data:
            # Use the prepared function to map fields correctly
            extracted_text = data.get('extracted_text', data.get('extractedText', ''))
            extraction_method = data.get('extraction_method', data.get('extraction_source', 'manual'))

            contract_data = _prepare_contract_data_for_save(
                data['extracted_data'],
                extracted_text=extracted_text,
                extraction_method=extraction_method,
                db=db,
                user_id=user_id
            )
            logger.info(f"📋 Creating contract from extracted data with {len(contract_data)} fields")
            logger.info(f"📄 Contract includes {len(extracted_text)} characters of extracted text")
        else:
            # Direct contract data - ensure extracted_text is included
            contract_data = data

            # Check for extracted_text in various possible locations
            extracted_text = data.get('extracted_text') or data.get('extractedText', '')
            if extracted_text:
                contract_data['extracted_text'] = extracted_text
                logger.info(f"📄 Contract includes {len(extracted_text)} characters of extracted text")

            # Ensure extraction_metadata exists
            if 'extraction_metadata' not in contract_data and extracted_text:
                contract_data['extraction_metadata'] = json.dumps({
                    'extracted_at': datetime.now().isoformat(),
                    'extraction_source': 'direct_upload',
                    'text_length': len(extracted_text)
                })

        # Add user_id
        contract_data['user_id'] = user_id

        # Log completeness score
        completeness = _calculate_completeness_score(contract_data)
        logger.info(f"📊 Contract completeness score: {completeness}%")

        contract = db.create_contract(contract_data, user_id)

        if contract:
            logger.info(f"✅ Contract created successfully with ID: {contract.get('id')}")
            # Add completeness info to response
            contract['completeness_score'] = completeness

        return JSONResponse(content=contract if contract else {})
    except Exception as e:
        logger.error(f"Error creating contract: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/contracts/{id}", tags=["contracts"], summary="Obter contrato específico", description="Retorna um contrato específico com dados consolidados de cliente")
async def get_contract(id: str, current_user: dict = Depends(verify_token)):
    """Get single contract from PostgreSQL with client information"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None

        logger.info(f"🧾 get_contract endpoint contract_id={id}, user_id={user_id}")

        if not user_id:
            logger.error("Attempt to fetch contract without authenticated user context")
            raise HTTPException(status_code=401, detail="Sessão inválida. Faça login novamente.")

        contract = db.get_contract(id, user_id)

        if not contract:
            logger.warning(f"Contract {id} not found for user {user_id}")
            return JSONResponse(content={}, status_code=404)

        logger.info(f"📦 get_contract returning contract {id}")
        return JSONResponse(content=contract)
    except Exception as e:
        logger.error(f"Error getting contract: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.put("/api/contracts/{id}")
async def update_contract(id: str, data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Update contract in PostgreSQL"""
    try:
        db = get_db()
        contract = db.update_contract(id, data)
        return JSONResponse(content=contract if contract else {})
    except Exception as e:
        logger.error(f"Error updating contract: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.delete("/api/contracts/{id}")
async def delete_contract(id: str, current_user: dict = Depends(verify_token)):
    """Delete contract and all associated files from storage"""
    try:
        db = get_db()

        # Collect all file paths to delete from storage
        files_to_delete = []

        # Get all addendums for this contract
        addendums = db.get_addendums_by_contract(id)
        for addendum in addendums:
            file_path = addendum.get("file_path")
            if file_path:
                files_to_delete.append(file_path)

        # Get all documents for this contract (query directly since no method exists)
        try:
            documents = db.execute_query(
                "SELECT storage_path FROM contract_documents WHERE contract_id = %s",
                (id,)
            )
            if documents:
                for doc in documents:
                    storage_path = doc.get("storage_path")
                    if storage_path:
                        files_to_delete.append(storage_path)
        except Exception as doc_err:
            logger.warning(f"Could not fetch contract documents: {doc_err}")

        # Delete files from storage bucket
        if files_to_delete:
            try:
                from supabase import create_client
                supabase_url = os.getenv("SUPABASE_URL")
                supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

                if supabase_url and supabase_key:
                    supabase_client = create_client(supabase_url, supabase_key)
                    storage_response = supabase_client.storage.from_("contract-documents").remove(files_to_delete)
                    logger.info(f"Deleted {len(files_to_delete)} files from storage for contract {id}")
            except Exception as storage_error:
                logger.warning(f"Failed to delete files from storage (continuing with DB deletion): {storage_error}")

        # Delete contract from database (cascades to addendums and documents via FK)
        success = db.delete_contract(id)
        return JSONResponse(content={"success": success})
    except Exception as e:
        logger.error(f"Error deleting contract: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/maintenances", tags=["maintenances"], summary="Criar manutenção", description="Cria uma nova manutenção")
async def create_maintenance(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create maintenance in PostgreSQL - only allows business days"""
    try:
        logger.info(f"Creating maintenance with data: {data}")
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None

        status_storage_slug, status_validation_slug = _normalize_status_payload(db, data)
        if not status_storage_slug:
            default_storage, default_validation, lookup_terms = _map_status_candidate('scheduled')
            data.setdefault('status', default_storage)
            if not data.get('status_id'):
                resolved_id = _lookup_status_id(db, lookup_terms)
                if resolved_id:
                    data['status_id'] = resolved_id
            status_storage_slug = default_storage
            status_validation_slug = status_validation_slug or default_validation

        weekend_flag = False

        scheduled_date_obj = _normalize_date_input(data.get('scheduled_date')) if data.get('scheduled_date') else None
        if data.get('scheduled_date') and not scheduled_date_obj:
            raise HTTPException(
                status_code=400,
                detail="Formato de data inválido"
            )

        if scheduled_date_obj:
            weekend_flag = scheduled_date_obj.weekday() >= 5
            data['scheduled_date'] = scheduled_date_obj.isoformat()

            logger.info(
                "Processing maintenance date: %s -> %s (weekday: %s, weekend: %s)",
                data.get('scheduled_date'),
                scheduled_date_obj,
                scheduled_date_obj.weekday(),
                weekend_flag
            )

            if weekend_flag:
                existing_notes = data.get('notes', '') or ''
                weekend_note = '⚠️ Manutenção agendada para o final de semana.'
                if weekend_note not in existing_notes:
                    separator = '\n\n' if existing_notes else ''
                    data['notes'] = f"{existing_notes}{separator}{weekend_note}"

        scheduled_time_val = _normalize_time_input(data.get('scheduled_time')) if data.get('scheduled_time') else None
        if data.get('scheduled_time') and not scheduled_time_val:
            raise HTTPException(
                status_code=400,
                detail="Formato de hora inválido. Use HH:MM"
            )

        if scheduled_time_val:
            data['scheduled_time'] = scheduled_time_val.strftime('%H:%M')
        elif scheduled_date_obj and 'scheduled_time' not in data:
            scheduled_time_val = time.min

        scheduled_datetime = _combine_schedule(scheduled_date_obj, scheduled_time_val)

        now = datetime.now()

        # 🔍 DEBUG: Log datetime values for troubleshooting
        logger.info(
            f"🔍 [DATETIME VALIDATION] "
            f"scheduled_date_obj={scheduled_date_obj}, "
            f"scheduled_time_val={scheduled_time_val}, "
            f"scheduled_datetime={scheduled_datetime}, "
            f"now={now}, "
            f"status_validation_slug={status_validation_slug}"
        )

        if status_validation_slug == 'overdue':
            if not scheduled_datetime:
                raise HTTPException(
                    status_code=400,
                    detail="Para marcar como atrasada, informe uma data e hora agendadas"
                )
            if scheduled_datetime >= now:
                raise HTTPException(
                    status_code=400,
                    detail="Manutenções futuras não podem ser marcadas como atrasadas"
                )

        if status_validation_slug == 'pending':
            if not scheduled_datetime:
                raise HTTPException(
                    status_code=400,
                    detail="Para manter uma manutenção pendente, informe a data e hora agendadas"
                )

            # 🔧 CRITICAL FIX: Compare with a small tolerance (1 minute) to avoid microsecond precision issues
            # This allows scheduling at current time without throwing "data passada" error
            tolerance = timedelta(minutes=1)
            if scheduled_datetime < (now - tolerance):
                logger.warning(
                    f"⚠️ [DATETIME VALIDATION] Rejecting maintenance: "
                    f"scheduled={scheduled_datetime} < now={now} (tolerance={tolerance})"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Manutenções já vencidas não podem permanecer pendentes. Reagende para uma data futura."
                )

        maintenance = db.create_maintenance(data, user_id)

        if maintenance:
            maintenance['scheduled_on_weekend'] = weekend_flag

        return JSONResponse(content=maintenance if maintenance else {})
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating maintenance: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.put("/api/maintenances/{id}")
async def update_maintenance(id: str, data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Update maintenance in PostgreSQL - only allows business days"""
    try:
        db = get_db()

        status_storage_slug, status_validation_slug = _normalize_status_payload(db, data)

        provided_date_obj = None
        provided_time_obj = None
        weekend_flag = False

        if 'scheduled_date' in data:
            provided_date_obj = _normalize_date_input(data.get('scheduled_date')) if data.get('scheduled_date') else None
            if data.get('scheduled_date') and not provided_date_obj:
                raise HTTPException(
                    status_code=400,
                    detail="Formato de data inválido"
                )
            if provided_date_obj:
                data['scheduled_date'] = provided_date_obj.isoformat()
                weekend_flag = provided_date_obj.weekday() >= 5
                logger.info(
                    "Updating maintenance date: %s -> %s (weekday: %s, weekend: %s)",
                    data.get('scheduled_date'),
                    provided_date_obj,
                    provided_date_obj.weekday(),
                    weekend_flag
                )

                if weekend_flag:
                    existing_notes = data.get('notes', '') or ''
                    weekend_note = '⚠️ Manutenção agendada para o final de semana.'
                    if weekend_note not in existing_notes:
                        separator = '\n\n' if existing_notes else ''
                        data['notes'] = f"{existing_notes}{separator}{weekend_note}"

        if 'scheduled_time' in data:
            provided_time_obj = _normalize_time_input(data.get('scheduled_time')) if data.get('scheduled_time') else None
            if data.get('scheduled_time') and not provided_time_obj:
                raise HTTPException(
                    status_code=400,
                    detail="Formato de hora inválido. Use HH:MM"
                )
            if provided_time_obj:
                data['scheduled_time'] = provided_time_obj.strftime('%H:%M')

        effective_date_obj = provided_date_obj
        effective_time_obj = provided_time_obj

        requires_schedule_validation = status_validation_slug in {'overdue', 'pending'}
        if requires_schedule_validation and (not effective_date_obj or not effective_time_obj):
            existing_date, existing_time = _fetch_existing_schedule(db, id)
            effective_date_obj = effective_date_obj or existing_date
            effective_time_obj = effective_time_obj or existing_time

        scheduled_datetime = _combine_schedule(effective_date_obj, effective_time_obj)

        # If we didn't receive a new date but have one stored, keep weekend flag in sync for the response
        if not provided_date_obj and effective_date_obj:
            weekend_flag = effective_date_obj.weekday() >= 5

        now = datetime.now()

        # 🔍 DEBUG: Log datetime values for troubleshooting
        logger.info(
            f"🔍 [DATETIME VALIDATION - UPDATE] "
            f"effective_date_obj={effective_date_obj}, "
            f"effective_time_obj={effective_time_obj}, "
            f"scheduled_datetime={scheduled_datetime}, "
            f"now={now}, "
            f"status_validation_slug={status_validation_slug}"
        )

        if status_validation_slug == 'overdue':
            if not scheduled_datetime:
                raise HTTPException(
                    status_code=400,
                    detail="Para marcar como atrasada, informe a data e hora agendadas"
                )
            if scheduled_datetime >= now:
                raise HTTPException(
                    status_code=400,
                    detail="Manutenções futuras não podem ser marcadas como atrasadas"
                )

        if status_validation_slug == 'pending':
            if not scheduled_datetime:
                raise HTTPException(
                    status_code=400,
                    detail="Para manter uma manutenção pendente, informe a data e hora agendadas"
                )

            # 🔧 CRITICAL FIX: Compare with a small tolerance (1 minute) to avoid microsecond precision issues
            # This allows scheduling at current time without throwing "data passada" error
            tolerance = timedelta(minutes=1)
            if scheduled_datetime < (now - tolerance):
                logger.warning(
                    f"⚠️ [DATETIME VALIDATION - UPDATE] Rejecting maintenance: "
                    f"scheduled={scheduled_datetime} < now={now} (tolerance={tolerance})"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Manutenções já vencidas não podem permanecer pendentes. Reagende para uma data futura."
                )

        maintenance = db.update_maintenance(id, data)

        if maintenance:
            maintenance['scheduled_on_weekend'] = weekend_flag

        return JSONResponse(content=maintenance if maintenance else {})
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating maintenance: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.delete("/api/maintenances/{id}")
async def delete_maintenance(id: str, current_user: dict = Depends(verify_token)):
    """Delete maintenance from PostgreSQL"""
    try:
        db = get_db()
        success = db.delete_maintenance(id)
        return JSONResponse(content={"success": success})
    except Exception as e:
        logger.error(f"Error deleting maintenance: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/clients", tags=["clients"], summary="Criar cliente", description="Cria um novo cliente")
async def create_client(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create client in PostgreSQL with multi-tenant support"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None

        logger.info(f"📥 [create_client] Received data: {data}")
        logger.info(f"🔐 [create_client] current_user: {current_user}")
        logger.info(f"👤 [create_client] Extracted user_id: {user_id}")

        if not user_id:
            logger.error(f"❌ [create_client] user_id is None! current_user={current_user}")
            raise HTTPException(status_code=401, detail="Usuário não autenticado")

        created_new = False
        relationship_created = False

        # Create or find client (handles CNPJ deduplication)
        client = db.create_client(data, user_id=user_id)

        if client and user_id:
            created_new = not client.get('_was_existing', False)

            relationship = db.create_client_user_relationship(client['id'], user_id, role='owner')
            relationship_created = bool(relationship)

            if not relationship_created and created_new:
                # Failed to create relationship for a newly created client, rollback
                db.delete_client(client['id'])
                return JSONResponse(content={"error": "Failed to link client to user"}, status_code=500)

        if not client:
            raise HTTPException(status_code=500, detail="Falha ao criar cliente. Tente novamente.")

        client.pop('_was_existing', None)

        response_payload = {
            "client": client,
            "created": created_new,
            "relationship_created": relationship_created
        }

        return JSONResponse(content=response_payload)
    except ValueError as ve:
        logger.error(f"Validation error creating client: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating client: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.put("/api/clients/{id}")
async def update_client(id: str, data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Update client in PostgreSQL"""
    try:
        db = get_db()
        client = db.update_client(id, data)
        return JSONResponse(content=client if client else {})
    except Exception as e:
        logger.error(f"Error updating client: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.delete("/api/clients/{id}")
async def delete_client(id: str, current_user: dict = Depends(verify_token)):
    """Delete client from PostgreSQL"""
    try:
        db = get_db()
        success = db.delete_client(id)
        return JSONResponse(content={"success": success})
    except Exception as e:
        logger.error(f"Error deleting client: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==================== REGIONS ENDPOINTS ====================

@app.get("/api/regions", tags=["regions"], summary="Listar regiões", description="Retorna todas as regiões do usuário")
async def get_regions(current_user: dict = Depends(verify_token)):
    """Get all regions for the authenticated user"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")
        regions = db.get_regions(user_id)
        return JSONResponse(content=regions)
    except Exception as e:
        logger.error(f"Error getting regions: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/api/regions/{region_id}", tags=["regions"], summary="Obter região", description="Retorna uma região específica")
async def get_region(region_id: str, current_user: dict = Depends(verify_token)):
    """Get a specific region by ID"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")
        region = db.get_region_by_id(region_id, user_id)
        if not region:
            return JSONResponse(content={"error": "Region not found"}, status_code=404)
        return JSONResponse(content=region)
    except Exception as e:
        logger.error(f"Error getting region: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/regions", tags=["regions"], summary="Criar região", description="Cria uma nova região")
async def create_region(data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Create a new region"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")

        if not data.get('name'):
            return JSONResponse(content={"error": "Nome da região é obrigatório"}, status_code=400)

        region = db.create_region(data, user_id)
        if not region:
            return JSONResponse(content={"error": "Failed to create region"}, status_code=500)

        return JSONResponse(content=region, status_code=201)
    except ValueError as ve:
        return JSONResponse(content={"error": str(ve)}, status_code=400)
    except Exception as e:
        logger.error(f"Error creating region: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.put("/api/regions/{region_id}", tags=["regions"], summary="Atualizar região", description="Atualiza uma região existente")
async def update_region(region_id: str, data: Dict[str, Any], current_user: dict = Depends(verify_token)):
    """Update an existing region"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")

        region = db.update_region(region_id, data, user_id)
        if not region:
            return JSONResponse(content={"error": "Region not found or update failed"}, status_code=404)

        return JSONResponse(content=region)
    except Exception as e:
        logger.error(f"Error updating region: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.delete("/api/regions/{region_id}", tags=["regions"], summary="Deletar região", description="Remove uma região")
async def delete_region(region_id: str, current_user: dict = Depends(verify_token)):
    """Delete a region"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")

        success = db.delete_region(region_id, user_id)
        if not success:
            return JSONResponse(content={"error": "Failed to delete region"}, status_code=500)

        return JSONResponse(content={"success": True, "message": "Region deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting region: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==================== CONTRACT ADDENDUMS ENDPOINTS ====================

@app.get("/api/contracts/{contract_id}/addendums", tags=["addendums"], summary="Listar aditivos", description="Retorna todos os aditivos de um contrato")
async def get_contract_addendums(contract_id: str, current_user: dict = Depends(verify_token)):
    """Get all addendums for a contract"""
    try:
        db = get_db()
        addendums = db.get_addendums_by_contract(contract_id)
        return JSONResponse(content=addendums)
    except Exception as e:
        logger.error(f"Error getting addendums for contract {contract_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/api/addendums/{addendum_id}", tags=["addendums"], summary="Obter aditivo", description="Retorna um aditivo específico")
async def get_addendum(addendum_id: str, current_user: dict = Depends(verify_token)):
    """Get a specific addendum by ID"""
    try:
        db = get_db()
        addendum = db.get_addendum(addendum_id)
        if not addendum:
            return JSONResponse(content={"error": "Addendum not found"}, status_code=404)
        return JSONResponse(content=addendum)
    except Exception as e:
        logger.error(f"Error getting addendum {addendum_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==================== BACKGROUND PROCESSING FUNCTION ====================
def process_addendum_in_background(addendum_id: str, file_content: bytes, filename: str, contract_id: str, contract_data: dict, db_instance):
    """
    Process addendum in background: OCR extraction, identity validation, and AI analysis.
    This runs in a thread pool to avoid blocking the request/response cycle.
    """
    import json as json_module

    try:
        logger.info(f"[BG] Starting background processing for addendum {addendum_id}")

        # Update status to "extracting"
        db_instance.update_addendum(addendum_id, {"processing_status": "extracting"})

        # ==================== STEP 1: TEXT EXTRACTION ====================
        from utils.multi_format_extractor import MultiFormatExtractor

        extractor = MultiFormatExtractor()
        extraction_result = extractor.extract(file_content, filename)

        extracted_text = extraction_result.get("text", "") if extraction_result.get("success") else ""
        extraction_method = extraction_result.get("method", "unknown")

        # Remove NUL characters that PostgreSQL can't handle
        if extracted_text:
            extracted_text = extracted_text.replace('\x00', '')

        # Fix OCR duplication artifact for PDFs
        if extracted_text and filename.lower().endswith('.pdf'):
            try:
                from utils.pdf_extractor import PDFExtractor
                extracted_text = PDFExtractor.fix_duplicate_characters(extracted_text)
            except ImportError:
                pass

        logger.info(f"[BG] Extracted {len(extracted_text)} chars using {extraction_method} from {filename}")

        # Save extracted text
        db_instance.update_addendum(addendum_id, {
            "content_extracted": extracted_text,
            "extraction_method": extraction_method,
            "processing_status": "validating"
        })

        # ==================== STEP 2: IDENTITY VALIDATION ====================
        validation_result = None
        try:
            from agno_agents.document_identity_validator import DocumentIdentityValidator

            validator = DocumentIdentityValidator()

            # Check if it's an image
            is_image = filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))

            if is_image:
                extracted_identifiers = validator.extract_identifiers_from_image(file_content, filename)
            elif extracted_text:
                extracted_identifiers = validator.extract_identifiers(extracted_text, filename)
            else:
                extracted_identifiers = {"extracted_identifiers": {}}

            # Validate against contract
            validation_result = validator.validate_against_contract(extracted_identifiers, contract_data)
            logger.info(f"[BG] Validation result: {validation_result.get('validation_status')} (score: {validation_result.get('confidence_score')})")

            # Save validation result
            db_instance.update_addendum(addendum_id, {
                "identity_validation": json_module.dumps(validation_result),
                "processing_status": "analyzing"
            })

        except Exception as validation_error:
            logger.warning(f"[BG] Validation error: {validation_error}")
            validation_result = {"validation_status": "error", "message": str(validation_error)}
            db_instance.update_addendum(addendum_id, {
                "identity_validation": json_module.dumps(validation_result),
                "processing_status": "analyzing"
            })

        # ==================== STEP 3: AI ANALYSIS ====================
        try:
            from agno_agents.addendum_processor_agent import process_addendum_sync

            # This will set processing_status to "completed" when done
            process_addendum_sync(addendum_id, extracted_text, contract_id, db_instance)
            logger.info(f"[BG] AI processing completed for addendum {addendum_id}")

        except ImportError as import_err:
            logger.warning(f"[BG] AI processor not available: {import_err}")
            db_instance.update_addendum(addendum_id, {"processing_status": "completed"})
        except Exception as agent_error:
            logger.error(f"[BG] AI processing error: {agent_error}")
            db_instance.update_addendum(addendum_id, {
                "processing_status": "error",
                "processing_error": f"Erro na análise IA: {str(agent_error)}"
            })

    except Exception as e:
        logger.error(f"[BG] Background processing error for addendum {addendum_id}: {e}")
        try:
            db_instance.update_addendum(addendum_id, {
                "processing_status": "error",
                "processing_error": f"Erro no processamento: {str(e)}"
            })
        except:
            pass


@app.post("/api/contracts/{contract_id}/addendums", tags=["addendums"], summary="Upload de aditivo", description="Faz upload e processa um novo aditivo")
async def upload_addendum(
    contract_id: str,
    file: UploadFile = File(...),
    title: str = Form(None),
    description: str = Form(None),
    force_upload: bool = Form(False),
    current_user: dict = Depends(verify_token)
):
    """
    Upload and process a new contract addendum.
    File is saved immediately and processing (OCR, validation, AI) runs in background.
    Client should poll GET /api/addendums/{id} to check processing_status.
    """
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")

        # Validate file type
        from utils.multi_format_extractor import is_supported_format
        if not is_supported_format(file.filename):
            return JSONResponse(content={"error": "Formato de arquivo não suportado"}, status_code=400)

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Get contract for background processing
        contract = db.get_contract(contract_id, user_id)
        if not contract:
            return JSONResponse(content={"error": "Contrato não encontrado"}, status_code=404)

        # Build contract data for validation (will be used in background)
        contract_data = {
            "cnpj": contract.get("client_cnpj"),
            "client_cnpj": contract.get("client_cnpj"),
            "client_name": contract.get("client_name") or contract.get("client_legal_name"),
            "contract_number": contract.get("contract_number"),
            "client_city": contract.get("client_city"),
            "equipment_type": contract.get("equipment_type")
        }

        # Generate storage path
        import uuid
        import unicodedata
        import re

        def sanitize_filename(filename: str) -> str:
            """Remove accents and special characters from filename for storage compatibility"""
            normalized = unicodedata.normalize('NFKD', filename)
            ascii_only = normalized.encode('ASCII', 'ignore').decode('ASCII')
            sanitized = re.sub(r'[^\w\-\.]', '_', ascii_only)
            sanitized = re.sub(r'_+', '_', sanitized)
            return sanitized

        file_uuid = str(uuid.uuid4())
        safe_filename = sanitize_filename(file.filename)
        file_path = f"addendums/{contract_id}/{file_uuid}_{safe_filename}"

        # Upload to Supabase storage (fast operation)
        from supabase import create_client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

        if supabase_url and supabase_key:
            supabase_client = create_client(supabase_url, supabase_key)
            import mimetypes
            mime_type, _ = mimetypes.guess_type(file.filename)
            mime_type = mime_type or "application/octet-stream"

            storage_response = supabase_client.storage.from_("contract-documents").upload(
                file_path,
                file_content,
                {"content-type": mime_type}
            )
            logger.info(f"Uploaded addendum to storage: {file_path}")
        else:
            logger.warning("Supabase credentials not found, skipping storage upload")

        # Get MIME type for record
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file.filename)
        mime_type = mime_type or "application/octet-stream"

        # Create addendum record with "uploading" status (will be updated by background task)
        addendum_data = {
            "contract_id": contract_id,
            "file_path": file_path,
            "file_name": file.filename,
            "file_type": mime_type,
            "file_size": file_size,
            "title": title,
            "description": description,
            "processing_status": "uploading",  # Initial status - background will update
            "identity_validation": None  # Will be set by background task
        }

        addendum = db.create_addendum(addendum_data, user_id)
        if not addendum:
            return JSONResponse(content={"error": "Failed to create addendum"}, status_code=500)

        logger.info(f"Created addendum {addendum['id']}, starting background processing")

        # Start background processing (OCR + Validation + AI Analysis)
        import asyncio
        loop = asyncio.get_event_loop()
        loop.run_in_executor(
            None,  # Use default ThreadPoolExecutor
            process_addendum_in_background,
            addendum["id"],
            file_content,
            file.filename,
            contract_id,
            contract_data,
            db  # Pass db instance
        )

        # Return immediately with the created addendum
        # Client will poll GET /api/addendums/{id} to check progress
        return JSONResponse(content={
            **addendum,
            "processing_status": "uploading",  # Let client know processing has started
            "message": "Upload concluído. Processamento em andamento..."
        }, status_code=201)

    except Exception as e:
        logger.error(f"Error uploading addendum: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.delete("/api/addendums/{addendum_id}", tags=["addendums"], summary="Deletar aditivo", description="Remove um aditivo")
async def delete_addendum(addendum_id: str, current_user: dict = Depends(verify_token)):
    """Delete an addendum and its associated file from storage"""
    try:
        db = get_db()

        # Get addendum data to retrieve file path before deletion
        addendum = db.get_addendum(addendum_id)
        if not addendum:
            return JSONResponse(content={"error": "Addendum not found"}, status_code=404)

        file_path = addendum.get("file_path")

        # Delete from storage bucket if file_path exists
        if file_path:
            try:
                from supabase import create_client
                supabase_url = os.getenv("SUPABASE_URL")
                supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

                if supabase_url and supabase_key:
                    supabase_client = create_client(supabase_url, supabase_key)
                    storage_response = supabase_client.storage.from_("contract-documents").remove([file_path])
                    logger.info(f"Deleted addendum file from storage: {file_path}")
            except Exception as storage_error:
                logger.warning(f"Failed to delete file from storage (continuing with DB deletion): {storage_error}")

        # Delete from database
        success = db.delete_addendum(addendum_id)
        if not success:
            return JSONResponse(content={"error": "Failed to delete addendum"}, status_code=500)
        return JSONResponse(content={"success": True, "message": "Addendum deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting addendum {addendum_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==================== PENDING CONTRACT CHANGES ENDPOINTS ====================

@app.get("/api/addendums/{addendum_id}/changes", tags=["addendums"], summary="Listar mudanças", description="Retorna todas as mudanças pendentes de um aditivo")
async def get_addendum_changes(addendum_id: str, current_user: dict = Depends(verify_token)):
    """Get all pending changes for an addendum"""
    try:
        db = get_db()
        changes = db.get_pending_changes_by_addendum(addendum_id)
        return JSONResponse(content=changes)
    except Exception as e:
        logger.error(f"Error getting changes for addendum {addendum_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/changes/{change_id}/approve", tags=["addendums"], summary="Aprovar mudança", description="Aprova uma mudança pendente")
async def approve_change(change_id: str, current_user: dict = Depends(verify_token)):
    """Approve a pending change"""
    try:
        db = get_db()
        change = db.approve_pending_change(change_id)
        if not change:
            return JSONResponse(content={"error": "Change not found or approval failed"}, status_code=404)
        return JSONResponse(content=change)
    except Exception as e:
        logger.error(f"Error approving change {change_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/changes/{change_id}/reject", tags=["addendums"], summary="Rejeitar mudança", description="Rejeita uma mudança pendente")
async def reject_change(change_id: str, data: Dict[str, Any] = None, current_user: dict = Depends(verify_token)):
    """Reject a pending change"""
    try:
        db = get_db()
        reason = data.get("reason") if data else None
        change = db.reject_pending_change(change_id, reason)
        if not change:
            return JSONResponse(content={"error": "Change not found or rejection failed"}, status_code=404)
        return JSONResponse(content=change)
    except Exception as e:
        logger.error(f"Error rejecting change {change_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/addendums/{addendum_id}/apply", tags=["addendums"], summary="Aplicar mudanças", description="Aplica todas as mudanças aprovadas de um aditivo ao contrato")
async def apply_addendum_changes(addendum_id: str, current_user: dict = Depends(verify_token)):
    """Apply all approved changes from an addendum to the contract"""
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")
        result = db.apply_approved_changes(addendum_id, user_id)
        if not result.get("success"):
            return JSONResponse(content={"error": result.get("error", "Failed to apply changes")}, status_code=500)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error applying changes for addendum {addendum_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ==================== CONTRACT DOCUMENTS ENDPOINTS ====================

@app.post("/api/contracts/{contract_id}/documents", tags=["documents"], summary="Upload documento", description="Faz upload de um documento com processamento de IA")
async def upload_contract_document(
    contract_id: str,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form("general"),
    force_upload: bool = Form(False),
    current_user: dict = Depends(verify_token)
):
    """
    Upload a contract document with AI processing.
    Extracts text and generates AI summary for Chat context.
    Validates document identity against contract data.
    Use force_upload=true to bypass identity validation warnings.
    """
    try:
        db = get_db()
        user_id = current_user.get("user_id") or current_user.get("sub")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        file_type = file.content_type or "application/octet-stream"

        # ==================== DOCUMENT IDENTITY VALIDATION ====================
        # Get contract data for validation
        contract = db.get_contract(contract_id, user_id)
        if not contract:
            return JSONResponse(content={"error": "Contrato não encontrado"}, status_code=404)

        # Validate document identity
        validation_result = None
        try:
            from utils.multi_format_extractor import MultiFormatExtractor, is_supported_format
            from agno_agents.document_identity_validator import DocumentIdentityValidator

            if is_supported_format(file.filename):
                extractor = MultiFormatExtractor()
                validator = DocumentIdentityValidator()

                # Check if it's an image (use vision) or other format (extract text)
                image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}
                from pathlib import Path
                is_image = Path(file.filename).suffix.lower() in image_extensions

                if is_image:
                    extracted_identifiers = validator.extract_identifiers_from_image(file_content, file.filename)
                else:
                    extraction_result = extractor.extract(file_content, file.filename)
                    extracted_text = extraction_result.get("text", "") if extraction_result.get("success") else ""
                    if extracted_text:
                        extracted_identifiers = validator.extract_identifiers(extracted_text, file.filename)
                    else:
                        extracted_identifiers = {"extracted_identifiers": {}}

                # Build contract data for comparison
                contract_data = {
                    "cnpj": contract.get("client_cnpj"),
                    "client_cnpj": contract.get("client_cnpj"),
                    "client_name": contract.get("client_name") or contract.get("client_legal_name"),
                    "contract_number": contract.get("contract_number"),
                    "client_city": contract.get("client_city"),
                    "equipment_type": contract.get("equipment_type")
                }

                validation_result = validator.validate_against_contract(extracted_identifiers, contract_data)
                logger.info(f"Document validation result for {file.filename}: {validation_result.get('validation_status')} (score: {validation_result.get('confidence_score')})")

                # Log validation result but DON'T block upload - just warn
                # The validation_result is saved to database for UI display
                if validation_result.get("validation_status") == "alert":
                    logger.warning(f"Document identity validation alert for {file.filename}: {validation_result.get('message')}")

        except ImportError as import_err:
            logger.warning(f"Document identity validator not available: {import_err}")
            validation_result = {"validation_status": "skipped", "message": "Validação não disponível"}
        except Exception as validation_error:
            logger.error(f"Error validating document identity: {validation_error}")
            validation_result = {"validation_status": "error", "message": str(validation_error)}

        # ==================== END VALIDATION ====================

        # Generate storage path
        import uuid
        import unicodedata
        import re

        def sanitize_filename(filename: str) -> str:
            """Remove accents and special characters from filename"""
            normalized = unicodedata.normalize('NFKD', filename)
            ascii_only = normalized.encode('ASCII', 'ignore').decode('ASCII')
            sanitized = re.sub(r'[^\w\-\.]', '_', ascii_only)
            sanitized = re.sub(r'_+', '_', sanitized)
            return sanitized

        file_uuid = str(uuid.uuid4())
        safe_filename = sanitize_filename(file.filename)
        file_path = f"{contract_id}/{file_uuid}_{safe_filename}"

        # Upload to Supabase storage
        from supabase import create_client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

        if supabase_url and supabase_key:
            supabase_client = create_client(supabase_url, supabase_key)
            storage_response = supabase_client.storage.from_("contract-documents").upload(
                file_path,
                file_content,
                {"content-type": file_type}
            )
            logger.info(f"Uploaded document to storage: {file_path}")
        else:
            logger.warning("Supabase credentials not found, skipping storage upload")

        # Create document record with processing status
        document_name = name or file.filename
        document_data = {
            "contract_id": contract_id,
            "document_name": document_name,
            "storage_path": file_path,
            "document_type": file_type,
            "file_size": file_size,
            "metadata": json.dumps({
                "description": description,
                "category": category,
                "uploaded_via": "api",
                "original_name": file.filename
            }),
            "uploaded_by": user_id,
            "processing_status": "processing"
        }

        # Insert document record with validation result
        identity_validation_json = json.dumps(validation_result) if validation_result else None
        result = db.execute_query(
            """
            INSERT INTO contract_documents
            (contract_id, document_name, storage_path, document_type, file_size, metadata, uploaded_by, processing_status, identity_validation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, contract_id, document_name, storage_path, document_type, file_size,
                      metadata, uploaded_by, processing_status, identity_validation, created_at, updated_at
            """,
            (
                document_data["contract_id"],
                document_data["document_name"],
                document_data["storage_path"],
                document_data["document_type"],
                document_data["file_size"],
                document_data["metadata"],
                document_data["uploaded_by"],
                document_data["processing_status"],
                identity_validation_json
            )
        )

        if not result:
            return JSONResponse(content={"error": "Failed to create document record"}, status_code=500)

        document = result[0] if isinstance(result, list) else result

        # Extract and process document with AI (multi-format support)
        try:
            from utils.multi_format_extractor import is_supported_format

            if is_supported_format(file.filename):
                # Use multi-format extraction + AI processing
                try:
                    from agno_agents.document_summarizer_agent import process_document_from_bytes_sync
                    import asyncio

                    loop = asyncio.get_event_loop()
                    loop.run_in_executor(
                        None,
                        process_document_from_bytes_sync,
                        document["id"],
                        file_content,
                        file.filename,
                        category,
                        db
                    )
                    logger.info(f"Started multi-format AI processing for document {document['id']} ({file.filename})")
                except ImportError as import_err:
                    logger.warning(f"Document summarizer agent not available: {import_err}")
                    db.execute_query(
                        "UPDATE contract_documents SET processing_status = %s WHERE id = %s",
                        ("completed", document["id"])
                    )
                except Exception as agent_error:
                    logger.error(f"Error starting document processing: {agent_error}")
                    db.execute_query(
                        "UPDATE contract_documents SET processing_status = %s, processing_error = %s WHERE id = %s",
                        ("error", str(agent_error), document["id"])
                    )
            else:
                # Unsupported file format - mark as completed without AI processing
                logger.info(f"Unsupported format for AI processing: {file.filename}")
                db.execute_query(
                    "UPDATE contract_documents SET processing_status = %s, processing_error = %s WHERE id = %s",
                    ("completed", f"Formato não suportado para análise de IA: {file.filename}", document["id"])
                )
        except Exception as process_error:
            logger.error(f"Error processing document: {process_error}")
            db.execute_query(
                "UPDATE contract_documents SET processing_status = %s, processing_error = %s WHERE id = %s",
                ("error", str(process_error), document["id"])
            )

        # Return the created document with validation results
        result = db.execute_query(
            "SELECT * FROM contract_documents WHERE id = %s",
            (document["id"],)
        )
        created_document = result[0] if result else document

        # Parse JSON fields
        if isinstance(created_document.get("metadata"), str):
            try:
                created_document["metadata"] = json.loads(created_document["metadata"])
            except:
                pass

        if isinstance(created_document.get("identity_validation"), str):
            try:
                created_document["identity_validation"] = json.loads(created_document["identity_validation"])
            except:
                pass

        # Include validation result in response
        response_data = created_document.copy() if created_document else document
        if validation_result:
            response_data["identity_validation"] = validation_result
            # Add warning flag if validation detected potential issues
            if validation_result.get("validation_status") in ["warning", "alert"]:
                response_data["validation_warning"] = True
                response_data["validation_message"] = validation_result.get("message")

        return JSONResponse(content=response_data, status_code=201)

    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/api/documents/{document_id}", tags=["documents"], summary="Obter documento", description="Retorna detalhes de um documento específico")
async def get_document(document_id: str, current_user: dict = Depends(verify_token)):
    """Get a single document by ID"""
    try:
        db = get_db()
        result = db.execute_query(
            "SELECT * FROM contract_documents WHERE id = %s",
            (document_id,)
        )

        if not result:
            return JSONResponse(content={"error": "Document not found"}, status_code=404)

        document = result[0]

        # Parse JSON fields
        if isinstance(document.get("metadata"), str):
            try:
                document["metadata"] = json.loads(document["metadata"])
            except:
                pass
        if isinstance(document.get("extracted_insights"), str):
            try:
                document["extracted_insights"] = json.loads(document["extracted_insights"])
            except:
                pass

        return JSONResponse(content=document)

    except Exception as e:
        logger.error(f"Error getting document {document_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/documents/{document_id}/reprocess", tags=["documents"], summary="Reprocessar documento", description="Reprocessa um documento com IA")
async def reprocess_document(document_id: str, current_user: dict = Depends(verify_token)):
    """Reprocess a document with AI summarization"""
    try:
        db = get_db()

        # Get document
        result = db.execute_query(
            "SELECT * FROM contract_documents WHERE id = %s",
            (document_id,)
        )

        if not result:
            return JSONResponse(content={"error": "Document not found"}, status_code=404)

        document = result[0]
        extracted_text = document.get("content_extracted")

        if not extracted_text:
            return JSONResponse(content={"error": "No extracted text available for reprocessing"}, status_code=400)

        # Update status to processing
        db.execute_query(
            "UPDATE contract_documents SET processing_status = %s, processing_error = NULL WHERE id = %s",
            ("processing", document_id)
        )

        # Parse metadata for category
        metadata = document.get("metadata", {})
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}

        category = metadata.get("category", "general")

        # Reprocess with AI
        try:
            from agno_agents.document_summarizer_agent import process_document_sync
            import asyncio

            loop = asyncio.get_event_loop()
            loop.run_in_executor(
                None,
                process_document_sync,
                document_id,
                extracted_text,
                document.get("document_name"),
                category,
                db
            )
            logger.info(f"Started AI reprocessing for document {document_id}")

            return JSONResponse(content={
                "success": True,
                "message": "Document reprocessing started",
                "document_id": document_id
            })

        except ImportError as import_err:
            logger.warning(f"Document summarizer agent not available: {import_err}")
            return JSONResponse(content={"error": "AI agent not available"}, status_code=500)

    except Exception as e:
        logger.error(f"Error reprocessing document {document_id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/generate-ai-reports", tags=["reports"], summary="Gerar relatórios com IA", description="Gera relatórios de IA baseados nos agentes selecionados")
async def generate_ai_reports(data: Dict[str, Any]):
    """Generate AI reports for selected agents"""
    try:
        contract_id = data.get('contractId')
        agents = data.get('agents', [])
        contract_data = data.get('contractData', {})
        
        logger.info(f"📄 Gerando relatórios para contrato {contract_id} com agentes: {agents}")
        
        # Simular geração de relatórios para cada agente
        reports_generated = []
        
        for agent in agents:
            logger.info(f"🤖 Processando agente: {agent}")
            
            # Aqui você implementaria a lógica real de geração de relatórios
            # Por agora, vamos simular o sucesso da operação
            # Ajustar timestamp para próximo dia útil se necessário
            current_time = datetime.now()
            if not is_business_day(current_time):
                current_time = adjust_to_business_day(current_time)
                logger.info(f"🏢 Data ajustada para próximo dia útil: {current_time.strftime('%d/%m/%Y')}")
            
            report_info = {
                "agent": agent,
                "status": "generated",
                "timestamp": current_time.timestamp(),
                "contract_id": contract_id,
                "scheduled_date": current_time.strftime('%Y-%m-%d')
            }
            
            # Dependendo do agente, gerar diferentes tipos de relatórios
            # Nomes exatos dos agentes do frontend
            if agent == "Plano de Manutenção":
                report_info["type"] = "maintenance_plan"
                report_info["summary"] = f"Plano completo de manutenção com cronograma detalhado para {contract_data.get('client_name', 'cliente')}"
                report_info["content"] = f"Cronograma de manutenção preventiva para equipamento {contract_data.get('equipment_type', 'equipamento')}"
            elif agent == "Documentação Técnica":
                report_info["type"] = "technical_documentation"
                report_info["summary"] = f"Memorial descritivo e especificações técnicas de {contract_data.get('equipment_type', 'equipamento')}"
                report_info["content"] = f"Documentação técnica completa do contrato {contract_data.get('contract_number', 'N/A')}"
            elif agent == "Cronogramas Integrados":
                report_info["type"] = "integrated_schedules"
                report_info["summary"] = f"Cronogramas físico-financeiro, compras e desembolso para {contract_data.get('client_name', 'cliente')}"
                report_info["content"] = f"Cronograma integrado com valor total de R$ {contract_data.get('value', 0)}"
            elif agent == "Relatórios e Análises":
                report_info["type"] = "reports_analysis"
                report_info["summary"] = f"Relatórios de progresso e análises detalhadas do contrato {contract_data.get('contract_number', 'N/A')}"
                report_info["content"] = f"Análise completa de desempenho e progresso para {contract_data.get('client_name', 'cliente')}"
            else:
                report_info["type"] = "general"
                report_info["summary"] = f"Relatório geral para {agent}"
                report_info["content"] = f"Conteúdo do relatório de {agent}"
            
            reports_generated.append(report_info)
        
        # Atualizar metadata do contrato (simulado)
        logger.info(f"✅ {len(reports_generated)} relatórios gerados com sucesso")
        
        return JSONResponse(content={
            "success": True,
            "reports": reports_generated,
            "message": f"Relatórios gerados com sucesso para {len(agents)} agentes"
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao gerar relatórios de IA: {str(e)}")
        return JSONResponse(
            content={"error": str(e), "success": False}, 
            status_code=500
        )

# Chat Sessions API
@app.get("/api/chat-sessions")
async def get_chat_sessions(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get chat sessions from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        chat_sessions = db.get_chat_sessions(user_id)
        return JSONResponse(content=chat_sessions or [])
    except Exception as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        return JSONResponse(content=[], status_code=200)

@app.get("/api/chat-sessions/{id}")
async def get_chat_session_by_id(id: str, current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Get specific chat session by ID from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        chat_session = db.get_chat_session_by_id(id, user_id)
        
        if not chat_session:
            return JSONResponse(content={"error": "Chat session not found"}, status_code=404)
            
        return JSONResponse(content=chat_session)
    except Exception as e:
        logger.error(f"Error getting chat session {id}: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/chat-sessions")
async def create_chat_session(data: Dict[str, Any], current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Create chat session in PostgreSQL"""
    try:
        import uuid
        
        # Map frontend field names to database schema
        mapped_data = {}
        
        # Map 'title' to 'name' (required field)
        if 'title' in data:
            mapped_data['name'] = data['title']
        elif 'name' in data:
            mapped_data['name'] = data['name']
        else:
            mapped_data['name'] = 'New Chat Session'
            
        # Map 'assistant_id' to 'agent_id' 
        if 'assistant_id' in data:
            mapped_data['agent_id'] = data['assistant_id']
        elif 'agent_id' in data:
            mapped_data['agent_id'] = data['agent_id']
        else:
            mapped_data['agent_id'] = 'luminos-assistant'
            
        # Optional contract_id
        if 'contract_id' in data:
            mapped_data['contract_id'] = data['contract_id']
        
        # Set user_id - REQUIRE authentication, no mocks
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        if not current_user or not user_id:
            logger.error("No authenticated user found for chat session creation")
            return JSONResponse(content={"error": "Authentication required"}, status_code=401)
            
        mapped_data['user_id'] = user_id
        
        db = get_db()
        chat_session = db.create_chat_session(mapped_data, user_id)
        return JSONResponse(content=chat_session or {})
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.put("/api/chat-sessions/{id}")
async def update_chat_session(id: str, data: Dict[str, Any], current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Update chat session in PostgreSQL"""
    try:
        # Map frontend field names to database schema
        mapped_data = {}
        
        # Map 'title' to 'name'
        if 'title' in data:
            mapped_data['name'] = data['title']
        elif 'name' in data:
            mapped_data['name'] = data['name']
            
        # Map 'assistant_id' to 'agent_id' 
        if 'assistant_id' in data:
            mapped_data['agent_id'] = data['assistant_id']
        elif 'agent_id' in data:
            mapped_data['agent_id'] = data['agent_id']
            
        # Optional contract_id
        if 'contract_id' in data:
            mapped_data['contract_id'] = data['contract_id']
        
        # Don't update user_id in update operations for security
        
        db = get_db()
        chat_session = db.update_chat_session(id, mapped_data)
        return JSONResponse(content=chat_session or {})
    except Exception as e:
        logger.error(f"Error updating chat session: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/dashboard-metrics", tags=["dashboard"], summary="Métricas do dashboard", description="Retorna métricas consolidadas para o dashboard")
async def get_dashboard_metrics(current_user: dict = Depends(verify_token)):
    """Get dashboard metrics from PostgreSQL"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id') if current_user else None
        
        logger.info(f"Getting dashboard metrics for user_id: {user_id}")
        
        # Get real counts from PostgreSQL
        contracts = db.get_contracts(user_id)
        maintenances = db.get_maintenances(user_id)
        clients = db.get_clients(user_id)
        
        # Calculate metrics from real data (database returns lists directly, not objects with .data)
        contracts_list = contracts if isinstance(contracts, list) else []
        maintenances_list = maintenances if isinstance(maintenances, list) else []
        clients_list = clients if isinstance(clients, list) else []
        
        from datetime import datetime, date, timedelta

        total_contracts = len(contracts_list)
        active_contracts = len([c for c in contracts_list if c.get('status') == 'active'])
        total_maintenances = len(maintenances_list)
        
        # Calculate overdue maintenances based on scheduled_date being in the past
        today = datetime.now().date()
        overdue_maintenances = 0
        pending_maintenances = 0
        upcoming_maintenances = 0
        completed_maintenances = 0
        
        for m in maintenances_list:
            status = m.get('status')
            scheduled_date_str = m.get('scheduled_date')

            # Count completed maintenances
            if status == 'completed':
                completed_maintenances += 1
                continue

            # Skip cancelled maintenances
            if status == 'cancelled':
                continue

            # Parse scheduled date if exists
            scheduled_date = None
            if scheduled_date_str:
                try:
                    if isinstance(scheduled_date_str, str):
                        scheduled_date = datetime.strptime(scheduled_date_str.split('T')[0], '%Y-%m-%d').date()
                    elif hasattr(scheduled_date_str, 'date'):
                        scheduled_date = scheduled_date_str.date()
                    else:
                        scheduled_date = scheduled_date_str
                except:
                    scheduled_date = None

            # Categorize by status and date
            if scheduled_date and scheduled_date < today:
                # Overdue: scheduled date in past and not completed/cancelled
                overdue_maintenances += 1
            elif status in ['scheduled', 'pending']:
                # Pending: scheduled or pending status, not overdue
                pending_maintenances += 1
            elif scheduled_date and scheduled_date <= today + timedelta(days=7):
                # Upcoming: within next 7 days
                upcoming_maintenances += 1
        
        total_clients = len(clients_list)
        
        # Safe calculation of monthly revenue with proper null handling
        monthly_revenue = 0
        for contract in contracts_list:
            if contract.get('status') == 'active':
                value = contract.get('value') or contract.get('monthly_value') or 0
                if value and isinstance(value, (int, float)) and not (isinstance(value, float) and math.isnan(value)):
                    monthly_revenue += value
        
        # Calculate completion rate
        completion_rate = 0
        if total_maintenances > 0:
            completion_rate = (completed_maintenances / total_maintenances) * 100

        # Calculate expiring contracts (next 30 days)
        current_date = datetime.now()
        expiring_threshold = current_date + timedelta(days=30)
        
        expiring_contracts = 0
        expired_contracts = 0
        for contract in contracts_list:
            end_date_str = contract.get('end_date')
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00')).replace(tzinfo=None)
                    if end_date < current_date:
                        expired_contracts += 1
                    elif end_date <= expiring_threshold:
                        expiring_contracts += 1
                except:
                    continue
        
        metrics = {
            "totalContracts": total_contracts,
            "activeContracts": active_contracts,
            "expiringContracts": expiring_contracts,
            "expiredContracts": expired_contracts,
            "totalMaintenances": total_maintenances,
            "completedMaintenances": completed_maintenances,
            "pendingMaintenances": pending_maintenances,
            "upcomingMaintenances": upcoming_maintenances,
            "overdueMaintenances": overdue_maintenances,
            "totalClients": total_clients,
            "monthlyRevenue": monthly_revenue,
            "completionRate": completion_rate,
            "averageResponseTime": 0.0,  # Can be calculated from maintenance data
            "contractsGrowth": 0.0,  # Can be calculated with historical data
            "revenueGrowth": 0.0,  # Can be calculated with historical data
            "maintenanceEfficiency": completion_rate
        }
        
        return JSONResponse(content=metrics)
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {str(e)}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )

@app.get("/health", tags=["health"], summary="Health check", description="Verifica o status e saúde do sistema")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0 - Agno Integration",
        "timestamp": time.time()
    }

@app.post("/api/generated-reports", tags=["reports"], summary="Criar relatório gerado", description="Cria um novo relatório gerado a partir de análise")
async def create_generated_report(
    request: Request,
    current_user: dict = Depends(verify_token)
):
    """Create a new generated report from document analysis"""
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id')

        logger.info(f"Creating generated report for user: {user_id}")

        # Get body as JSON
        body = await request.json()

        # Extract data from request
        report_data = {
            'title': body.get('title'),
            'description': body.get('description'),
            'content': body.get('content'),
            'report_type': body.get('report_type', 'document_analysis'),
            'agent_type': body.get('agent_type', 'document_intelligence'),
            'metadata': body.get('metadata', {}),
            'status': body.get('status', 'generated')
        }

        # Create report in database
        result = db.create_generated_report(report_data, user_id)

        if result:
            logger.info(f"Report created successfully: {result.get('id')}")
            return JSONResponse(content={
                "success": True,
                "data": result
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to create report")

    except Exception as e:
        logger.error(f"Error creating generated report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================
# BACKLOG RECORRENTES REPORT ENDPOINTS
# ==============================================

@app.get("/api/reports/backlogs-recorrentes", tags=["reports"], summary="Backlogs Recorrentes", description="Retorna dados para o Relatório 2 - Backlogs Recorrentes e Não Resolvidos")
async def get_backlogs_recorrentes(
    start_date: str = None,
    end_date: str = None,
    contract_id: str = None,
    status: str = None,
    only_critical: bool = False,
    only_rescheduled: bool = False,
    current_user: dict = Depends(verify_token)
):
    """
    Get backlogs recorrentes data for Report 2

    Parameters:
    - start_date: Filter by start date (YYYY-MM-DD)
    - end_date: Filter by end date (YYYY-MM-DD)
    - contract_id: Filter by specific contract
    - status: Filter by maintenance status
    - only_critical: Show only critical backlogs (>30 days overdue)
    - only_rescheduled: Show only rescheduled maintenances
    """
    try:
        db = get_db()
        user_id = current_user.get('sub') or current_user.get('id')

        logger.info(f"Getting backlogs recorrentes for user: {user_id}")

        result = db.get_backlogs_recorrentes(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            contract_id=contract_id,
            status=status,
            only_critical=only_critical,
            only_rescheduled=only_rescheduled
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting backlogs recorrentes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/backlogs-recorrentes/kpis", tags=["reports"], summary="KPIs Backlogs", description="Retorna KPIs para o relatório de backlogs")
async def get_backlog_kpis(
    start_date: str = None,
    end_date: str = None,
    contract_id: str = None,
    technician: str = None,
    current_user: dict = Depends(verify_token)
):
    """Get KPIs for the backlog report dashboard"""
    try:
        db = get_db()

        result = db.get_backlog_kpis(
            start_date=start_date,
            end_date=end_date,
            contract_id=contract_id,
            technician=technician
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting backlog KPIs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/curva-s", tags=["reports"], summary="Dados Curva S", description="Retorna dados para o gráfico Curva S (Planejado vs Realizado)")
async def get_curva_s_data(
    start_date: str,
    end_date: str,
    contract_id: str = None,
    current_user: dict = Depends(verify_token)
):
    """
    Get Curva S (S-Curve) data for planned vs actual progress chart

    Parameters:
    - start_date: Start date of the period (required, YYYY-MM-DD)
    - end_date: End date of the period (required, YYYY-MM-DD)
    - contract_id: Filter by specific contract (optional)
    """
    try:
        db = get_db()

        result = db.get_curva_s_data(
            start_date=start_date,
            end_date=end_date,
            contract_id=contract_id
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting Curva S data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/reports/backlogs-recorrentes/{maintenance_id}/recommendation", tags=["reports"], summary="Atualizar Recomendação", description="Atualiza a recomendação de um backlog")
async def update_backlog_recommendation(
    maintenance_id: str,
    request: Request,
    current_user: dict = Depends(verify_token)
):
    """Update the recommendation for a specific maintenance backlog"""
    try:
        db = get_db()
        body = await request.json()

        recommendation = body.get('recommendation')
        if not recommendation:
            raise HTTPException(status_code=400, detail="Recommendation is required")

        result = db.update_backlog_recommendation(maintenance_id, recommendation)

        if result:
            return JSONResponse(content={
                "success": True,
                "data": result
            })
        else:
            raise HTTPException(status_code=404, detail="Maintenance not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating backlog recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reports/backlogs-recorrentes/{maintenance_id}/regenerate-recommendation", tags=["reports"], summary="Regenerar Recomendação", description="Regenera a recomendação automática de um backlog")
async def regenerate_backlog_recommendation(
    maintenance_id: str,
    current_user: dict = Depends(verify_token)
):
    """Regenerate the automatic recommendation for a maintenance"""
    try:
        db = get_db()

        result = db.regenerate_backlog_recommendation(maintenance_id)

        if result:
            return JSONResponse(content={
                "success": True,
                "data": result
            })
        else:
            raise HTTPException(status_code=404, detail="Maintenance not found or regeneration failed")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating backlog recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/backlogs-recorrentes/progress-by-type", tags=["reports"], summary="Progresso por Tipo", description="Retorna progresso de manutenções agrupado por tipo")
async def get_maintenance_progress_by_type(
    start_date: str = None,
    end_date: str = None,
    contract_id: str = None,
    technician: str = None,
    current_user: dict = Depends(verify_token)
):
    """
    Get maintenance progress grouped by maintenance type

    Parameters:
    - start_date: Start date (optional, YYYY-MM-DD)
    - end_date: End date (optional, YYYY-MM-DD)
    - contract_id: Filter by specific contract (optional)
    - technician: Filter by technician name (optional)

    If no dates provided, returns ALL data without date filter
    """
    try:
        db = get_db()

        result = db.get_maintenance_progress_by_type(
            start_date=start_date,
            end_date=end_date,
            contract_id=contract_id,
            technician=technician
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting maintenance progress by type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/backlogs-recorrentes/curva-s", tags=["reports"], summary="Curva S Backlogs", description="Retorna dados para o gráfico Curva S")
async def get_backlog_curva_s(
    start_date: str = None,
    end_date: str = None,
    contract_id: str = None,
    technician: str = None,
    current_user: dict = Depends(verify_token)
):
    """
    Get Curva S (S-Curve) data for backlog report

    Parameters:
    - start_date: Start date (optional, YYYY-MM-DD)
    - end_date: End date (optional, YYYY-MM-DD)
    - contract_id: Filter by specific contract (optional)
    - technician: Filter by technician name (optional)

    If no dates provided, uses full date range from maintenances data
    """
    try:
        db = get_db()

        result = db.get_curva_s_data(
            start_date=start_date,
            end_date=end_date,
            contract_id=contract_id,
            technician=technician
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting backlog curva-s data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/backlogs-recorrentes/by-contract", tags=["reports"], summary="Manutenções por Contrato", description="Retorna todas as manutenções agrupadas por contrato")
async def get_maintenances_by_contract(
    start_date: str = None,
    end_date: str = None,
    status_filter: str = None,
    contract_id: str = None,
    technician: str = None,
    current_user: dict = Depends(verify_token)
):
    """
    Get all maintenances grouped by contract

    Parameters:
    - start_date: Start date (YYYY-MM-DD)
    - end_date: End date (YYYY-MM-DD)
    - status_filter: Filter by maintenance status
    - contract_id: Filter by specific contract (optional)
    - technician: Filter by technician name (optional)

    Returns list of contracts with their associated maintenances
    """
    try:
        db = get_db()

        result = db.get_all_maintenances_by_contract(
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            contract_id=contract_id,
            technician=technician
        )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"Error getting maintenances by contract: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process-base64-pdf", tags=["pdf"], summary="Processar PDF em Base64", description="Processa um PDF enviado como base64")
async def process_base64_pdf(request: Dict[str, Any] = Body(...)):
    """Enhanced Base64 PDF processing with timeout handling"""
    try:
        logger.info("🚀 Iniciando processamento Base64 PDF com Agno...")

        # Validate request
        base64_data = request.get("base64Data")
        if not base64_data:
            raise HTTPException(status_code=400, detail="Dados Base64 ausentes")
        
        filename = request.get("filename", "document.pdf")
        contract_id = request.get("contractId", "unknown")
        
        logger.info(f"Processando arquivo: {filename} para contrato: {contract_id}")
        
        # Remove prefix if present (data:application/pdf;base64,)
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
        
        # Decode Base64 to bytes with better error handling
        try:
            pdf_bytes = base64.b64decode(base64_data)
            logger.info(f"PDF decodificado com sucesso: {len(pdf_bytes)} bytes")
        except Exception as e:
            logger.error(f"Erro na decodificação Base64: {str(e)}")
            raise HTTPException(status_code=400, detail="Dados Base64 inválidos")
        
        # Calculate timeout based on file size
        file_size_mb = len(pdf_bytes) / (1024 * 1024)
        timeout_ms = Config.get_timeout_for_file_size(file_size_mb)
        logger.info(f"Tamanho do arquivo: {file_size_mb:.2f} MB, timeout: {timeout_ms/1000}s")

        # Extract text from PDF with enhanced error handling and OCR fallback
        try:
            extracted_text, method = PDFExtractor.extract_text_from_bytes(pdf_bytes)
            logger.info(f"Texto extraído com {method}: {len(extracted_text)} caracteres")
        except Exception as e:
            logger.error(f"Erro na extração de texto: {str(e)}")
            # For scanned PDFs, use AI Vision to process the content
            if "sem camada de texto" in str(e) or "escaneado" in str(e):
                logger.warning("📷 PDF escaneado detectado - processando com AI Vision")
                extracted_text = "PDF_SCANNED_DOCUMENT"
                method = "ai_vision_ocr"
                logger.info("✅ PDF escaneado será processado com AI Vision")
            else:
                raise HTTPException(status_code=422, detail=f"Erro na extração: {str(e)}")
        
        if not extracted_text.strip() and extracted_text != "PDF_SCANNED_DOCUMENT":
            raise HTTPException(
                status_code=422, 
                detail={
                    "message": "PDF sem texto legível",
                    "description": "O PDF foi processado mas não contém texto que possa ser extraído.",
                    "suggestions": [
                        "Verifique se o arquivo não está corrompido",
                        "Tente converter o PDF para uma versão mais recente",
                        "Se for um documento escaneado, use OCR para tornar o texto pesquisável"
                    ],
                    "error_type": "empty_text"
                }
            )
        
        # File metadata
        metadata = {
            "filename": filename,
            "file_size": len(pdf_bytes),
            "content_type": "application/pdf",
            "extraction_method": method,
            "contract_id": contract_id,
            "processed_at": time.time(),
            "is_scanned_pdf": extracted_text == "PDF_SCANNED_DOCUMENT",
            "extracted_text": extracted_text  # Pass the already extracted text
        }
        
        # Process with Agno system using timeout
        logger.info("Iniciando processamento com sistema Agno...")

        async def agno_processing():
            return await luminus_agno_system.process_contract(pdf_bytes, metadata)

        result = await process_with_timeout(agno_processing(), timeout_ms)
        
        if result["success"]:
            logger.info("✅ Processamento Agno concluído com sucesso")

            # Log equipment data being returned
            extracted_data = result["workflow_state"].get("extracted_data", {})
            if extracted_data and "equipment" in extracted_data:
                logger.info(f"📤 Returning equipment data: {extracted_data['equipment']}")

            # Get the extracted text from result
            full_extracted_text = result.get("extracted_text", extracted_text)
            logger.info(f"📄 Full extracted text length: {len(full_extracted_text)} characters")

            # Auto-save contract if user is authenticated and contract_id provided
            saved_contract_id = None
            if contract_id and contract_id != "unknown":
                try:
                    # Get user from request context if available
                    auth_header = request.headers.get("Authorization") if hasattr(request, 'headers') else None
                    if auth_header and auth_header.startswith("Bearer "):
                        token = auth_header.split(" ")[1]
                        try:
                            user_data = verify_token(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
                            user_id = user_data.get("sub") or user_data.get("id")

                            # Get database instance first
                            db = get_db()

                            # Prepare contract data with all extracted fields including OCR text
                            contract_data = _prepare_contract_data_for_save(
                                extracted_data,
                                extracted_text=full_extracted_text,  # Pass the full text
                                extraction_method=method,
                                db=db,
                                user_id=user_id
                            )

                            logger.info(f"📊 Contract data prepared with extracted_text: {len(contract_data.get('extracted_text', ''))} chars")

                            # Save to database
                            saved_contract = db.create_contract(contract_data, user_id)
                            if saved_contract:
                                saved_contract_id = saved_contract.get('id')
                                logger.info(f"✅ Contract auto-saved with ID: {saved_contract_id}")
                        except Exception as save_error:
                            logger.warning(f"Could not auto-save contract: {save_error}")
                except Exception as e:
                    logger.warning(f"Auto-save skipped: {e}")

            # Prepare response with FULL extracted text
            response_data = {
                "success": True,
                "message": "PDF processado com sistema Agno",
                "extractedText": full_extracted_text,  # Return FULL text, not truncated
                "extractedTextPreview": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text,  # Preview for UI
                "extractedTextLength": len(full_extracted_text),
                "data": result["workflow_state"].get("extracted_data"),
                "maintenance_plan": result["workflow_state"].get("maintenance_plan"),
                "validation": result["workflow_state"].get("validation_result"),
                "summary": result["workflow_state"].get("workflow_summary"),
                "metadata": metadata,
                "agno_powered": True,
                "extraction_method": method,
                "processing_time": result.get("processing_time", 0),
                "saved_contract_id": saved_contract_id,  # Include saved ID if auto-saved
                "pdf_analysis": result.get("pdf_analysis_summary", {})
            }

            logger.info(f"✅ Response prepared with {len(full_extracted_text)} chars of extracted text")
            logger.info(f"📊 Fields extracted: {list(result['workflow_state'].get('extracted_data', {}).keys())}")

            return JSONResponse(content=response_data, status_code=200)
        else:
            error_msg = result.get('error', 'Erro desconhecido no processamento')
            logger.error(f"❌ Erro no processamento Agno: {error_msg}")
            return JSONResponse(content={
                "success": False,
                "error": error_msg,
                "extractedText": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text,
                "workflow_state": result.get("workflow_state", {}),
                "metadata": metadata,
                "agno_powered": True
            }, status_code=422)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado no processamento Base64: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro interno do servidor: {str(e)}",
                "agno_powered": True
            },
            status_code=500
        )

@app.post("/api/process-pdf-storage", tags=["pdf"], summary="Processar PDF do Storage", description="Processa um PDF a partir de uma URL do storage")
async def process_pdf_from_storage(request: Dict[str, Any] = Body(...)):
    """Process PDF from storage URL using Agno system with SSE progress tracking"""
    try:
        file_url = request.get("fileUrl")
        filename = request.get("filename", "document.pdf")
        session_id = request.get("sessionId")

        if not file_url:
            raise HTTPException(status_code=400, detail="fileUrl é obrigatório")

        logger.info(f"📥 Processing PDF from storage: {filename} (Session: {session_id})")

        # Initialize progress tracking if session ID is provided
        if session_id and session_id in progress_streams:
            await update_progress(session_id, 5, "downloading", "📥 Baixando arquivo do armazenamento...")
        
        # Download file from URL
        import requests
        response = requests.get(file_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Não foi possível baixar o arquivo")

        pdf_content = response.content

        # Update progress for file downloaded
        if session_id and session_id in progress_streams:
            await update_progress(session_id, 15, "processing", "📄 Arquivo baixado, iniciando análise...")

        # Extract text from PDF BEFORE calling process_contract
        logger.info("📄 Extracting text from PDF before processing...")
        from utils.pdf_extractor import PDFExtractor

        try:
            extracted_text, extraction_method = PDFExtractor.extract_text_from_bytes(pdf_content)
            logger.info(f"Texto extraído com {extraction_method}: {len(extracted_text)} caracteres")
        except Exception as e:
            logger.error(f"Erro na extração de texto: {str(e)}")
            extracted_text = ""
            extraction_method = "failed"

        # File metadata with extracted text
        metadata = {
            "filename": filename,
            "file_size": len(pdf_content),
            "content_type": "application/pdf",
            "session_id": session_id,  # Pass session_id to Agno system
            "extracted_text": extracted_text,  # Pass the already extracted text
            "extraction_method": extraction_method  # Pass the extraction method
        }

        # Update progress for processing start
        if session_id and session_id in progress_streams:
            await update_progress(session_id, 25, "processing", "🤖 Conectando com sistema de IA...")

        # Process with Agno system (will use extracted_text from metadata)
        result = await luminus_agno_system.process_contract(pdf_content, metadata)
        
        if result["success"]:
            # Final progress update for successful completion
            if session_id and session_id in progress_streams:
                await update_progress(session_id, 100, "completed", "✅ Processamento concluído com sucesso!", result["workflow_state"]["extracted_data"])

            logger.info("✅ PDF from storage processed successfully")
            return JSONResponse(content={
                "success": True,
                "message": "Contrato processado com sucesso",
                "data": result["workflow_state"]["extracted_data"],
                "maintenance_plan": result["workflow_state"]["maintenance_plan"],
                "validation": result["workflow_state"]["validation_result"],
                "summary": result["workflow_state"]["workflow_summary"],
                "agno_powered": True
            }, status_code=200)
        else:
            # Progress update for error
            if session_id and session_id in progress_streams:
                await update_progress(session_id, 0, "error", f"❌ Erro no processamento: {result.get('error', 'Erro desconhecido')}")

            error_msg = result.get("error", "Erro ao processar PDF")

            # Check if it's a scanned PDF error and provide better user feedback
            if "PDF parece ser apenas imagem/escaneado" in error_msg:
                user_friendly_error = "❌ PDF Escaneado Detectado\n\n📷 Este PDF contém apenas imagens sem texto extraível.\n\n✅ Soluções:\n• Converta o PDF para um formato com texto\n• Use um PDF que não seja escaneado\n• Tente um PDF com camada de texto OCR"
            elif "Não foi possível extrair texto do PDF" in error_msg:
                user_friendly_error = "❌ Não foi possível extrair texto do PDF\n\n🔍 Possíveis causas:\n• PDF protegido ou corrompido\n• PDF escaneado sem OCR\n• Formato de arquivo inválido\n\n💡 Tente usar um PDF diferente com texto extraível"
            elif "503" in error_msg or "overloaded" in error_msg.lower() or "UNAVAILABLE" in error_msg:
                user_friendly_error = "⏳ Serviço de IA Temporariamente Indisponível\n\n🤖 O sistema de análise de contratos está com alto volume de requisições no momento.\n\n✅ Soluções:\n• Aguarde alguns minutos e tente novamente\n• O sistema tentou automaticamente 3 vezes\n• Este é um problema temporário do provedor de IA\n\n💡 Por favor, tente novamente em alguns instantes."
            else:
                user_friendly_error = error_msg
                
            return JSONResponse(content={
                "success": False,
                "error": user_friendly_error,
                "technical_error": error_msg,
                "workflow_state": result.get("workflow_state", {}),
                "agno_powered": True,
                "error_type": "pdf_processing"
            }, status_code=422)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar PDF do storage: {str(e)}")
        return JSONResponse(content={
            "success": False,
            "error": f"Erro ao processar arquivo: {str(e)}"
        }, status_code=500)

@app.post("/api/extract-pdf", tags=["pdf"], summary="Extrair dados do PDF", description="Extrai dados de contrato de um arquivo PDF usando AI")
async def extract_pdf_data_agno(file: UploadFile = File(...)):
    """Main endpoint for PDF contract analysis using Agno system"""
    try:
        logger.info("🚀 Iniciando processamento com Agno System...")
        
        # Basic validations
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Apenas arquivos PDF são suportados")
        
        # Read file content
        pdf_content = await file.read()
        
        # No file size limit - removed per request
        logger.info(f"Tamanho do arquivo: {len(pdf_content) / (1024 * 1024):.2f} MB")
        
        # File metadata
        metadata = {
            "filename": file.filename,
            "file_size": len(pdf_content),
            "content_type": file.content_type
        }
        
        # Process with Agno system
        result = await luminus_agno_system.process_contract(pdf_content, metadata)
        
        if result["success"]:
            logger.info("✅ Processamento Agno concluído com sucesso")
            return JSONResponse(content={
                "success": True,
                "message": "Contrato processado com sistema Agno",
                "data": result["workflow_state"]["extracted_data"],
                "maintenance_plan": result["workflow_state"]["maintenance_plan"],
                "validation": result["workflow_state"]["validation_result"],
                "summary": result["workflow_state"]["workflow_summary"],
                "agno_powered": True
            }, status_code=200)
        else:
            logger.error(f"❌ Erro no processamento Agno: {result.get('error', 'Erro desconhecido')}")

            error_msg = result.get("error", "Erro desconhecido")

            # Provide user-friendly error messages
            if "503" in error_msg or "overloaded" in error_msg.lower() or "UNAVAILABLE" in error_msg:
                user_friendly_error = "⏳ Serviço de IA Temporariamente Indisponível\n\n🤖 O sistema de análise de contratos está com alto volume de requisições no momento.\n\n✅ Soluções:\n• Aguarde alguns minutos e tente novamente\n• O sistema tentou automaticamente 3 vezes\n• Este é um problema temporário do provedor de IA\n\n💡 Por favor, tente novamente em alguns instantes."
            else:
                user_friendly_error = error_msg

            return JSONResponse(content={
                "success": False,
                "error": user_friendly_error,
                "technical_error": error_msg,
                "workflow_state": result.get("workflow_state", {}),
                "agno_powered": True
            }, status_code=422)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro interno do servidor: {str(e)}",
                "agno_powered": True
            },
            status_code=500
        )

@app.post("/api/extract-text", tags=["pdf"], summary="Extrair texto do PDF", description="Extrai apenas o texto de um arquivo PDF")
async def extract_text_from_pdf(file: UploadFile = File(...)):
    """Simple endpoint for extracting text from PDF without AI processing"""
    try:
        logger.info(f"📄 Extraindo texto do PDF: {file.filename}")

        # Basic validations
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Apenas arquivos PDF são suportados")

        # Read file content
        pdf_content = await file.read()
        logger.info(f"Tamanho do arquivo: {len(pdf_content) / 1024:.2f} KB")

        # Extract text using PDFExtractor
        extracted_text, extraction_method = PDFExtractor.extract_text_from_bytes(pdf_content)

        if extracted_text:
            logger.info(f"✅ Texto extraído com sucesso usando método: {extraction_method}")
            return JSONResponse(content={
                "success": True,
                "text": extracted_text,
                "method": extraction_method,
                "filename": file.filename,
                "size": len(pdf_content)
            }, status_code=200)
        else:
            logger.error("❌ Não foi possível extrair texto do PDF")
            return JSONResponse(content={
                "success": False,
                "error": "Não foi possível extrair texto do PDF",
                "filename": file.filename
            }, status_code=422)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao extrair texto: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro ao processar PDF: {str(e)}"
            },
            status_code=500
        )

@app.post("/api/chat")
async def chat_with_agno(request: Dict[str, Any] = Body(...)):
    """Chat endpoint with Agno system"""
    try:
        message = request.get("message", "")
        contract_context = request.get("contract_context", {})
        
        if not message.strip():
            raise HTTPException(status_code=400, detail="Mensagem não pode estar vazia")
        
        # Process with chat agent
        response = await luminus_agno_system.chat_with_user(message, contract_context)
        
        return JSONResponse(content={
            "success": True,
            "response": response,
            "agno_powered": True,
            "timestamp": time.time()
        })
        
    except Exception as e:
        logger.error(f"Erro no chat Agno: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro no chat: {str(e)}",
                "agno_powered": True
            },
            status_code=500
        )

@app.post("/api/generate-maintenance-plan")
async def generate_maintenance_plan_agno(request: Dict[str, Any] = Body(...)):
    """Generate maintenance plan using specialized agent"""
    try:
        equipment_data = request.get("equipment_data", {})
        contract_type = request.get("contract_type", "manutenção")
        
        if not equipment_data:
            raise HTTPException(status_code=400, detail="Dados do equipamento são obrigatórios")
        
        # Generate plan with specialized agent
        plan_result = await luminus_agno_system.generate_maintenance_plan(
            equipment_data, contract_type
        )
        
        return JSONResponse(content={
            "success": True,
            "maintenance_plan": plan_result,
            "agno_powered": True
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar plano de manutenção: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro ao gerar plano: {str(e)}",
                "agno_powered": True
            },
            status_code=500
        )

@app.post("/api/smart-chat", tags=["chat"], summary="Smart Chat com Gemini", description="Chat inteligente usando Gemini API com contexto de contrato")
async def smart_chat(request: Dict[str, Any] = Body(...)):
    """
    Smart chat endpoint using Gemini API directly (no Edge Function)

    Handles:
    - Text-only queries (fast path)
    - Queries with file context
    - Contract context integration
    - Multiple AI agent types
    """
    try:
        # Validate and extract request parameters
        message = request.get("message", "").strip()
        if not message:
            return JSONResponse(
                content={"success": False, "error": "Mensagem não pode estar vazia"},
                status_code=400
            )

        agent_id = request.get("agent_id", "general-conversation")
        contract_context = request.get("contract_context", {})
        uploaded_files = request.get("uploaded_files", [])
        file_context = request.get("file_context", None)
        maintain_context = request.get("maintain_context", True)

        logger.info(f"💬 [Smart-Chat] Request received: agent={agent_id}, files={len(uploaded_files)}, has_contract={bool(contract_context.get('contract_data'))}")

        # Initialize Gemini client
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            logger.error("❌ Gemini API Key não configurada")
            return JSONResponse(
                content={"success": False, "error": "Sistema de IA não configurado"},
                status_code=500
            )

        client = genai.Client(api_key=gemini_api_key)

        # Build system prompt based on agent
        system_prompt = build_system_prompt(agent_id, contract_context, file_context)

        # Build user message with context
        user_message = message

        if contract_context.get("contract_data"):
            contract_info = contract_context.get("contract_data")
            user_message += f"\n\nContexto: Contrato {contract_info.get('contract_number', 'N/A')} — Cliente: {contract_info.get('client', {}).get('name', 'N/A')}. Considere esse contexto ao responder."

        if maintain_context:
            conversation_history = contract_context.get("conversation_history", [])
            if conversation_history:
                # Include last 5 messages for context (max 500 chars each)
                history_text = "\n".join([
                    f"{'👤 Usuário' if msg.get('role') == 'user' else '🤖 Assistente'}: {msg.get('content', '')[:500]}"
                    for msg in conversation_history[-5:]
                ])
                if history_text:
                    user_message += f"\n\n=== HISTÓRICO DA CONVERSA (últimas 5 mensagens) ===\n{history_text}"

        logger.info(f"🤖 [Smart-Chat] Calling Gemini API with {len(system_prompt)} char system prompt")

        # Call Gemini API with longer timeout (backend can handle it)
        try:
            response = client.models.generate_content(
                model="gemini-2.5-pro",
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=system_prompt + "\n\n" + user_message)]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=4000,  # Can be higher on backend
                    top_p=0.95,
                    top_k=40
                )
            )

            if not response or not response.text:
                logger.error("❌ Gemini retornou resposta vazia")
                return JSONResponse(
                    content={"success": False, "error": "Resposta vazia do Gemini"},
                    status_code=500
                )

            logger.info(f"✅ [Smart-Chat] Gemini response received: {len(response.text)} chars")

            return JSONResponse(
                content={
                    "success": True,
                    "response": response.text,
                    "agent_used": agent_id,
                    "ai_provider": "Gemini",
                    "ai_model": "gemini-2.5-pro",
                    "files_processed": len(uploaded_files),
                    "context_maintained": maintain_context,
                    "processing_method": "backend_direct"
                }
            )

        except asyncio.TimeoutError:
            logger.error("❌ Gemini API timeout (120s)")
            return JSONResponse(
                content={"success": False, "error": "Operação demorou muito. Tente uma pergunta mais simples."},
                status_code=504
            )
        except Exception as gemini_error:
            logger.error(f"❌ Erro ao chamar Gemini: {str(gemini_error)}")
            return JSONResponse(
                content={"success": False, "error": f"Erro ao processar: {str(gemini_error)[:200]}"},
                status_code=500
            )

    except Exception as e:
        logger.error(f"❌ [Smart-Chat] Erro geral: {str(e)}")
        return JSONResponse(
            content={"success": False, "error": f"Erro ao processar mensagem: {str(e)[:200]}"},
            status_code=500
        )


def build_system_prompt(agent_id: str, contract_context: Dict[str, Any], file_context: Optional[Dict[str, Any]]) -> str:
    """Build system prompt based on agent type and context"""

    base_prompt = f"""Você é o Assistente IA Luminos, especializado em análise de contratos, gestão operacional e suporte estratégico para equipes de manutenção e locação de geradores.

🚨 === REGRA CRÍTICA DE FORMATO DE RESPOSTA === 🚨

ATENÇÃO: Esta é uma interface de CHAT com o CLIENTE FINAL.

❌ PROIBIDO ABSOLUTAMENTE:
- Retornar JSON bruto
- Retornar estruturas de dados sem contexto
- Usar formato de programação nas respostas

✅ OBRIGATÓRIO EM TODAS AS RESPOSTAS:
1. SEMPRE SEJA CONVERSACIONAL: Fale diretamente com o cliente de forma amigável
2. USE LINGUAGEM NATURAL: Explique as informações de forma clara e acessível
3. SEJA EXPLICATIVO: Apresente contexto antes de dados específicos
4. FORMATE ADEQUADAMENTE: Use listas com marcadores (• ou -), **negrito** para destaques, parágrafos curtos
"""

    # Add contract context if available
    if contract_context.get("contract_data"):
        contract = contract_context["contract_data"]
        base_prompt += f"""

=== CONTEXTO DO CONTRATO ATIVO ===
📋 Contrato: {contract.get('contract_number', 'N/A')}
👤 Cliente: {contract.get('client', {}).get('name', 'N/A')}
💼 Tipo: {contract.get('contract_type', 'N/A')}
💰 Valor: R$ {contract.get('value', 'N/A')}
🔧 Status: {contract.get('status', 'N/A')}
"""

    # Add file context if available
    if file_context:
        base_prompt += f"""

=== ARQUIVO EM CONTEXTO ===
📄 Nome: {file_context.get('name', 'Desconhecido')}
⚠️ IMPORTANTE: Este arquivo deve ser considerado em TODAS as respostas desta sessão.
"""

    return base_prompt

@app.get("/api/agno-status", tags=["ai-agents"], summary="Status do sistema Agno", description="Retorna o status detalhado do sistema Agno AI")
async def get_agno_status():
    """Detailed Agno system status endpoint"""
    try:
        status = luminus_agno_system.get_system_status()
        return JSONResponse(content={
            "success": True,
            "agno_system_status": status,
            "timestamp": time.time()
        })
    except Exception as e:
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro ao obter status: {str(e)}"
            },
            status_code=500
        )

@app.post("/api/generate-document", tags=["ai-agents"], summary="Gerar documento com AI", description="Gera documentos especializados usando agentes AI")
async def generate_document(request: Dict[str, Any]):
    """Generate specialized document using AI agents"""
    try:
        agent_type = request.get("agent_type")
        contract_data = request.get("contract_data", {})
        
        logger.info(f"Requisição recebida - agent_type: {agent_type}, contract_data keys: {contract_data.keys() if contract_data else 'None'}")
        
        if not agent_type:
            logger.error("agent_type não fornecido")
            raise HTTPException(status_code=400, detail="Tipo de agente é obrigatório")
        
        if not contract_data:
            logger.error("contract_data não fornecido")
            raise HTTPException(status_code=400, detail="Dados do contrato são obrigatórios")
        
        db = get_db()

        # Map English agent names to Portuguese for backwards compatibility
        agent_mapping = {
            "maintenance-planner": "manutencao",
            "document-generator": "documentacao",
            "schedule-generator": "cronogramas",
            "report-generator": "relatorios"
        }
        
        # Use mapped name if available
        mapped_agent_type = agent_mapping.get(agent_type, agent_type)
        logger.info(f"Gerando documento com agente: {mapped_agent_type} (original: {agent_type})")
        
        # Generate document using Agno AI system instead of static templates
        logger.info(f"Utilizando sistema Agno para gerar documento do agente: {mapped_agent_type}")

        # Prepare comprehensive contract text for AI analysis
        contract_text = f"""
        DADOS DO CONTRATO:
        - Número: {contract_data.get('contract_number', 'N/A')}
        - Cliente: {contract_data.get('client_name', 'N/A')}
        - Tipo: {contract_data.get('contract_type', 'N/A')}
        - Data início: {contract_data.get('start_date', 'N/A')}
        - Data fim: {contract_data.get('end_date', 'N/A')}
        - Valor: R$ {contract_data.get('value', 0)}

        EQUIPAMENTO:
        - Tipo: {contract_data.get('equipment_type', 'N/A')}
        - Modelo: {contract_data.get('equipment_model', 'N/A')}
        - Local: {contract_data.get('equipment_location', 'N/A')}
        - Potência: {contract_data.get('equipment_power', 'N/A')}
        - Tensão: {contract_data.get('equipment_voltage', 'N/A')}
        - Marca: {contract_data.get('equipment_brand', 'N/A')}
        - Condição: {contract_data.get('equipment_condition', 'N/A')}

        OBSERVAÇÕES:
        - Termos de pagamento: {contract_data.get('payment_terms', 'N/A')}
        - Notas técnicas: {contract_data.get('technical_notes', 'N/A')}
        - Condições especiais: {contract_data.get('special_conditions', 'N/A')}
        - Termos de garantia: {contract_data.get('warranty_terms', 'N/A')}
        """

        # Use Agno system with specialized prompts for document generation
        try:
            from utils.prompt_loader import get_prompt_loader

            prompt_loader = get_prompt_loader()
            # Force reload to avoid cache issues
            doc_prompts = prompt_loader.load_prompt_file("agents_prompts", force_reload=True)

            logger.info(f"🔍 DEBUG - doc_prompts type: {type(doc_prompts)}")
            logger.info(f"🔍 DEBUG - doc_prompts keys: {list(doc_prompts.keys()) if doc_prompts else 'None'}")

            # Verificar se document_generation existe e não é None
            document_generation = doc_prompts.get('document_generation') if doc_prompts else None
            logger.info(f"🔍 DEBUG - document_generation type: {type(document_generation)}")
            logger.info(f"🔍 DEBUG - document_generation value: {document_generation}")

            # Get specialized prompts for this agent type
            if not doc_prompts or 'document_generation' not in doc_prompts:
                raise ValueError(f"Arquivo de prompts não carregado corretamente")

            if document_generation is None:
                raise ValueError(f"document_generation é None no arquivo de prompts")

            agent_prompts = document_generation.get(mapped_agent_type, {})
            logger.info(f"🔍 DEBUG - agent_prompts for {mapped_agent_type}: {type(agent_prompts)}")

            system_prompt = agent_prompts.get('system_prompt', '') if agent_prompts else ''
            user_template = agent_prompts.get('user_prompt_template', '') if agent_prompts else ''

            logger.info(f"🔍 DEBUG - system_prompt length: {len(system_prompt) if system_prompt else 0}")
            logger.info(f"🔍 DEBUG - user_template length: {len(user_template) if user_template else 0}")

            if not system_prompt or not user_template:
                raise ValueError(f"Prompts não encontrados para agente: {mapped_agent_type}")

            # Prepare template variables
            import json

            # Tratamento seguro para maintenance_plan
            maintenance_plan = contract_data.get('maintenance_plan')
            if maintenance_plan and isinstance(maintenance_plan, dict):
                frequency = contract_data.get('frequency', maintenance_plan.get('frequency', 'mensal'))
            else:
                frequency = contract_data.get('frequency', 'mensal')

            template_vars = {
                'contract_data': json.dumps(contract_data, ensure_ascii=False, indent=2),
                'start_date': contract_data.get('start_date', 'N/A'),
                'frequency': frequency,
                'equipment_type': contract_data.get('equipment_type', 'N/A'),
                'equipment_model': contract_data.get('equipment_model', 'N/A'),
                'equipment_specs': json.dumps(contract_data.get('equipment', {}) if contract_data.get('equipment') else {}, ensure_ascii=False),
                'services': json.dumps(contract_data.get('services', []) if contract_data.get('services') else [], ensure_ascii=False),
                'contract_value': contract_data.get('value', 0),
                'maintenances_data': '[]'  # TODO: Fetch real maintenance data from database
            }

            logger.info(f"🔍 DEBUG - template_vars prepared successfully")

            # Format user prompt with real data
            user_prompt = user_template.format(**template_vars)

            # Call Gemini directly for document generation
            gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not gemini_api_key:
                raise ValueError("GEMINI_API_KEY não configurada para geração de documentos.")

            gemini_client = genai.Client(api_key=gemini_api_key)
            generation_config = types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=24000
            )

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_prompt}\n\n{user_prompt}",
                config=generation_config
            )

            if not response or not response.candidates:
                raise ValueError("Resposta vazia do Gemini durante geração de documentos.")

            first_candidate = response.candidates[0]
            if not first_candidate.content or not first_candidate.content.parts:
                raise ValueError("Resposta do Gemini sem conteúdo processável.")

            collected_parts = []
            for part in first_candidate.content.parts:
                text = getattr(part, "text", None)
                if text:
                    collected_parts.append(text)

            document_content = "\n".join(collected_parts).strip()
            if not document_content:
                raise ValueError("Gemini retornou texto vazio para o documento gerado.")

            logger.info(f"✅ Documento gerado com sucesso ({mapped_agent_type}) - pré-process: {document_content[:200]!r}")

            # Remove markdown code blocks (```html, ```, etc)
            import re
            document_content = re.sub(r'^```html\s*\n?', '', document_content, flags=re.MULTILINE)
            document_content = re.sub(r'^```\s*\n?', '', document_content, flags=re.MULTILINE)
            document_content = document_content.strip()

            logger.info("✅ Documento gerado com sucesso usando Gemini com prompts especializados")

        except KeyError as ke:
            logger.error(f"Missing template variable: {str(ke)}")
            document_content = f"""
            # ERRO NA GERAÇÃO DO DOCUMENTO

            Erro: Variável faltando no template - {str(ke)}
            Por favor, verifique os dados do contrato e tente novamente.
            """
        except ValueError as ve:
            logger.error(f"Prompt configuration error: {str(ve)}")
            document_content = f"""
            # ERRO NA CONFIGURAÇÃO

            {str(ve)}
            """
        except Exception as gen_error:
            import traceback
            logger.error(f"Erro ao gerar documento com Gemini: {str(gen_error)}")
            logger.error(f"Traceback completo:\n{traceback.format_exc()}")
            # Fallback content
            document_content = f"""
            # DOCUMENTO {mapped_agent_type.upper()}

            **Cliente:** {contract_data.get('client_name', 'N/A')}
            **Equipamento:** {contract_data.get('equipment_type', 'N/A')}
            **Data:** {datetime.now().strftime('%d/%m/%Y')}

            Erro ao gerar documento completo. Por favor, tente novamente.
            """
        # Save the generated report to database
        try:
            # Only proceed if we have user_id
            user_id = request.get('user_id') or contract_data.get('user_id')
            if not user_id:
                logger.warning("No user_id provided, skipping database save")
            else:
                # Only save if we have real contract data
                if contract_data and contract_data.get('id') and contract_data.get('client_name'):
                    # Prepare report data for database
                    report_data = {
                        "title": f"Relatório {mapped_agent_type.title()} - {contract_data.get('client_name')}",
                        "description": f"Documento gerado pelo agente {mapped_agent_type} para o contrato {contract_data.get('contract_number')}",
                        "content": document_content,
                        "report_type": "ai_generated",
                        "agent_type": mapped_agent_type,
                        "contract_id": contract_data.get('id'),  # This is the contract UUID
                        "metadata": json.dumps({
                            "generated_at": datetime.now().isoformat(),
                            "contract_number": contract_data.get('contract_number'),
                            "client_name": contract_data.get('client_name'),
                            "equipment_type": contract_data.get('equipment_type'),
                            "generated_by": "Agno AI System"
                        }, ensure_ascii=False),
                        "status": "generated"
                    }

                    # Save to database
                    saved_report = db.create_generated_report(report_data, user_id)
                    if saved_report:
                        logger.info(f"Report saved to database with ID: {saved_report.get('id')}")
                    else:
                        logger.warning("Failed to save report to database, but returning generated content")
                else:
                    logger.warning("Insufficient contract data to save report")
        except Exception as save_error:
            logger.error(f"Error saving report to database: {str(save_error)}")
            # Continue even if save fails - at least return the generated content

        return JSONResponse(content={
            "success": True,
            "agent_type": agent_type,
            "content": document_content,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "agent_type": mapped_agent_type,
                "contract_id": contract_data.get('id', 'N/A'),
                "generated_by": "Agno AI System"
            },
            "timestamp": time.time()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar documento: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "error": f"Erro ao gerar documento: {str(e)}"
            },
            status_code=500
        )

# Document preview removed - no mock data allowed in production

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Luminus Agno AI System",
        "version": "2.0.0",
        "framework": "Simplified Agno System",
        "endpoints": {
            "health": "/health",
            "extract_pdf": "/extract-pdf",
            "process_base64_pdf": "/process-base64-pdf",
            "chat": "/chat",
            "maintenance_plan": "/generate-maintenance-plan",
            "agno_status": "/agno-status",
            "docs": "/docs"
        }
    }

# ADMIN API ROUTES
@app.get("/admin/table-stats", tags=["admin"], summary="Estatísticas das tabelas", description="Retorna estatísticas das tabelas do banco")
async def get_table_stats():  # Temporarily removed auth for debugging
    """Get database table statistics"""
    try:
        db = get_db()
        
        stats = {
            "contracts": {
                "total": len(db.get_contracts()),
                "active": len([c for c in db.get_contracts() if c.get('status') == 'active']),
            },
            "clients": {
                "total": len(db.get_clients()),
            },
            "maintenances": {
                "total": len(db.get_maintenances()),
                "pending": len([m for m in db.get_maintenances() if m.get('status') == 'pending']),
                "completed": len([m for m in db.get_maintenances() if m.get('status') == 'completed']),
            },
            "users": {
                "total": db.get_users_count()  # Get real count from database
            }
        }
        
        return JSONResponse(content={
            "success": True,
            "data": stats
        })
    except Exception as e:
        logger.error(f"Error getting table stats: {e}")
        return JSONResponse(
            content={"error": "Failed to get table stats"}, 
            status_code=500
        )

@app.get("/admin/detailed-metrics", tags=["admin"], summary="Métricas detalhadas", description="Retorna métricas detalhadas do sistema")
async def get_detailed_metrics():  # Temporarily removed auth for debugging
    """Get detailed system metrics"""
    try:
        db = get_db()
        
        # Get basic counts
        contracts = db.get_contracts()
        clients = db.get_clients()  
        maintenances = db.get_maintenances()
        
        metrics = {
            "overview": {
                "total_contracts": len(contracts),
                "total_clients": len(clients),
                "total_maintenances": len(maintenances),
                "active_contracts": len([c for c in contracts if c.get('status') == 'active']),
            },
            "contract_metrics": {
                "by_status": {},
                "total_value": 0,
            },
            "maintenance_metrics": {
                "by_status": {},
                "avg_cost": 0,
            },
            "client_metrics": {
                "by_location": {},
            }
        }
        
        # Calculate contract metrics
        contract_statuses = {}
        total_value = 0
        for contract in contracts:
            status = contract.get('status', 'unknown')
            contract_statuses[status] = contract_statuses.get(status, 0) + 1
            if contract.get('value'):
                try:
                    total_value += float(contract.get('value', 0))
                except (ValueError, TypeError):
                    pass
        
        metrics["contract_metrics"]["by_status"] = contract_statuses
        metrics["contract_metrics"]["total_value"] = total_value
        
        # Calculate maintenance metrics  
        maintenance_statuses = {}
        maintenance_costs = []
        
        for maintenance in maintenances:
            status = maintenance.get('status', 'unknown')
            maintenance_statuses[status] = maintenance_statuses.get(status, 0) + 1
            
            if maintenance.get('cost'):
                try:
                    maintenance_costs.append(float(maintenance.get('cost', 0)))
                except (ValueError, TypeError):
                    pass
        
        metrics["maintenance_metrics"]["by_status"] = maintenance_statuses
        if maintenance_costs:
            metrics["maintenance_metrics"]["avg_cost"] = sum(maintenance_costs) / len(maintenance_costs)
        
        # Calculate client metrics
        client_cities = {}
        for client in clients:
            city = client.get('city', 'unknown')
            client_cities[city] = client_cities.get(city, 0) + 1
        
        metrics["client_metrics"]["by_location"] = client_cities
        
        return JSONResponse(content={
            "success": True,
            "data": metrics
        })
    except Exception as e:
        logger.error(f"Error getting detailed metrics: {e}")
        return JSONResponse(
            content={"error": "Failed to get detailed metrics"}, 
            status_code=500
        )

# Additional API endpoints for compatibility
@app.post("/api/process-pdf", tags=["pdf"], summary="Process PDF", description="Process uploaded PDF for contract data extraction")
async def process_pdf(file: UploadFile = File(...)):
    """Process PDF file and extract contract data"""
    return await process_base64_pdf({"file_content": base64.b64encode(await file.read()).decode()})

@app.post("/api/generate-maintenance", tags=["maintenances"], summary="Generate Maintenance", description="Generate maintenance schedule from contract data")
async def generate_maintenance(data: dict = {}):
    """Generate maintenance schedule"""
    return await generate_maintenance_plan(data)

@app.post("/api/generate-report", tags=["reports"], summary="Generate Report", description="Generate reports in various formats")
async def generate_report(data: dict = {}):
    """Generate report based on provided data"""
    return await generate_ai_reports(data)

@app.get("/api/health", tags=["health"], summary="API Health Check", description="Check API health status")
async def api_health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "luminus-api", "version": "2.0.0"}

# Additional endpoints for frontend compatibility
@app.post("/api/process-pdf-fallback", tags=["pdf"])
async def process_pdf_fallback(data: dict):
    """Fallback PDF processing endpoint"""
    return await process_base64_pdf(data)

@app.post("/api/log-error", tags=["logging"])
async def log_error(error: dict):
    """Log frontend errors"""
    logger.error(f"Frontend error: {error}")
    return {"status": "logged"}

@app.get("/api/job-status/{job_id}", tags=["jobs"])
async def get_job_status(job_id: str):
    """Get job processing status"""
    # Mock implementation - should be connected to actual job tracking
    return {"job_id": job_id, "status": "completed", "progress": 100}

# COMMENTED OUT: Duplicate route - using the SSE-enabled version above
# @app.post("/api/process-pdf-storage", tags=["pdf"])
# async def process_pdf_from_storage(data: dict):
#     """Process PDF from storage URL"""
#     try:
#         # Check if we have a fileUrl or base64Data
#         if "fileUrl" in data:
#             # Fetch the file from the URL and process it
#             import httpx
#             async with httpx.AsyncClient() as client:
#                 try:
#                     # Download the file from the URL
#                     response = await client.get(data["fileUrl"], timeout=30.0)
#                     response.raise_for_status()
#
#                     # Convert to base64
#                     file_content = response.content
#                     base64_data = base64.b64encode(file_content).decode('utf-8')
#
#                     # Process as base64
#                     process_data = {
#                         "base64Data": base64_data,
#                         "filename": data.get("filename", "document.pdf"),
#                         "selectedAgents": data.get("selectedAgents", [])
#                     }
#                     return await process_base64_pdf(process_data)
#
#                 except httpx.HTTPError as http_err:
#                     logger.error(f"Error downloading file from URL: {http_err}")
#                     return JSONResponse(
#                         status_code=400,
#                         content={"error": f"Failed to download file: {str(http_err)}"}
#                     )
#
#         elif "base64Data" in data:
#             # If base64 data is provided, process it directly
#             return await process_base64_pdf(data)
#         else:
#             return JSONResponse(
#                 status_code=400,
#                 content={"error": "Missing fileUrl or base64Data in request"}
#             )
#     except Exception as e:
#         logger.error(f"Error processing PDF from storage: {e}")
#         return JSONResponse(
#             status_code=500,
#             content={"error": str(e)}
#         )

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint não encontrado",
            "available_endpoints": {
                "health": "/health",
                "extract_pdf": "/extract-pdf",
                "process_base64_pdf": "/process-base64-pdf",
                "chat": "/chat",
                "maintenance_plan": "/generate-maintenance-plan",
                "agno_status": "/agno-status",
                "docs": "/docs"
            }
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor",
            "message": "Verifique os logs para mais detalhes"
        }
    )


if __name__ == "__main__":
    import uvicorn
    logger.info(f"🚀 Starting Luminus AI Hub Backend on {Config.HOST}:{Config.PORT}")
    logger.info("📊 Direct PostgreSQL connection enabled")
    uvicorn.run(app, host=Config.HOST, port=Config.PORT)
