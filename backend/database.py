"""
PostgreSQL Database Connection for Supabase
Direct connection bypassing Supabase API for better performance and control
"""

import os
import logging
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import jwt
from datetime import datetime, timedelta, date, time
import json
from decimal import Decimal
from uuid import UUID
import time as time_module
import random

# Import timezone configuration
from timezone_config import get_postgres_timezone_setting, get_timezone

logger = logging.getLogger(__name__)

class SupabaseDB:
    def __init__(self):
        self.connection = None
        self.environment = "production"  # Always use production
        self.default_schema = "public"  # Always use public schema
        self.schema = "public"  # Fixed to public schema
        self.connect()

    def _resolve_schema(self) -> str:
        # Always return public schema
        return "public"

    def _build_search_path(self) -> Optional[str]:
        # Compose search_path for the PostgreSQL session
        schema = (getattr(self, 'schema', '') or '').strip()
        if not schema:
            return None
        if schema == 'public':
            return 'public'
        return f"{schema},public"

    def _build_connection_kwargs(self) -> Dict[str, Any]:
        # Prepare connection kwargs with keepalive and search_path
        kwargs: Dict[str, Any] = {
            'cursor_factory': RealDictCursor,
            'connect_timeout': 30,
            'keepalives_idle': 600,
            'keepalives_interval': 30,
            'keepalives_count': 3,
        }
        search_path = self._build_search_path()
        if search_path:
            kwargs['options'] = f"-c search_path={search_path}"
        return kwargs

    def connect(self):
        """Establish connection to Supabase PostgreSQL"""
        try:
            # Always use production settings
            self.environment = 'production'
            self.default_schema = 'public'
            self.schema = 'public'

            # Get database URL from environment variable
            database_url = os.getenv('SUPABASE_DB_URL')

            if not database_url:
                raise ValueError(
                    'SUPABASE_DB_URL environment variable is not set. '
                    'Please configure it in your .env file.'
                )

            connection_kwargs = self._build_connection_kwargs()
            self.connection = psycopg2.connect(
                database_url,
                **connection_kwargs
            )
            self.connection.autocommit = True

            # Configurar timezone do PostgreSQL
            try:
                with self.connection.cursor() as cursor:
                    timezone_cmd = get_postgres_timezone_setting()
                    cursor.execute(timezone_cmd)
                    logger.info(f"✅ PostgreSQL timezone configurado: {get_timezone()}")
            except Exception as tz_error:
                logger.warning(f"⚠️ Falha ao configurar timezone PostgreSQL: {tz_error}")

            logger.info(
                "✅ Connected to Supabase PostgreSQL directly (env=%s, schema=%s)",
                self.environment,
                self.schema,
            )

        except ValueError as ve:
            logger.error(f"❌ Configuration error: {ve}")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            raise
    
    def serialize_datetime(self, obj):
        """Convert datetime/date/time/Decimal/UUID objects to JSON serializable types

        IMPORTANTE: Para objetos do tipo date (sem hora), converte diretamente para string YYYY-MM-DD
        sem considerar timezone, mantendo a data exata como está no banco.
        """
        # UUID must be converted to string for JSON serialization
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            # Para datetime completo (com hora), usar isoformat
            result = obj.isoformat()
            logger.debug(f"🔍 serialize_datetime: datetime {obj} -> {result}")
            return result
        elif isinstance(obj, date):
            # Para date (apenas data, sem hora), converter diretamente para string YYYY-MM-DD
            # Isso evita problemas de conversão de timezone
            result = obj.strftime('%Y-%m-%d')
            logger.debug(f"🔍 serialize_datetime: date {obj} (type: {type(obj).__name__}) -> {result}")
            return result
        elif isinstance(obj, time):
            # Para time (apenas hora), usar isoformat
            result = obj.isoformat()
            logger.debug(f"🔍 serialize_datetime: time {obj} -> {result}")
            return result
        elif isinstance(obj, Decimal):
            return float(obj)
        return obj

    def clean_result(self, data):
        """Clean result data for JSON serialization"""
        if isinstance(data, dict):
            return {k: self.serialize_datetime(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.clean_result(item) for item in data]
        return self.serialize_datetime(data)

    def execute_query(self, query: str, params: tuple = None, max_retries: int = 3) -> List[Dict]:
        """Execute SELECT query and return results with retry logic"""
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Check if connection is valid
                if self.connection is None or self.connection.closed:
                    self.reconnect()
                
                with self.connection.cursor() as cursor:
                    cursor.execute(query, params)
                    results = [dict(row) for row in cursor.fetchall()]
                    return [self.clean_result(row) for row in results]
                    
            except (psycopg2.OperationalError, psycopg2.InterfaceError, psycopg2.DatabaseError) as e:
                last_exception = e
                logger.warning(f"Query attempt {attempt + 1}/{max_retries + 1} failed: {e}")
                
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.info(f"Retrying in {wait_time:.2f} seconds...")
                    time_module.sleep(wait_time)
                    
                    # Force reconnect on database errors
                    try:
                        self.reconnect()
                    except Exception as reconnect_error:
                        logger.error(f"Reconnection failed: {reconnect_error}")
                        
            except Exception as e:
                logger.error(f"Non-recoverable query error: {e}")
                raise
        
        # If we get here, all retries failed
        logger.error(f"Query failed after {max_retries + 1} attempts")
        raise last_exception if last_exception else Exception("Query failed after retries")
    
    def execute_command(self, command: str, params: tuple = None, max_retries: int = 3) -> Optional[Dict]:
        """Execute INSERT/UPDATE/DELETE and return result with retry logic"""
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Check if connection is valid
                if self.connection is None or self.connection.closed:
                    self.reconnect()
                
                with self.connection.cursor() as cursor:
                    cursor.execute(command, params)
                    if cursor.description:
                        result = cursor.fetchone()
                        if result:
                            return self.clean_result(dict(result))
                        return None
                    return {"affected_rows": cursor.rowcount}
                    
            except (psycopg2.OperationalError, psycopg2.InterfaceError, psycopg2.DatabaseError) as e:
                last_exception = e
                logger.warning(f"Command attempt {attempt + 1}/{max_retries + 1} failed: {e}")
                
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.info(f"Retrying in {wait_time:.2f} seconds...")
                    time_module.sleep(wait_time)
                    
                    # Force reconnect on database errors
                    try:
                        self.reconnect()
                    except Exception as reconnect_error:
                        logger.error(f"Reconnection failed: {reconnect_error}")
                        
            except Exception as e:
                logger.error(f"Non-recoverable command error: {e}")
                raise
        
        # If we get here, all retries failed
        logger.error(f"Command failed after {max_retries + 1} attempts")
        raise last_exception if last_exception else Exception("Command failed after retries")
    
    def reconnect(self):
        """Reconnect to database if connection lost"""
        logger.info("🔄 Attempting to reconnect to database...")
        try:
            if self.connection:
                try:
                    self.connection.close()
                except:
                    pass  # Ignore errors when closing
            
            self.connection = None
            self.connect()
            logger.info("✅ Database reconnection successful")
            
        except Exception as e:
            logger.error(f"❌ Reconnection failed: {e}")
            raise
    
    # AUTH SCHEMA OPERATIONS
    def verify_user_credentials(self, email: str, password: str) -> Optional[Dict]:
        """Verify user credentials against auth.users"""
        try:
            import bcrypt

            # First get the user's hashed password and profile info including role
            query = """
                SELECT u.id, u.email, u.encrypted_password, u.created_at, u.updated_at, u.email_confirmed_at,
                       p.role, p.full_name
                FROM auth.users u
                LEFT JOIN profiles p ON u.id = p.id
                WHERE u.email = %s
            """

            result = self.execute_query(query, (email,))
            if result and result[0]:
                user = result[0]
                stored_hash = user.get('encrypted_password')

                # Verify password with bcrypt
                if stored_hash:
                    # Handle both bcrypt hash and potential pgcrypto hash formats
                    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
                        # It's a bcrypt hash
                        if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                            # Remove password hash from returned data
                            user.pop('encrypted_password', None)
                            # Convert datetime fields to strings for JSON serialization
                            for field in ['created_at', 'updated_at', 'email_confirmed_at']:
                                if field in user and user[field] is not None:
                                    user[field] = str(user[field])
                            return user
                    else:
                        # Fallback for old pgcrypto passwords (if any exist)
                        # Try using crypt if pgcrypto is available
                        try:
                            verify_query = """
                                SELECT id, email, created_at, updated_at, email_confirmed_at
                                FROM auth.users
                                WHERE email = %s AND encrypted_password = crypt(%s, encrypted_password)
                            """
                            verify_result = self.execute_query(verify_query, (email, password))
                            if verify_result and verify_result[0]:
                                user = verify_result[0]
                                # Convert datetime fields to strings
                                for field in ['created_at', 'updated_at', 'email_confirmed_at']:
                                    if field in user and user[field] is not None:
                                        user[field] = str(user[field])
                                return user
                        except:
                            # pgcrypto not available, can't verify old passwords
                            pass

                return None
            return None
            
        except Exception as e:
            logger.error(f"Auth verification error: {e}")
            return None
    
    def create_user(self, email: str, password: str) -> Optional[Dict]:
        """Create new user in auth.users"""
        try:
            import uuid
            import bcrypt
            user_id = str(uuid.uuid4())

            # Hash password using bcrypt in Python instead of PostgreSQL
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            command = """
                INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
                RETURNING id, email, created_at
            """

            result = self.execute_command(command, (user_id, email, password_hash))
            if result and 'created_at' in result:
                result['created_at'] = str(result['created_at'])
            return result
            
        except Exception as e:
            logger.error(f"User creation error: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID from auth.users with profile info including role"""
        query = """
            SELECT u.id, u.email, u.created_at, p.full_name, p.role
            FROM auth.users u
            LEFT JOIN profiles p ON u.id = p.id
            WHERE u.id = %s
        """
        result = self.execute_query(query, (user_id,))
        if result and result[0] and 'created_at' in result[0]:
            result[0]['created_at'] = str(result[0]['created_at'])
        return result[0] if result else None
    
    def get_users_count(self) -> int:
        """Get total count of users in the system"""
        try:
            query = "SELECT COUNT(*) as count FROM auth.users"
            result = self.execute_query(query)
            if result and result[0]:
                return result[0].get('count', 0)
            return 0
        except Exception as e:
            logger.error(f"Error getting users count: {e}")
            return 0
    
    def update_user_profile(self, user_id: str, data: Dict) -> bool:
        """Update user profile information"""
        try:
            # For now, we'll just create a simple profile table entry if needed
            # Since Supabase auth.users doesn't have full_name field directly
            # We can store additional profile info in a separate table
            
            # First check if profile exists in profiles
            check_query = "SELECT id FROM profiles WHERE id = %s"
            existing = self.execute_query(check_query, (user_id,))
            
            if existing:
                # Update existing profile
                command = "UPDATE profiles SET full_name = %s, updated_at = NOW() WHERE id = %s"
                params = (data.get('full_name', ''), user_id)
            else:
                # Create new profile
                command = "INSERT INTO profiles (id, full_name, created_at, updated_at) VALUES (%s, %s, NOW(), NOW())"
                params = (user_id, data.get('full_name', ''))
            
            with self.connection.cursor() as cursor:
                cursor.execute(command, params)
                return True
                
        except Exception as e:
            logger.error(f"Update profile error: {e}")
            return False
    
    def update_user_password(self, user_id: str, new_password: str) -> bool:
        """Update user password"""
        try:
            command = """
                UPDATE auth.users
                SET encrypted_password = crypt(%s, gen_salt('bf')), updated_at = NOW()
                WHERE id = %s
            """

            with self.connection.cursor() as cursor:
                cursor.execute(command, (new_password, user_id))
                return True

        except Exception as e:
            logger.error(f"Update password error: {e}")
            return False

    # ADMIN USER MANAGEMENT FUNCTIONS
    def list_all_users(self) -> List[Dict]:
        """List all users with their profile information and role"""
        try:
            query = """
                SELECT
                    u.id,
                    u.email,
                    u.created_at,
                    u.last_sign_in_at,
                    u.email_confirmed_at,
                    p.full_name,
                    COALESCE(p.role, 'user') as role,
                    COALESCE(p.is_active, true) as is_active
                FROM auth.users u
                LEFT JOIN profiles p ON u.id = p.id
                ORDER BY u.created_at DESC
            """
            result = self.execute_query(query)
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error listing all users: {e}")
            return []

    def create_user_admin(self, email: str, password: str, role: str = 'user', full_name: str = None) -> Optional[Dict]:
        """Create new user with specified role (admin function)"""
        try:
            import uuid
            import bcrypt

            # Validate role
            if role not in ['admin', 'user']:
                logger.error(f"Invalid role: {role}")
                return None

            user_id = str(uuid.uuid4())
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Insert user into auth.users
            user_command = """
                INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, email_confirmed_at)
                VALUES (%s, %s, %s, NOW(), NOW(), NOW())
                RETURNING id, email, created_at
            """
            user_result = self.execute_command(user_command, (user_id, email, password_hash))

            if not user_result:
                return None

            # Create profile with role
            profile_command = """
                INSERT INTO profiles (id, full_name, role, created_at, updated_at, is_active)
                VALUES (%s, %s, %s, NOW(), NOW(), true)
                ON CONFLICT (id) DO UPDATE
                SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW()
            """
            self.execute_command(profile_command, (user_id, full_name, role))

            # Return user with profile info
            return self.get_user_by_id(user_id)

        except Exception as e:
            logger.error(f"Admin user creation error: {e}")
            return None

    def update_user_email(self, user_id: str, new_email: str) -> bool:
        """Update user email (admin function)"""
        try:
            command = """
                UPDATE auth.users
                SET email = %s, updated_at = NOW()
                WHERE id = %s
            """
            result = self.execute_command(command, (new_email, user_id))
            return result is not None
        except Exception as e:
            logger.error(f"Error updating user email: {e}")
            return False

    def update_user_role(self, user_id: str, new_role: str) -> bool:
        """Update user role (admin function)"""
        try:
            # Validate role
            if new_role not in ['admin', 'user']:
                logger.error(f"Invalid role: {new_role}")
                return False

            # Check if profile exists, create if not
            check_query = "SELECT id FROM profiles WHERE id = %s"
            existing = self.execute_query(check_query, (user_id,))

            if existing:
                command = "UPDATE profiles SET role = %s, updated_at = NOW() WHERE id = %s"
            else:
                command = "INSERT INTO profiles (id, role, created_at, updated_at, is_active) VALUES (%s, %s, NOW(), NOW(), true)"

            result = self.execute_command(command, (new_role, user_id) if existing else (user_id, new_role))
            return result is not None

        except Exception as e:
            logger.error(f"Error updating user role: {e}")
            return False

    def toggle_user_status(self, user_id: str, is_active: bool) -> bool:
        """Activate or deactivate user (admin function)"""
        try:
            # Check if profile exists, create if not
            check_query = "SELECT id FROM profiles WHERE id = %s"
            existing = self.execute_query(check_query, (user_id,))

            if existing:
                command = "UPDATE profiles SET is_active = %s, updated_at = NOW() WHERE id = %s"
                params = (is_active, user_id)
            else:
                command = "INSERT INTO profiles (id, is_active, role, created_at, updated_at) VALUES (%s, %s, 'user', NOW(), NOW())"
                params = (user_id, is_active)

            result = self.execute_command(command, params)
            return result is not None

        except Exception as e:
            logger.error(f"Error toggling user status: {e}")
            return False

    def delete_user_admin(self, user_id: str) -> bool:
        """Delete user completely (admin function)"""
        try:
            # First delete profile
            self.execute_command("DELETE FROM profiles WHERE id = %s", (user_id,))

            # Then delete user from auth.users
            command = "DELETE FROM auth.users WHERE id = %s"
            result = self.execute_command(command, (user_id,))
            return result is not None

        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
    
    # DOMAIN SCHEMA OPERATIONS (public/staging)
    def get_contracts(self, user_id: str = None) -> List[Dict]:
        """Get contracts with client information - supports multi-tenant via client_users"""
        if user_id:
            query = """
                SELECT DISTINCT ON (c.id)
                    c.*,
                    COALESCE(cl.name, c.client_name) as client_name,
                    COALESCE(cl.email, c.client_email) as client_email,
                    COALESCE(cl.cnpj, c.client_cnpj) as client_cnpj,
                    COALESCE(cl.phone, c.client_phone) as client_phone,
                    COALESCE(cl.address, c.client_address) as client_address,
                    COALESCE(cl.neighborhood, c.client_neighborhood) as client_neighborhood,
                    COALESCE(cl.number, c.client_number) as client_number,
                    COALESCE(cl.city, c.client_city) as client_city,
                    COALESCE(cl.state, c.client_state) as client_state,
                    COALESCE(cl.zip_code, c.client_zip_code) as client_zip_code,
                    COALESCE(cl.contact_person, c.client_contact_person) as client_contact_person
                FROM contracts c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.user_id = %s
                   OR EXISTS (
                       SELECT 1
                       FROM client_users cu
                       WHERE cu.client_id = c.client_id
                         AND cu.user_id = %s
                   )
                ORDER BY c.id, c.created_at DESC
            """
            result = self.execute_query(query, (user_id, user_id))
        else:
            query = """
                SELECT
                    c.*,
                    COALESCE(cl.name, c.client_name) as client_name,
                    COALESCE(cl.email, c.client_email) as client_email,
                    COALESCE(cl.cnpj, c.client_cnpj) as client_cnpj,
                    COALESCE(cl.phone, c.client_phone) as client_phone,
                    COALESCE(cl.address, c.client_address) as client_address,
                    COALESCE(cl.neighborhood, c.client_neighborhood) as client_neighborhood,
                    COALESCE(cl.number, c.client_number) as client_number,
                    COALESCE(cl.city, c.client_city) as client_city,
                    COALESCE(cl.state, c.client_state) as client_state,
                    COALESCE(cl.zip_code, c.client_zip_code) as client_zip_code,
                    COALESCE(cl.contact_person, c.client_contact_person) as client_contact_person
                FROM contracts c
                LEFT JOIN clients cl ON c.client_id = cl.id
                ORDER BY c.created_at DESC
            """
            result = self.execute_query(query)

        return self.clean_result(result) if result else []

    def get_contract(self, contract_id: str, user_id: str = None) -> Dict:
        """Get a single contract with client information - supports multi-tenant via client_users"""
        if user_id:
            query = """
                SELECT DISTINCT ON (c.id)
                    c.id,
                    c.user_id,
                    c.client_id,
                    c.contract_number,
                    c.value,
                    c.contract_value,
                    c.status,
                    c.contract_type,
                    c.start_date,
                    c.end_date,
                    c.monthly_value,
                    c.payment_due_day,
                    c.automatic_renewal,
                    c.created_at,
                    c.updated_at,
                    c.client_name,
                    c.client_legal_name,
                    c.client_cnpj,
                    c.client_email,
                    c.client_phone,
                    c.client_address,
                    c.client_city,
                    c.client_state,
                    c.client_zip_code,
                    c.client_neighborhood,
                    c.client_number,
                    c.client_contact_person,
                    c.equipment_type,
                    c.equipment_model,
                    c.equipment_brand,
                    c.equipment_serial,
                    c.equipment_power,
                    c.equipment_voltage,
                    c.equipment_location,
                    c.equipment_year,
                    c.equipment_condition,
                    c.services,
                    c.description,
                    c.observations,
                    c.payment_terms,
                    c.technical_notes,
                    c.special_conditions,
                    c.warranty_terms,
                    c.maintenance_frequency,
                    COALESCE(cl.name, c.client_name) as client_name,
                    COALESCE(cl.email, c.client_email) as client_email,
                    COALESCE(cl.cnpj, c.client_cnpj) as client_cnpj,
                    COALESCE(cl.phone, c.client_phone) as client_phone,
                    COALESCE(cl.address, c.client_address) as client_address,
                    COALESCE(cl.neighborhood, c.client_neighborhood) as client_neighborhood,
                    COALESCE(cl.number, c.client_number) as client_number,
                    COALESCE(cl.city, c.client_city) as client_city,
                    COALESCE(cl.state, c.client_state) as client_state,
                    COALESCE(cl.zip_code, c.client_zip_code) as client_zip_code,
                    COALESCE(cl.contact_person, c.client_contact_person) as client_contact_person
                FROM contracts c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.id = %s
                   AND (
                       c.user_id = %s
                       OR EXISTS (
                           SELECT 1
                           FROM client_users cu
                           WHERE cu.client_id = c.client_id
                             AND cu.user_id = %s
                       )
                   )
                ORDER BY c.id, c.created_at DESC
            """
            result = self.execute_query(query, (contract_id, user_id, user_id))
        else:
            query = """
                SELECT
                    c.id,
                    c.user_id,
                    c.client_id,
                    c.contract_number,
                    c.value,
                    c.contract_value,
                    c.status,
                    c.contract_type,
                    c.start_date,
                    c.end_date,
                    c.monthly_value,
                    c.payment_due_day,
                    c.automatic_renewal,
                    c.created_at,
                    c.updated_at,
                    c.client_name,
                    c.client_legal_name,
                    c.client_cnpj,
                    c.client_email,
                    c.client_phone,
                    c.client_address,
                    c.client_city,
                    c.client_state,
                    c.client_zip_code,
                    c.client_neighborhood,
                    c.client_number,
                    c.client_contact_person,
                    c.equipment_type,
                    c.equipment_model,
                    c.equipment_brand,
                    c.equipment_serial,
                    c.equipment_power,
                    c.equipment_voltage,
                    c.equipment_location,
                    c.equipment_year,
                    c.equipment_condition,
                    c.services,
                    c.description,
                    c.observations,
                    c.payment_terms,
                    c.technical_notes,
                    c.special_conditions,
                    c.warranty_terms,
                    c.maintenance_frequency,
                    COALESCE(cl.name, c.client_name) as client_name,
                    COALESCE(cl.email, c.client_email) as client_email,
                    COALESCE(cl.cnpj, c.client_cnpj) as client_cnpj,
                    COALESCE(cl.phone, c.client_phone) as client_phone,
                    COALESCE(cl.address, c.client_address) as client_address,
                    COALESCE(cl.neighborhood, c.client_neighborhood) as client_neighborhood,
                    COALESCE(cl.number, c.client_number) as client_number,
                    COALESCE(cl.city, c.client_city) as client_city,
                    COALESCE(cl.state, c.client_state) as client_state,
                    COALESCE(cl.zip_code, c.client_zip_code) as client_zip_code,
                    COALESCE(cl.contact_person, c.client_contact_person) as client_contact_person
                FROM contracts c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.id = %s
                ORDER BY c.created_at DESC
            """
            result = self.execute_query(query, (contract_id,))

        return self.clean_result(result)[0] if result else {}

    def get_clients(self, user_id: str = None) -> List[Dict]:
        """Get clients from clients with multi-tenant support via client_users"""
        if user_id:
            # Use JOIN with client_users to support multi-tenant architecture
            query = """
                SELECT DISTINCT c.*
                FROM clients c
                INNER JOIN client_users cu ON c.id = cu.client_id
                WHERE cu.user_id = %s
                ORDER BY c.created_at DESC
            """
            result = self.execute_query(query, (user_id,))
        else:
            query = "SELECT * FROM clients ORDER BY created_at DESC"
            result = self.execute_query(query)

        return self.clean_result(result) if result else []
    
    def get_maintenances(self, user_id: str = None) -> List[Dict]:
        """Get maintenances with client, contract and status information"""
        if user_id:
            query = """
                SELECT
                    m.*,
                    cl.name as client_name,
                    cl.email as client_email,
                    c.contract_number,
                    c.description as contract_description,
                    ms.name as status_name,
                    ms.color as status_color,
                    ms.description as status_description
                FROM maintenances m
                LEFT JOIN contracts c ON m.contract_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN maintenance_status ms ON m.status_id = ms.id
                WHERE m.user_id = %s
                ORDER BY m.scheduled_date DESC NULLS LAST, m.scheduled_time DESC NULLS LAST, m.created_at DESC
            """
            result = self.execute_query(query, (user_id,))
        else:
            query = """
                SELECT
                    m.*,
                    cl.name as client_name,
                    cl.email as client_email,
                    c.contract_number,
                    c.description as contract_description,
                    ms.name as status_name,
                    ms.color as status_color,
                    ms.description as status_description
                FROM maintenances m
                LEFT JOIN contracts c ON m.contract_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN maintenance_status ms ON m.status_id = ms.id
                ORDER BY m.scheduled_date DESC NULLS LAST, m.scheduled_time DESC NULLS LAST, m.created_at DESC
            """
            result = self.execute_query(query)

        # Clean and return result
        return self.clean_result(result) if result else []
    
    def get_chat_sessions(self, user_id: str) -> List[Dict]:
        """Get chat sessions for user"""
        query = "SELECT * FROM chat_sessions WHERE user_id = %s ORDER BY created_at DESC"
        return self.execute_query(query, (user_id,))
    
    def get_chat_session_by_id(self, session_id: str, user_id: str = None) -> Optional[Dict]:
        """Get specific chat session by ID with optional user restriction"""
        if user_id:
            query = "SELECT * FROM chat_sessions WHERE id = %s AND user_id = %s"
            result = self.execute_query(query, (session_id, user_id))
        else:
            query = "SELECT * FROM chat_sessions WHERE id = %s"
            result = self.execute_query(query, (session_id,))
        
        return result[0] if result else None
    
    def get_ai_agents(self, user_id: str = None) -> List[Dict]:
        """Get AI agents for user"""
        if user_id:
            query = "SELECT * FROM ai_agents WHERE user_id = %s ORDER BY created_at DESC"
            result = self.execute_query(query, (user_id,))
        else:
            query = "SELECT * FROM ai_agents ORDER BY created_at DESC"
            result = self.execute_query(query)
        
        return self.clean_result(result) if result else []
    
    def create_chat_session(self, data: Dict, user_id: str) -> Optional[Dict]:
        """Create new chat session"""
        command = """
            INSERT INTO chat_sessions (name, contract_id, agent_id, user_id, created_at, updated_at)
            VALUES (%(name)s, %(contract_id)s, %(agent_id)s, %(user_id)s, NOW(), NOW())
            RETURNING *
        """
        params = {
            'name': data.get('name', 'New Chat Session'),
            'contract_id': data.get('contract_id'),
            'agent_id': data.get('agent_id', 'luminos-assistant')
        }
        
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(command, {**params, 'user_id': user_id})
                result = cursor.fetchone()
                if result:
                    # Convert datetime objects to strings for JSON serialization
                    result_dict = dict(result)
                    for key, value in result_dict.items():
                        if hasattr(value, 'isoformat'):  # datetime object
                            result_dict[key] = value.isoformat()
                    return result_dict
                return None
        except Exception as e:
            logger.error(f"Chat session creation error: {e}")
            return None
    
    def get_chat_messages(self, session_id: str, user_id: str = None) -> List[Dict]:
        """Get messages for a chat session"""
        if user_id:
            query = """
                SELECT m.* FROM chat_messages m
                JOIN chat_sessions s ON m.session_id = s.id
                WHERE m.session_id = %s AND s.user_id = %s
                ORDER BY m.created_at ASC
            """
            result = self.execute_query(query, (session_id, user_id))
        else:
            query = """
                SELECT * FROM chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC
            """
            result = self.execute_query(query, (session_id,))
        
        return self.clean_result(result) if result else []
    
    def add_chat_message(self, data: Dict, user_id: str) -> Optional[Dict]:
        """Add a message to a chat session"""
        command = """
            INSERT INTO chat_messages (session_id, role, content, user_id, created_at)
            VALUES (%(session_id)s, %(role)s, %(content)s, %(user_id)s, NOW())
            RETURNING *
        """
        params = {
            'session_id': data.get('session_id'),
            'role': data.get('role', 'user'),
            'content': data.get('content'),
            'user_id': user_id
        }
        
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(command, params)
                result = cursor.fetchone()
                if result:
                    result_dict = dict(result)
                    for key, value in result_dict.items():
                        if hasattr(value, 'isoformat'):
                            result_dict[key] = value.isoformat()
                    return result_dict
                return None
        except Exception as e:
            logger.error(f"Add chat message error: {e}")
            return None
    
    def create_contract(self, data: Dict, user_id: str = None) -> Optional[Dict]:
        """Create new contract with all extracted fields"""
        try:
            # Extended list of possible fields including all extracted data
            possible_fields = [
                'client_id', 'contract_number', 'description', 'start_date', 'end_date',
                'value', 'status', 'payment_terms', 'contract_type',
                # Client data fields
                'client_name', 'client_legal_name', 'client_cnpj', 'client_email',
                'client_phone', 'client_address', 'client_city', 'client_state',
                'client_zip_code', 'client_contact_person',
                # Address extras (ensure persistence)
                'client_neighborhood', 'client_number',
                # Contract details
                'proposal_number', 'contract_date', 'proposal_date', 'duration',
                'duration_months', 'monthly_value',
                # Equipment fields
                'equipment_type', 'equipment_model', 'equipment_brand', 'equipment_power',
                'equipment_voltage', 'equipment_quantity', 'equipment_serial', 'equipment_location',
                'equipment_year', 'equipment_condition',
                # Additional fields
                'services', 'observations', 'technical_notes',
                'special_conditions', 'warranty_terms', 'payment_due_day',
                'supplier_name', 'supplier_cnpj', 'is_renewal', 'automatic_renewal',
                'reajustment_index', 'fines_late_payment_percentage',
                'cancellation_fine_percentage', 'metadata',
                # OCR and extraction fields
                'extracted_text', 'extraction_metadata'
            ]

            # Add required default value for contract_type if not provided
            if 'contract_type' not in data:
                data['contract_type'] = 'maintenance'

            # Add user_id to the data if provided
            if user_id:
                data['user_id'] = user_id
                possible_fields.append('user_id')
            
            fields = []
            values = []
            placeholders = []
            
            # Only include fields that are present in the data
            for field in possible_fields:
                if field in data and data[field] is not None and data[field] != '':
                    fields.append(field)
                    values.append(data[field])
                    placeholders.append('%s')
            
            if not fields:
                logger.error("No valid fields provided for contract creation")
                return None
            
            # Add timestamps
            fields.extend(['created_at', 'updated_at'])
            placeholders.extend(['NOW()', 'NOW()'])
            
            command = f"""
                INSERT INTO contracts ({', '.join(fields)})
                VALUES ({', '.join(placeholders)})
                RETURNING *
            """
            
            result = self.execute_command(command, tuple(values))
            if result:
                logger.info(f"✅ Created contract with ID: {result.get('id')}")
                return self.clean_result(result)
            return result
        except Exception as e:
            logger.error(f"Contract creation error: {e}")
            return None
    
    def update_contract(self, contract_id: str, data: Dict) -> Optional[Dict]:
        """Update contract"""
        try:
            if not data:
                return None
                
            set_clauses = []
            values = []
            
            for key, value in data.items():
                if key not in ['id', 'created_at', 'updated_at']:
                    set_clauses.append(f"{key} = %s")
                    values.append(value)
            
            if not set_clauses:
                return None
                
            set_clauses.append("updated_at = NOW()")
            values.append(contract_id)
            
            command = f"""
                UPDATE contracts 
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING *
            """
            
            return self.execute_command(command, tuple(values))
        except Exception as e:
            logger.error(f"Contract update error: {e}")
            return None
    
    def delete_contract(self, contract_id: str) -> bool:
        """Delete contract"""
        try:
            command = "DELETE FROM contracts WHERE id = %s"
            result = self.execute_command(command, (contract_id,))
            return result and result.get('affected_rows', 0) > 0
        except Exception as e:
            logger.error(f"Contract deletion error: {e}")
            return False
    
    def find_client_by_cnpj(self, cnpj: str, user_id: str = None) -> Optional[Dict]:
        """Find existing client by CNPJ - supports multi-tenant via client_users"""
        try:
            if not cnpj:
                return None

            # Clean CNPJ - remove all non-numeric characters
            clean_cnpj = ''.join(filter(str.isdigit, cnpj))

            if len(clean_cnpj) != 14:  # CNPJ should have 14 digits
                logger.warning(f"Invalid CNPJ format: {cnpj} (cleaned: {clean_cnpj})")
                return None

            # Search for client with same CNPJ
            # If user_id is provided, limit to clients accessible by that user via client_users
            if user_id:
                query = """
                    SELECT DISTINCT c.*
                    FROM clients c
                    INNER JOIN client_users cu ON c.id = cu.client_id
                    WHERE clean_cnpj(c.cnpj) = %s AND cu.user_id = %s
                    LIMIT 1
                """
                params = (clean_cnpj, user_id)
            else:
                # Global search (for multi-tenant lookup during contract creation)
                query = """
                    SELECT * FROM clients
                    WHERE clean_cnpj(cnpj) = %s
                    LIMIT 1
                """
                params = (clean_cnpj,)

            results = self.execute_query(query, params)
            return results[0] if results else None
            
        except Exception as e:
            logger.error(f"Error finding client by CNPJ: {e}")
            return None

    def create_client(self, data: Dict, user_id: str = None) -> Optional[Dict]:
        """Create new client with CNPJ duplication check - multi-tenant via client_users"""
        try:
            resolved_user_id = user_id or data.get('user_id')
            if not resolved_user_id:
                logger.error(f"❌ create_client: user_id obrigatório! user_id={user_id}, data.user_id={data.get('user_id')}")
                raise ValueError("Usuário autenticado é obrigatório para criar clientes")

            logger.debug(
                "🧭 create_client resolved_user_id=%s payload_keys=%s",
                resolved_user_id,
                list(data.keys())
            )

            # Check for duplicate CNPJ first (global search for multi-tenant)
            if 'cnpj' in data and data['cnpj']:
                existing_client = self.find_client_by_cnpj(data['cnpj'], user_id=None)
                if existing_client:
                    logger.info(f"Client with CNPJ {data['cnpj']} already exists: {existing_client['name']}")
                    existing_client['_was_existing'] = True
                    return existing_client  # Return existing client instead of creating duplicate

            fields = [
                'user_id',
                'name',
                'email',
                'phone',
                'cnpj',
                'address',
                'city',
                'state',
                'zip_code',
                'country',
                'contact_person',
                'notes'
            ]
            values = []
            placeholders = []

            for field in fields:
                if field == 'user_id':
                    logger.info(f"🔍 [create_client] Adding user_id to INSERT: {resolved_user_id}")
                    values.append(resolved_user_id)
                    placeholders.append('%s')
                    continue

                value = data.get(field)
                values.append(value)
                placeholders.append('%s')

            command = f"""
                INSERT INTO clients ({', '.join(fields)}, created_at, updated_at)
                VALUES ({', '.join(placeholders)}, NOW(), NOW())
                RETURNING *
            """

            logger.info(f"🔍 [create_client] SQL: {command}")
            logger.info(f"🔍 [create_client] Values: {values}")

            result = self.execute_command(command, tuple(values))
            if result:
                logger.info(f"Created new client: {result.get('name')} (CNPJ: {result.get('cnpj')})")
                result['_was_existing'] = False
            return result

        except ValueError as ve:
            logger.error(f"Client creation validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"Client creation error: {e}")
            return None
    
    def update_client(self, client_id: str, data: Dict) -> Optional[Dict]:
        """Update client"""
        try:
            if not data:
                return None
                
            set_clauses = []
            values = []
            
            for key, value in data.items():
                if key not in ['id', 'created_at', 'updated_at']:
                    set_clauses.append(f"{key} = %s")
                    values.append(value)
            
            if not set_clauses:
                return None
                
            set_clauses.append("updated_at = NOW()")
            values.append(client_id)
            
            command = f"""
                UPDATE clients 
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING *
            """
            
            return self.execute_command(command, tuple(values))
        except Exception as e:
            logger.error(f"Client update error: {e}")
            return None
    
    def delete_client(self, client_id: str) -> bool:
        """Delete client"""
        try:
            command = "DELETE FROM clients WHERE id = %s"
            result = self.execute_command(command, (client_id,))
            return result and result.get('affected_rows', 0) > 0
        except Exception as e:
            logger.error(f"Client deletion error: {e}")
            return False

    def create_client_user_relationship(self, client_id: str, user_id: str, role: str = 'owner') -> Optional[Dict]:
        """Create relationship between client and user in client_users table"""
        try:
            # Check if relationship already exists
            check_query = """
                SELECT * FROM client_users
                WHERE client_id = %s AND user_id = %s
                LIMIT 1
            """
            existing = self.execute_query(check_query, (client_id, user_id))

            if existing:
                logger.info(f"Client-user relationship already exists for client {client_id} and user {user_id}")
                return existing[0]

            # Create new relationship
            command = """
                INSERT INTO client_users (client_id, user_id, role, created_at)
                VALUES (%s, %s, %s, NOW())
                RETURNING *
            """

            result = self.execute_command(command, (client_id, user_id, role))
            if result:
                logger.info(f"Created client-user relationship: client {client_id}, user {user_id}, role {role}")
            return result

        except Exception as e:
            logger.error(f"Client-user relationship creation error: {e}")
            return None

    def create_maintenance(self, data: Dict, user_id: str = None) -> Optional[Dict]:
        """Create new maintenance"""
        try:
            # Log dos dados recebidos para debug
            logger.info(f"🔍 [DEBUG] create_maintenance - Dados recebidos: {data}")
            logger.info(f"🔍 [DEBUG] end_time recebido: '{data.get('end_time')}' (tipo: {type(data.get('end_time'))})")

            # List of all possible fields that can be inserted
            possible_fields = [
                'contract_id', 'description', 'scheduled_date',
                'scheduled_time', 'end_time', 'status', 'type', 'priority', 'technician',
                'estimated_duration', 'frequency', 'notes', 'client_name',
                'contract_number', 'user_id', 'region_id'
            ]

            # Add user_id to the data if provided
            if user_id:
                data['user_id'] = user_id

            fields = []
            values = []
            placeholders = []

            # Only include fields that are present in the data
            for field in possible_fields:
                if field in data and data[field] is not None and data[field] != '':
                    fields.append(field)
                    values.append(data[field])
                    placeholders.append('%s')
                    if field == 'end_time':
                        logger.info(f"✅ [DEBUG] end_time INCLUÍDO no INSERT: '{data[field]}'")
                elif field == 'end_time':
                    logger.warning(f"⚠️ [DEBUG] end_time NÃO incluído! Valor: '{data.get(field)}', Tipo: {type(data.get(field))}")
            
            if not fields:
                logger.error("No valid fields provided for maintenance creation")
                return None
                
            # Add timestamps
            fields.extend(['created_at', 'updated_at'])
            placeholders.extend(['NOW()', 'NOW()'])
            
            command = f"""
                INSERT INTO maintenances ({', '.join(fields)})
                VALUES ({', '.join(placeholders)})
                RETURNING *
            """
            
            result = self.execute_command(command, tuple(values))
            if result:
                logger.info(f"✅ Created maintenance with ID: {result.get('id')}")
                return self.clean_result(result)
            return result
            
        except Exception as e:
            logger.error(f"❌ Maintenance creation error: {e}")
            logger.error(f"Data received: {data}")
            return None
    
    def update_maintenance(self, maintenance_id: str, data: Dict) -> Optional[Dict]:
        """Update maintenance"""
        try:
            if not data:
                return None

            set_clauses = []
            values = []

            # Se o status está sendo atualizado, garantir consistência com status_id
            if 'status' in data:
                status_value = str(data['status']).strip().lower()

                # Tratar "pending" como "scheduled" para persistência
                if status_value == 'pending':
                    status_value = 'scheduled'

                data['status'] = status_value

                if not data.get('status_id'):
                    lookup_terms = {status_value}

                    if status_value == 'scheduled':
                        lookup_terms.update({'pending', 'agendado', 'agendada', 'pendente'})
                    elif status_value == 'in_progress':
                        lookup_terms.update({'executing', 'executando', 'em andamento', 'andamento', 'em execucao', 'em execução'})
                    elif status_value == 'completed':
                        lookup_terms.update({'concluido', 'concluida', 'concluído', 'concluída', 'finalizado', 'finalizada'})
                    elif status_value == 'overdue':
                        lookup_terms.update({'atrasado', 'atrasada'})
                    elif status_value == 'cancelled':
                        lookup_terms.update({'cancelado', 'cancelada', 'canceled'})

                    if lookup_terms:
                        placeholders = ', '.join(['%s'] * len(lookup_terms))
                        lookup_values = tuple(term.lower() for term in lookup_terms)
                        status_query = f"""
                            SELECT id
                            FROM maintenance_status
                            WHERE LOWER(name) IN ({placeholders})
                               OR LOWER(description) IN ({placeholders})
                            LIMIT 1
                        """
                        status_result = self.execute_query(status_query, lookup_values + lookup_values)
                        if status_result:
                            data['status_id'] = status_result[0]['id']

            for key, value in data.items():
                if key not in ['id', 'created_at', 'updated_at']:
                    set_clauses.append(f"{key} = %s")
                    values.append(value)

            if not set_clauses:
                return None

            set_clauses.append("updated_at = NOW()")
            values.append(maintenance_id)

            command = f"""
                UPDATE maintenances
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING *
            """

            return self.execute_command(command, tuple(values))
        except Exception as e:
            logger.error(f"Maintenance update error: {e}")
            return None
    
    def delete_maintenance(self, maintenance_id: str) -> bool:
        """Delete maintenance"""
        try:
            command = "DELETE FROM maintenances WHERE id = %s"
            result = self.execute_command(command, (maintenance_id,))
            return result and result.get('affected_rows', 0) > 0
        except Exception as e:
            logger.error(f"Maintenance deletion error: {e}")
            return False
    
    def update_chat_session(self, session_id: str, data: Dict) -> Optional[Dict]:
        """Update chat session"""
        try:
            if not data:
                return None
                
            set_clauses = []
            values = []
            
            # Map frontend field names to database schema
            field_mapping = {
                'title': 'name',
                'assistant_id': 'agent_id'
            }
            
            for key, value in data.items():
                if key not in ['id', 'created_at', 'updated_at', 'user_id']:
                    db_key = field_mapping.get(key, key)
                    set_clauses.append(f"{db_key} = %s")
                    values.append(value)
            
            if not set_clauses:
                return None
                
            set_clauses.append("updated_at = NOW()")
            values.append(session_id)
            
            command = f"""
                UPDATE chat_sessions 
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING *
            """
            
            return self.execute_command(command, tuple(values))
        except Exception as e:
            logger.error(f"Chat session update error: {e}")
            return None

    def get_ai_agents(self, user_id: str = None) -> List[Dict]:
        """Get AI agents for user"""
        try:
            if user_id:
                query = """
                    SELECT id, name, type, description, avatar, capabilities, 
                           user_id, created_at, updated_at
                    FROM ai_agents 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC
                """
                result = self.execute_query(query, (user_id,))
            else:
                query = """
                    SELECT id, name, type, description, avatar, capabilities,
                           user_id, created_at, updated_at
                    FROM ai_agents 
                    ORDER BY created_at DESC
                """
                result = self.execute_query(query)
            
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting AI agents: {e}")
            return []
    
    def get_chat_sessions(self, user_id: str, agent_id: str = None) -> List[Dict]:
        """Get chat sessions for user and optionally filter by agent"""
        try:
            if agent_id:
                query = """
                    SELECT id, name as title, agent_id, agent_type, user_id, 
                           contract_id, workflow_stage, created_at, updated_at
                    FROM chat_sessions
                    WHERE user_id = %s AND agent_id = %s
                    ORDER BY updated_at DESC
                """
                result = self.execute_query(query, (user_id, agent_id))
            else:
                query = """
                    SELECT id, name as title, agent_id, agent_type, user_id,
                           contract_id, workflow_stage, created_at, updated_at
                    FROM chat_sessions
                    WHERE user_id = %s
                    ORDER BY updated_at DESC
                """
                result = self.execute_query(query, (user_id,))
            
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting chat sessions: {e}")
            return []
    
    def get_chat_messages(self, session_id: str, user_id: str = None) -> List[Dict]:
        """Get messages for a chat session"""
        try:
            query = """
                SELECT m.id, m.session_id, m.role, m.content, m.created_at
                FROM chat_messages m
                JOIN chat_sessions s ON m.session_id = s.id
                WHERE m.session_id = %s
                ORDER BY m.created_at ASC
            """
            result = self.execute_query(query, (session_id,))
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting chat messages: {e}")
            return []
    
    def create_chat_session(self, data: Dict, user_id: str) -> Dict:
        """Create a new chat session"""
        try:
            agent_id = data.get('agent_id')
            title = data.get('title', f"Nova conversa - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
            agent_type = data.get('agent_type', 'general')
            contract_id = data.get('contract_id')
            
            query = """
                INSERT INTO chat_sessions (name, agent_id, agent_type, user_id, contract_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name as title, agent_id, agent_type, user_id, 
                          contract_id, workflow_stage, created_at, updated_at
            """
            result = self.execute_query(query, (title, agent_id, agent_type, user_id, contract_id))
            return self.clean_result(result)[0] if result else None
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            return None
    
    def add_chat_message(self, data: Dict, user_id: str = None) -> Dict:
        """Add a message to a chat session"""
        try:
            session_id = data.get('session_id')
            role = data.get('role')
            content = data.get('content')
            
            query = """
                INSERT INTO chat_messages (session_id, role, content)
                VALUES (%s, %s, %s)
                RETURNING id, session_id, role, content, created_at
            """
            result = self.execute_query(query, (session_id, role, content))
            
            # Update session's updated_at timestamp
            update_query = """
                UPDATE chat_sessions
                SET updated_at = NOW()
                WHERE id = %s
            """
            self.execute_query(update_query, (session_id,))
            
            return self.clean_result(result)[0] if result else None
        except Exception as e:
            logger.error(f"Error adding chat message: {e}")
            return None

    def get_dashboard_metrics(self, user_id: str = None) -> Dict:
        """Get dashboard metrics"""
        try:
            # Get contracts metrics
            contracts_query = """
                SELECT 
                    COUNT(*) as total_contracts,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
                    COUNT(CASE WHEN end_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active' THEN 1 END) as expiring_contracts,
                    COUNT(CASE WHEN end_date < CURRENT_DATE THEN 1 END) as expired_contracts
                FROM contracts
                WHERE (%s IS NULL OR user_id = %s)
            """
            
            contracts_result = self.execute_query(contracts_query, (user_id, user_id))
            contracts_metrics = contracts_result[0] if contracts_result else {}
            
            # Get maintenances metrics
            maintenances_query = """
                SELECT
                    COUNT(*) as total_maintenances,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_maintenances,
                    COUNT(CASE WHEN status IN ('scheduled', 'pending') AND (scheduled_date IS NULL OR scheduled_date >= CURRENT_DATE) THEN 1 END) as pending_maintenances,
                    COUNT(CASE WHEN scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as upcoming_maintenances,
                    COUNT(CASE WHEN scheduled_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_maintenances
                FROM maintenances m
                JOIN contracts c ON m.contract_id = c.id
                WHERE (%s IS NULL OR c.user_id = %s)
            """
            
            maintenances_result = self.execute_query(maintenances_query, (user_id, user_id))
            maintenances_metrics = maintenances_result[0] if maintenances_result else {}
            
            # Calculate revenue (mock for now - would need actual revenue fields)
            monthly_revenue = (contracts_metrics.get('active_contracts', 0) * 5000)  # R$ 5000 per contract
            
            return {
                'totalContracts': contracts_metrics.get('total_contracts', 0),
                'activeContracts': contracts_metrics.get('active_contracts', 0),
                'expiringContracts': contracts_metrics.get('expiring_contracts', 0),
                'expiredContracts': contracts_metrics.get('expired_contracts', 0),
                'totalMaintenances': maintenances_metrics.get('total_maintenances', 0),
                'completedMaintenances': maintenances_metrics.get('completed_maintenances', 0),
                'pendingMaintenances': maintenances_metrics.get('pending_maintenances', 0),
                'upcomingMaintenances': maintenances_metrics.get('upcoming_maintenances', 0),
                'overdueMaintenances': maintenances_metrics.get('overdue_maintenances', 0),
                'monthlyRevenue': monthly_revenue,
                'completionRate': 85.5,  # Could be calculated from completed vs total maintenances
                'averageResponseTime': 2.3,  # Hours - mock for now
                'contractsGrowth': 12.5,  # Percentage - would need time-based calculation
                'revenueGrowth': 8.2,  # Percentage - would need time-based calculation
                'maintenanceEfficiency': 92.1  # Percentage - mock for now
            }
            
        except Exception as e:
            logger.error(f"Dashboard metrics error: {e}")
            return {}
    
    # Generated Reports Methods
    def get_generated_reports(self, user_id: str = None, contract_id: str = None) -> List[Dict]:
        """Get generated reports filtered by user and/or contract"""
        try:
            query = "SELECT * FROM generated_reports WHERE 1=1"
            params = []
            
            if user_id:
                query += " AND user_id = %s"
                params.append(user_id)
            
            if contract_id:
                query += " AND contract_id = %s"
                params.append(contract_id)
                
            query += " ORDER BY created_at DESC"
            
            return self.execute_query(query, tuple(params) if params else None) or []
        except Exception as e:
            logger.error(f"Error fetching generated reports: {e}")
            return []
    
    def create_generated_report(self, data: Dict, user_id: str) -> Optional[Dict]:
        """Create a new generated report"""
        try:
            fields = ['title', 'description', 'content', 'report_type', 'agent_type', 
                     'contract_id', 'metadata', 'status']
            values = []
            placeholders = []
            
            for field in fields:
                if field in data:
                    value = data[field]
                    if field == 'metadata' and isinstance(value, dict):
                        value = json.dumps(value, ensure_ascii=False)
                    values.append(value)
                    placeholders.append('%s')
            
            # Always add user_id
            fields.append('user_id')
            values.append(user_id)
            placeholders.append('%s')
            
            command = f"""
                INSERT INTO generated_reports ({', '.join(fields)}, created_at)
                VALUES ({', '.join(placeholders)}, NOW())
                RETURNING *
            """
            
            result = self.execute_command(command, tuple(values))
            logger.info(f"Created report: {result.get('title') if result else 'Unknown'}")
            return result
            
        except Exception as e:
            logger.error(f"Error creating generated report: {e}")
            return None
    
    def delete_generated_report(self, report_id: str, user_id: str) -> bool:
        """Delete a generated report (only if owned by user)"""
        try:
            command = """
                DELETE FROM generated_reports 
                WHERE id = %s AND user_id = %s
                RETURNING id
            """
            result = self.execute_command(command, (report_id, user_id))
            return result is not None
        except Exception as e:
            logger.error(f"Error deleting generated report: {e}")
            return False
    
    def get_reports_summary(self, user_id: str) -> Dict:
        """Get summary statistics for user's reports"""
        try:
            query = """
                SELECT
                    COUNT(*) as total_reports,
                    COUNT(DISTINCT report_type) as report_types,
                    COUNT(DISTINCT contract_id) as contracts_with_reports,
                    MAX(created_at) as last_report_date
                FROM generated_reports
                WHERE user_id = %s
            """
            result = self.execute_query(query, (user_id,))
            if result and result[0]:
                return {
                    'totalReports': result[0].get('total_reports', 0),
                    'reportTypes': result[0].get('report_types', 0),
                    'contractsWithReports': result[0].get('contracts_with_reports', 0),
                    'lastReportDate': result[0].get('last_report_date')
                }
            return {}
        except Exception as e:
            logger.error(f"Error getting reports summary: {e}")
            return {}

    # ==============================================
    # BACKLOG RECORRENTES REPORT METHODS
    # ==============================================

    def get_backlogs_recorrentes(
        self,
        user_id: str = None,
        start_date: str = None,
        end_date: str = None,
        contract_id: str = None,
        status: str = None,
        only_critical: bool = False,
        only_rescheduled: bool = False
    ) -> Dict:
        """
        Get backlogs recorrentes data for Report 2
        Returns list of backlogs and summary statistics
        Queries maintenances table directly with joins to contracts and clients
        """
        try:
            # Build base query directly from maintenances with joins
            query = """
                SELECT
                    m.id,
                    m.contract_id,
                    m.type as maintenance_type_id,
                    m.scheduled_date,
                    m.completed_date,
                    m.status,
                    m.notes,
                    m.technician as technician_id,
                    m.created_at,
                    m.updated_at,
                    0 as reschedule_count,
                    NULL as backlog_recommendation,
                    COALESCE(c.contract_number, m.contract_number) as contract_number,
                    c.client_id,
                    COALESCE(cl.name, m.client_name) as client_name,
                    m.type as maintenance_type_name,
                    m.type as maintenance_type_code,
                    m.technician as technician_name,
                    m.technician as technician,
                    GREATEST(0, EXTRACT(DAY FROM NOW() - m.scheduled_date)::INTEGER) as dias_em_aberto,
                    GREATEST(0, EXTRACT(DAY FROM NOW() - m.scheduled_date)::INTEGER) as days_open,
                    CASE WHEN m.status = 'completed' THEN 100 ELSE 0 END as progress_percent,
                    CASE WHEN m.status = 'completed' THEN 100 ELSE 0 END as progress,
                    (m.status = 'overdue' AND EXTRACT(DAY FROM NOW() - m.scheduled_date) > 30) as is_critical_backlog,
                    (m.status = 'overdue') as is_rescheduled
                FROM maintenances m
                LEFT JOIN contracts c ON m.contract_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE m.status IS NOT NULL
            """
            params = []

            # Apply filters
            if start_date:
                query += " AND m.scheduled_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND m.scheduled_date <= %s"
                params.append(end_date)

            if contract_id:
                query += " AND m.contract_id = %s"
                params.append(contract_id)

            if status:
                query += " AND m.status = %s"
                params.append(status)

            if only_critical:
                query += " AND m.status = 'overdue' AND EXTRACT(DAY FROM NOW() - m.scheduled_date) > 30"

            if only_rescheduled:
                query += " AND m.status = 'overdue'"

            # Order by priority: critical first, then by days open
            query += " ORDER BY (m.status = 'overdue' AND EXTRACT(DAY FROM NOW() - m.scheduled_date) > 30) DESC, EXTRACT(DAY FROM NOW() - m.scheduled_date) DESC, m.scheduled_date ASC"

            backlogs = self.execute_query(query, tuple(params) if params else None)
            backlogs = self.clean_result(backlogs) if backlogs else []

            # Calculate summary statistics directly from maintenances
            summary_query = """
                SELECT
                    COUNT(*) as total_backlogs,
                    COUNT(CASE WHEN status = 'overdue' AND EXTRACT(DAY FROM NOW() - scheduled_date) > 30 THEN 1 END) as critical_backlogs,
                    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as rescheduled_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    ROUND(AVG(GREATEST(0, EXTRACT(DAY FROM NOW() - scheduled_date)))::numeric, 1) as avg_days_open,
                    0 as avg_reschedules,
                    MAX(GREATEST(0, EXTRACT(DAY FROM NOW() - scheduled_date)::INTEGER)) as max_days_open
                FROM maintenances
                WHERE status NOT IN ('completed', 'cancelled')
            """
            summary_params = []

            if start_date:
                summary_query += " AND scheduled_date >= %s"
                summary_params.append(start_date)

            if end_date:
                summary_query += " AND scheduled_date <= %s"
                summary_params.append(end_date)

            if contract_id:
                summary_query += " AND contract_id = %s"
                summary_params.append(contract_id)

            summary_result = self.execute_query(summary_query, tuple(summary_params) if summary_params else None)
            summary = summary_result[0] if summary_result else {}

            return {
                'backlogs': backlogs,
                'summary': {
                    'total_backlogs': summary.get('total_backlogs', 0) or 0,
                    'critical_backlogs': summary.get('critical_backlogs', 0) or 0,
                    'rescheduled_count': summary.get('rescheduled_count', 0) or 0,
                    'completed_count': summary.get('completed_count', 0) or 0,
                    'avg_days_open': float(summary.get('avg_days_open', 0) or 0),
                    'avg_reschedules': float(summary.get('avg_reschedules', 0) or 0),
                    'max_days_open': summary.get('max_days_open', 0) or 0
                }
            }

        except Exception as e:
            logger.error(f"Error getting backlogs recorrentes: {e}")
            return {'backlogs': [], 'summary': {}}

    def get_curva_s_data(
        self,
        start_date: str = None,
        end_date: str = None,
        contract_id: str = None,
        technician: str = None
    ) -> List[Dict]:
        """
        Get Curva S (S-Curve) data for planned vs actual progress chart
        Returns data with camelCase keys for frontend compatibility
        Calculates weekly aggregation of planned vs completed maintenances
        """
        try:
            # If no dates provided, get date range from existing data
            if not start_date or not end_date:
                date_range_query = """
                    SELECT
                        COALESCE(MIN(scheduled_date), CURRENT_DATE - INTERVAL '1 year')::DATE as min_date,
                        COALESCE(MAX(scheduled_date), CURRENT_DATE)::DATE as max_date
                    FROM maintenances
                    WHERE scheduled_date IS NOT NULL
                """
                date_result = self.execute_query(date_range_query)
                if date_result and date_result[0]:
                    start_date = str(date_result[0].get('min_date', '2024-01-01'))
                    end_date = str(date_result[0].get('max_date', '2024-12-31'))
                else:
                    from datetime import datetime
                    current_year = datetime.now().year
                    start_date = f"{current_year}-01-01"
                    end_date = f"{current_year}-12-31"

            # Calculate curva-s using pure SQL without stored procedure
            # First get total planned count
            total_query = """
                SELECT COUNT(*) as total
                FROM maintenances
                WHERE scheduled_date BETWEEN %s AND %s
            """
            total_params = [start_date, end_date]
            if contract_id:
                total_query += " AND contract_id = %s"
                total_params.append(contract_id)
            if technician:
                total_query += " AND technician = %s"
                total_params.append(technician)

            total_result = self.execute_query(total_query, tuple(total_params))
            total_planned = total_result[0].get('total', 0) if total_result else 0

            if total_planned == 0:
                return []

            # Build dynamic filter clause
            extra_filter = ""
            extra_params = []
            if contract_id:
                extra_filter += " AND m.contract_id = %s"
                extra_params.append(contract_id)
            if technician:
                extra_filter += " AND m.technician = %s"
                extra_params.append(technician)

            # Calculate weekly data
            query = f"""
                WITH semanas AS (
                    SELECT
                        gs.n AS semana_num,
                        (%s::DATE + ((gs.n - 1) * 7)) AS inicio_semana,
                        LEAST(%s::DATE + (gs.n * 7) - 1, %s::DATE) AS fim_semana
                    FROM generate_series(1, GREATEST(1, CEIL((%s::DATE - %s::DATE + 1)::NUMERIC / 7))::INTEGER) AS gs(n)
                ),
                dados_semana AS (
                    SELECT
                        s.semana_num,
                        s.inicio_semana,
                        s.fim_semana,
                        COUNT(CASE WHEN m.scheduled_date BETWEEN s.inicio_semana AND s.fim_semana THEN 1 END)::INTEGER AS plan_semana,
                        COUNT(CASE WHEN m.completed_date BETWEEN s.inicio_semana AND s.fim_semana AND m.status = 'completed' THEN 1 END)::INTEGER AS real_semana
                    FROM semanas s
                    LEFT JOIN maintenances m ON m.scheduled_date BETWEEN %s AND %s{extra_filter}
                    GROUP BY s.semana_num, s.inicio_semana, s.fim_semana
                )
                SELECT
                    ds.semana_num as semana,
                    ds.inicio_semana as data_inicio,
                    ds.fim_semana as data_fim,
                    ds.plan_semana as planejado_semana,
                    SUM(ds.plan_semana) OVER (ORDER BY ds.semana_num)::INTEGER AS planejado_acumulado,
                    ds.real_semana as real_semana,
                    SUM(ds.real_semana) OVER (ORDER BY ds.semana_num)::INTEGER AS real_acumulado
                FROM dados_semana ds
                ORDER BY ds.semana_num
                LIMIT 52
            """

            params = [start_date, start_date, end_date, end_date, start_date, start_date, end_date] + extra_params
            params = tuple(params)

            result = self.execute_query(query, params)

            # Transform snake_case to camelCase for frontend compatibility
            if result:
                transformed = []
                for row in result:
                    planejado_acum = row.get('planejado_acumulado', 0) or 0
                    real_acum = row.get('real_acumulado', 0) or 0
                    transformed.append({
                        'semana': row.get('semana'),
                        'dataInicio': str(row.get('data_inicio')) if row.get('data_inicio') else None,
                        'dataFim': str(row.get('data_fim')) if row.get('data_fim') else None,
                        'planejadoSemana': row.get('planejado_semana', 0) or 0,
                        'planejadoAcumulado': planejado_acum,
                        'realSemana': row.get('real_semana', 0) or 0,
                        'realAcumulado': real_acum,
                        'planejadoPercent': round((planejado_acum / total_planned) * 100, 2) if total_planned > 0 else 0,
                        'realPercent': round((real_acum / total_planned) * 100, 2) if total_planned > 0 else 0
                    })
                return self.clean_result(transformed)
            return []

        except Exception as e:
            logger.error(f"Error getting Curva S data: {e}")
            return []

    def update_backlog_recommendation(
        self,
        maintenance_id: str,
        recommendation: str
    ) -> Optional[Dict]:
        """
        Update the recommendation for a specific maintenance backlog
        Allows manual editing of system-generated recommendations
        """
        try:
            command = """
                UPDATE maintenances
                SET backlog_recommendation = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, backlog_recommendation, updated_at
            """
            result = self.execute_command(command, (recommendation, maintenance_id))
            return self.clean_result(result) if result else None

        except Exception as e:
            logger.error(f"Error updating backlog recommendation: {e}")
            return None

    def regenerate_backlog_recommendation(self, maintenance_id: str) -> Optional[Dict]:
        """
        Regenerate the automatic recommendation for a maintenance
        Uses the database function generate_backlog_recommendation()
        """
        try:
            # Call the database function to generate recommendation
            query = "SELECT generate_backlog_recommendation(%s) as recommendation"
            result = self.execute_query(query, (maintenance_id,))

            if result and result[0]:
                recommendation = result[0].get('recommendation')

                # Update the maintenance with the new recommendation
                return self.update_backlog_recommendation(maintenance_id, recommendation)

            return None

        except Exception as e:
            logger.error(f"Error regenerating backlog recommendation: {e}")
            return None

    def get_backlog_kpis(
        self,
        start_date: str = None,
        end_date: str = None,
        contract_id: str = None,
        technician: str = None
    ) -> Dict:
        """
        Get KPIs for the backlog report dashboard
        Uses maintenances table directly
        Returns field names matching frontend expectations
        """
        try:
            query = """
                SELECT
                    COUNT(*) as total_tasks,
                    COUNT(*) FILTER (WHERE status = 'overdue' AND
                        EXTRACT(DAY FROM NOW() - scheduled_date) > 30) as critical_count,
                    COUNT(*) FILTER (WHERE status IN ('completed', 'pending') AND
                        (scheduled_date >= CURRENT_DATE OR status = 'completed')) as on_schedule_count,
                    COUNT(*) FILTER (WHERE status = 'overdue') as rescheduled_count,
                    COALESCE(AVG(
                        CASE WHEN status NOT IN ('completed', 'cancelled')
                        THEN EXTRACT(DAY FROM NOW() - scheduled_date)
                        END
                    ), 0)::INTEGER as avg_days_open
                FROM maintenances m
                WHERE m.status IS NOT NULL
            """
            params = []

            if start_date:
                query += " AND m.scheduled_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND m.scheduled_date <= %s"
                params.append(end_date)

            if contract_id:
                query += " AND m.contract_id = %s"
                params.append(contract_id)

            if technician:
                query += " AND m.technician = %s"
                params.append(technician)

            result = self.execute_query(query, tuple(params) if params else None)

            if result and result[0]:
                return {
                    'total_tasks': result[0].get('total_tasks', 0) or 0,
                    'critical_count': result[0].get('critical_count', 0) or 0,
                    'on_schedule_count': result[0].get('on_schedule_count', 0) or 0,
                    'rescheduled_count': result[0].get('rescheduled_count', 0) or 0,
                    'avg_days_open': result[0].get('avg_days_open', 0) or 0
                }
            return {}

        except Exception as e:
            logger.error(f"Error getting backlog KPIs: {e}")
            return {}

    def get_maintenance_progress_by_type(
        self,
        start_date: str = None,
        end_date: str = None,
        contract_id: str = None,
        technician: str = None
    ) -> List[Dict]:
        """
        Get maintenance progress grouped by type
        Returns list with progress percentage for each maintenance type
        Uses m.type column directly (not maintenance_type_id)
        If no dates provided, returns all data without date filter
        """
        try:
            params = []

            if start_date and end_date:
                # With date filter
                query = """
                    SELECT
                        m.type as type_code,
                        m.type as type_name,
                        COUNT(*) as planned_count,
                        COUNT(*) FILTER (WHERE m.status = 'completed') as completed_count,
                        CASE
                            WHEN COUNT(*) > 0
                            THEN ROUND(
                                (COUNT(*) FILTER (WHERE m.status = 'completed')::NUMERIC / COUNT(*)) * 100,
                                0
                            )
                            ELSE 0
                        END as progress_percent
                    FROM maintenances m
                    WHERE m.type IS NOT NULL
                    AND m.scheduled_date BETWEEN %s AND %s
                """
                params = [start_date, end_date]

                if contract_id:
                    query += " AND m.contract_id = %s"
                    params.append(contract_id)

                if technician:
                    query += " AND m.technician = %s"
                    params.append(technician)

                query += """
                    GROUP BY m.type
                    ORDER BY m.type
                """
            else:
                # Without date filter - return ALL data
                query = """
                    SELECT
                        m.type as type_code,
                        m.type as type_name,
                        COUNT(*) as planned_count,
                        COUNT(*) FILTER (WHERE m.status = 'completed') as completed_count,
                        CASE
                            WHEN COUNT(*) > 0
                            THEN ROUND(
                                (COUNT(*) FILTER (WHERE m.status = 'completed')::NUMERIC / COUNT(*)) * 100,
                                0
                            )
                            ELSE 0
                        END as progress_percent
                    FROM maintenances m
                    WHERE m.type IS NOT NULL
                """

                if contract_id:
                    query += " AND m.contract_id = %s"
                    params.append(contract_id)

                if technician:
                    query += " AND m.technician = %s"
                    params.append(technician)

                query += """
                    GROUP BY m.type
                    ORDER BY m.type
                """

            result = self.execute_query(query, tuple(params) if params else None)
            return self.clean_result(result) if result else []

        except Exception as e:
            logger.error(f"Error getting maintenance progress by type: {e}")
            return []

    def get_all_maintenances_by_contract(
        self,
        start_date: str = None,
        end_date: str = None,
        status_filter: str = None,
        contract_id: str = None,
        technician: str = None
    ) -> List[Dict]:
        """
        Get all maintenances grouped by contract
        Returns list of contracts with their maintenances
        Uses m.type and m.technician columns directly
        """
        try:
            query = """
                SELECT
                    c.id as contract_id,
                    c.contract_number,
                    cl.name as client_name,
                    NULL as region,
                    NULL as power_kva,
                    MAX(m.technician) as technician_name,
                    json_agg(
                        json_build_object(
                            'maintenance_id', m.id,
                            'type', m.type,
                            'type_code', m.type,
                            'scheduled_date', m.scheduled_date,
                            'completed_date', m.completed_date,
                            'status', m.status,
                            'technician', m.technician
                        ) ORDER BY m.scheduled_date
                    ) as maintenances
                FROM contracts c
                LEFT JOIN clients cl ON c.client_id = cl.id
                INNER JOIN maintenances m ON m.contract_id = c.id
                WHERE 1=1
            """
            params = []

            if start_date:
                query += " AND m.scheduled_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND m.scheduled_date <= %s"
                params.append(end_date)

            if status_filter:
                query += " AND m.status = %s"
                params.append(status_filter)

            if contract_id:
                query += " AND c.id = %s"
                params.append(contract_id)

            if technician:
                query += " AND m.technician = %s"
                params.append(technician)

            query += """
                GROUP BY c.id, c.contract_number, cl.name
                HAVING COUNT(m.id) > 0
                ORDER BY cl.name
            """

            result = self.execute_query(query, tuple(params) if params else None)
            return self.clean_result(result) if result else []

        except Exception as e:
            logger.error(f"Error getting maintenances by contract: {e}")
            return []

    # ==================== REGIONS METHODS ====================

    def get_regions(self, user_id: str = None) -> List[Dict]:
        """Get all regions for a user"""
        try:
            if user_id:
                query = """
                    SELECT * FROM regions
                    WHERE user_id = %s
                    ORDER BY name ASC
                """
                result = self.execute_query(query, (user_id,))
            else:
                query = "SELECT * FROM regions ORDER BY name ASC"
                result = self.execute_query(query)

            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting regions: {e}")
            return []

    def get_region_by_id(self, region_id: str, user_id: str = None) -> Optional[Dict]:
        """Get a specific region by ID"""
        try:
            if user_id:
                query = "SELECT * FROM regions WHERE id = %s AND user_id = %s"
                result = self.execute_query(query, (region_id, user_id))
            else:
                query = "SELECT * FROM regions WHERE id = %s"
                result = self.execute_query(query, (region_id,))

            if result:
                cleaned = self.clean_result(result)
                return cleaned[0] if cleaned else None
            return None
        except Exception as e:
            logger.error(f"Error getting region by id: {e}")
            return None

    def create_region(self, data: Dict, user_id: str) -> Optional[Dict]:
        """Create a new region"""
        try:
            if not user_id:
                raise ValueError("user_id is required to create a region")

            name = data.get('name')
            if not name:
                raise ValueError("Region name is required")

            description = data.get('description', '')
            color = data.get('color', '#6366f1')  # Default indigo color
            is_active = data.get('is_active', True)

            command = """
                INSERT INTO regions (name, description, color, is_active, user_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
            """
            result = self.execute_command(command, (name, description, color, is_active, user_id))

            if result:
                logger.info(f"Created new region: {result.get('name')}")
            return result

        except ValueError as ve:
            logger.error(f"Region creation validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"Error creating region: {e}")
            return None

    def update_region(self, region_id: str, data: Dict, user_id: str = None) -> Optional[Dict]:
        """Update an existing region"""
        try:
            # Build dynamic update query
            update_fields = []
            values = []

            if 'name' in data:
                update_fields.append('name = %s')
                values.append(data['name'])
            if 'description' in data:
                update_fields.append('description = %s')
                values.append(data['description'])
            if 'color' in data:
                update_fields.append('color = %s')
                values.append(data['color'])
            if 'is_active' in data:
                update_fields.append('is_active = %s')
                values.append(data['is_active'])

            if not update_fields:
                return self.get_region_by_id(region_id, user_id)

            update_fields.append('updated_at = NOW()')
            values.append(region_id)

            if user_id:
                command = f"""
                    UPDATE regions
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND user_id = %s
                    RETURNING *
                """
                values.append(user_id)
            else:
                command = f"""
                    UPDATE regions
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """

            result = self.execute_command(command, tuple(values))

            if result:
                logger.info(f"Updated region: {result.get('name')}")
            return result

        except Exception as e:
            logger.error(f"Error updating region: {e}")
            return None

    def delete_region(self, region_id: str, user_id: str = None) -> bool:
        """Delete a region"""
        try:
            if user_id:
                command = "DELETE FROM regions WHERE id = %s AND user_id = %s"
                self.execute_command(command, (region_id, user_id))
            else:
                command = "DELETE FROM regions WHERE id = %s"
                self.execute_command(command, (region_id,))

            logger.info(f"Deleted region: {region_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting region: {e}")
            return False

    # =============================================
    # CONTRACT ADDENDUMS METHODS
    # =============================================

    def get_addendums_by_contract(self, contract_id: str) -> List[Dict]:
        """Get all addendums for a contract"""
        try:
            query = """
                SELECT * FROM contract_addendums
                WHERE contract_id = %s
                ORDER BY addendum_number ASC
            """
            result = self.execute_query(query, (contract_id,))
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting addendums for contract {contract_id}: {e}")
            return []

    def get_addendum(self, addendum_id: str) -> Optional[Dict]:
        """Get a specific addendum by ID"""
        try:
            query = "SELECT * FROM contract_addendums WHERE id = %s"
            result = self.execute_query(query, (addendum_id,))
            if result:
                cleaned = self.clean_result(result)
                return cleaned[0] if cleaned else None
            return None
        except Exception as e:
            logger.error(f"Error getting addendum {addendum_id}: {e}")
            return None

    def get_next_addendum_number(self, contract_id: str) -> int:
        """Get the next addendum number for a contract"""
        try:
            query = """
                SELECT COALESCE(MAX(addendum_number), 0) + 1 as next_number
                FROM contract_addendums
                WHERE contract_id = %s
            """
            result = self.execute_query(query, (contract_id,))
            if result:
                return result[0].get('next_number', 1)
            return 1
        except Exception as e:
            logger.error(f"Error getting next addendum number for contract {contract_id}: {e}")
            return 1

    def create_addendum(self, data: Dict, user_id: str) -> Optional[Dict]:
        """Create a new contract addendum"""
        try:
            contract_id = data.get('contract_id')
            if not contract_id:
                raise ValueError("contract_id is required")

            file_path = data.get('file_path')
            file_name = data.get('file_name')
            if not file_path or not file_name:
                raise ValueError("file_path and file_name are required")

            # Get next addendum number
            addendum_number = data.get('addendum_number') or self.get_next_addendum_number(contract_id)

            command = """
                INSERT INTO contract_addendums (
                    contract_id, addendum_number, title, description,
                    file_path, file_name, file_type, file_size,
                    content_extracted, extracted_insights, extraction_method,
                    processing_status, status, user_id, identity_validation,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
            """
            # Handle identity_validation - could be string or dict
            identity_validation = data.get('identity_validation')
            if identity_validation and isinstance(identity_validation, dict):
                identity_validation = json.dumps(identity_validation)

            values = (
                contract_id,
                addendum_number,
                data.get('title', f'Aditivo {addendum_number}'),
                data.get('description', ''),
                file_path,
                file_name,
                data.get('file_type', 'application/pdf'),
                data.get('file_size'),
                data.get('content_extracted'),
                json.dumps(data.get('extracted_insights', {})),
                data.get('extraction_method'),
                data.get('processing_status', 'pending'),
                data.get('status', 'uploaded'),
                user_id,
                identity_validation
            )

            result = self.execute_command(command, values)
            if result:
                logger.info(f"Created addendum #{addendum_number} for contract {contract_id}")
            return result

        except ValueError as ve:
            logger.error(f"Addendum creation validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"Error creating addendum: {e}")
            return None

    def update_addendum(self, addendum_id: str, data: Dict) -> Optional[Dict]:
        """Update an existing addendum"""
        try:
            update_fields = []
            values = []

            # Allowed fields to update
            allowed_fields = [
                'title', 'description', 'content_extracted', 'extracted_insights',
                'extraction_method', 'processing_status', 'processing_error',
                'status', 'applied_at'
            ]

            for field in allowed_fields:
                if field in data:
                    update_fields.append(f'{field} = %s')
                    value = data[field]
                    # JSON serialize if needed
                    if field == 'extracted_insights' and isinstance(value, dict):
                        value = json.dumps(value)
                    values.append(value)

            if not update_fields:
                return self.get_addendum(addendum_id)

            update_fields.append('updated_at = NOW()')
            values.append(addendum_id)

            command = f"""
                UPDATE contract_addendums
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """

            result = self.execute_command(command, tuple(values))
            if result:
                logger.info(f"Updated addendum: {addendum_id}")
            return result

        except Exception as e:
            logger.error(f"Error updating addendum {addendum_id}: {e}")
            return None

    def delete_addendum(self, addendum_id: str) -> bool:
        """Delete an addendum and its pending changes"""
        try:
            # Pending changes are deleted automatically via CASCADE
            command = "DELETE FROM contract_addendums WHERE id = %s"
            self.execute_command(command, (addendum_id,))
            logger.info(f"Deleted addendum: {addendum_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting addendum {addendum_id}: {e}")
            return False

    # =============================================
    # PENDING CONTRACT CHANGES METHODS
    # =============================================

    def get_pending_changes_by_addendum(self, addendum_id: str) -> List[Dict]:
        """Get all pending changes for an addendum"""
        try:
            query = """
                SELECT * FROM pending_contract_changes
                WHERE addendum_id = %s
                ORDER BY created_at ASC
            """
            result = self.execute_query(query, (addendum_id,))
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting pending changes for addendum {addendum_id}: {e}")
            return []

    def get_pending_changes_by_contract(self, contract_id: str, status: str = None) -> List[Dict]:
        """Get all pending changes for a contract, optionally filtered by status"""
        try:
            if status:
                query = """
                    SELECT pc.*, ca.addendum_number, ca.title as addendum_title
                    FROM pending_contract_changes pc
                    JOIN contract_addendums ca ON pc.addendum_id = ca.id
                    WHERE pc.contract_id = %s AND pc.status = %s
                    ORDER BY ca.addendum_number ASC, pc.created_at ASC
                """
                result = self.execute_query(query, (contract_id, status))
            else:
                query = """
                    SELECT pc.*, ca.addendum_number, ca.title as addendum_title
                    FROM pending_contract_changes pc
                    JOIN contract_addendums ca ON pc.addendum_id = ca.id
                    WHERE pc.contract_id = %s
                    ORDER BY ca.addendum_number ASC, pc.created_at ASC
                """
                result = self.execute_query(query, (contract_id,))
            return self.clean_result(result) if result else []
        except Exception as e:
            logger.error(f"Error getting pending changes for contract {contract_id}: {e}")
            return []

    def create_pending_change(self, data: Dict) -> Optional[Dict]:
        """Create a new pending contract change"""
        try:
            addendum_id = data.get('addendum_id')
            contract_id = data.get('contract_id')
            change_type = data.get('change_type')

            if not addendum_id or not contract_id or not change_type:
                raise ValueError("addendum_id, contract_id, and change_type are required")

            command = """
                INSERT INTO pending_contract_changes (
                    addendum_id, contract_id, change_type, field_name,
                    current_value, suggested_value, change_description,
                    confidence_score, status, maintenance_data,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
            """
            values = (
                addendum_id,
                contract_id,
                change_type,
                data.get('field_name'),
                data.get('current_value'),
                data.get('suggested_value'),
                data.get('change_description'),
                data.get('confidence_score'),
                data.get('status', 'pending'),
                json.dumps(data.get('maintenance_data')) if data.get('maintenance_data') else None
            )

            result = self.execute_command(command, values)
            if result:
                logger.info(f"Created pending change type '{change_type}' for addendum {addendum_id}")
            return result

        except ValueError as ve:
            logger.error(f"Pending change creation validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"Error creating pending change: {e}")
            return None

    def approve_pending_change(self, change_id: str) -> Optional[Dict]:
        """Approve a pending change"""
        try:
            command = """
                UPDATE pending_contract_changes
                SET status = 'approved', approved_at = NOW(), updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            result = self.execute_command(command, (change_id,))
            if result:
                logger.info(f"Approved pending change: {change_id}")
            return result
        except Exception as e:
            logger.error(f"Error approving pending change {change_id}: {e}")
            return None

    def reject_pending_change(self, change_id: str, reason: str = None) -> Optional[Dict]:
        """Reject a pending change"""
        try:
            command = """
                UPDATE pending_contract_changes
                SET status = 'rejected', rejected_reason = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            result = self.execute_command(command, (reason, change_id))
            if result:
                logger.info(f"Rejected pending change: {change_id}")
            return result
        except Exception as e:
            logger.error(f"Error rejecting pending change {change_id}: {e}")
            return None

    def apply_approved_changes(self, addendum_id: str, user_id: str = None) -> Dict[str, Any]:
        """Apply all approved changes for an addendum to the contract"""

        # Whitelist of valid contract columns that can be updated
        VALID_CONTRACT_COLUMNS = {
            # Date fields
            'start_date', 'end_date', 'contract_date', 'proposal_date',
            # Value fields
            'value', 'monthly_value',
            # Client fields
            'client_name', 'client_legal_name', 'client_cnpj', 'client_email',
            'client_phone', 'client_address', 'client_city', 'client_state',
            'client_zip_code', 'client_contact_person',
            # Equipment fields
            'equipment_power', 'equipment_voltage', 'equipment_year',
            'equipment_condition', 'equipment_brand', 'equipment_model',
            'equipment_serial', 'equipment_type', 'equipment_quantity',
            'equipment_location',
            # Contract fields
            'contract_type', 'contract_number', 'duration', 'duration_months',
            'status', 'description', 'services', 'observations',
            # Other fields
            'maintenance_frequency', 'technical_notes', 'special_conditions',
            'warranty_terms', 'payment_terms', 'payment_due_day',
            'supplier_name', 'supplier_cnpj', 'proposal_number',
            'is_renewal', 'automatic_renewal', 'reajustment_index',
            'fines_late_payment_percentage', 'cancellation_fine_percentage',
        }

        # Mapping of common AI-returned field names to valid column names
        FIELD_NAME_ALIASES = {
            # Address aliases
            'address': 'client_address',
            'endereco': 'client_address',
            'endereco_administrativo': 'client_address',
            'endereco_contratada': 'client_address',
            'endereco_cliente': 'client_address',
            'administrative_address': 'client_address',
            'contractor_address': 'client_address',
            # City aliases
            'city': 'client_city',
            'cidade': 'client_city',
            # State aliases
            'state': 'client_state',
            'estado': 'client_state',
            'uf': 'client_state',
            # Phone aliases
            'phone': 'client_phone',
            'telefone': 'client_phone',
            'fone': 'client_phone',
            # Email aliases
            'email': 'client_email',
            'e-mail': 'client_email',
            # Name aliases
            'name': 'client_name',
            'nome': 'client_name',
            'razao_social': 'client_legal_name',
            'legal_name': 'client_legal_name',
            # CNPJ aliases
            'cnpj': 'client_cnpj',
            # Value aliases
            'valor': 'value',
            'valor_total': 'value',
            'total_value': 'value',
            'valor_mensal': 'monthly_value',
            # Date aliases
            'data_inicio': 'start_date',
            'data_fim': 'end_date',
            'data_termino': 'end_date',
            'vigencia': 'end_date',
            # Equipment aliases
            'marca': 'equipment_brand',
            'brand': 'equipment_brand',
            'modelo': 'equipment_model',
            'model': 'equipment_model',
            'serial': 'equipment_serial',
            'numero_serie': 'equipment_serial',
            'potencia': 'equipment_power',
            'power': 'equipment_power',
            'voltagem': 'equipment_voltage',
            'voltage': 'equipment_voltage',
            'localizacao': 'equipment_location',
            'location': 'equipment_location',
            # Other aliases
            'servicos': 'services',
            'condicoes': 'special_conditions',
            'condicoes_especiais': 'special_conditions',
            'garantia': 'warranty_terms',
            'termos_garantia': 'warranty_terms',
            'observacoes': 'observations',
            'notas': 'observations',
            'notes': 'observations',
        }

        def normalize_field_name(field: str) -> str:
            """Normalize field name using aliases"""
            if not field:
                return field
            # Clean and lowercase for matching
            cleaned = field.lower().strip().replace(' ', '_').replace('-', '_')
            # Check if it's already valid
            if cleaned in VALID_CONTRACT_COLUMNS:
                return cleaned
            # Try to find an alias
            return FIELD_NAME_ALIASES.get(cleaned, field)

        try:
            # Get addendum info
            addendum = self.get_addendum(addendum_id)
            if not addendum:
                return {'success': False, 'error': 'Addendum not found'}

            contract_id = addendum.get('contract_id')

            # Get approved changes
            query = """
                SELECT * FROM pending_contract_changes
                WHERE addendum_id = %s AND status = 'approved'
                ORDER BY created_at ASC
            """
            changes = self.execute_query(query, (addendum_id,))
            changes = self.clean_result(changes) if changes else []

            if not changes:
                logger.info(f"No approved changes found for addendum {addendum_id}")
                return {'success': True, 'applied_count': 0, 'message': 'No approved changes to apply'}

            logger.info(f"Found {len(changes)} approved changes to apply for addendum {addendum_id}")
            for i, c in enumerate(changes):
                logger.info(f"  Change {i+1}: type={c.get('change_type')}, field={c.get('field_name')}, value={c.get('suggested_value')}")

            applied_count = 0
            errors = []
            created_maintenances = []

            for change in changes:
                try:
                    change_type = change.get('change_type')
                    field_name = change.get('field_name')
                    suggested_value = change.get('suggested_value')
                    description = change.get('change_description', '').lower()

                    # Infer field_name if missing for common change types
                    if not field_name and change_type == 'date_change':
                        if 'término' in description or 'vigência' in description or 'prorrog' in description:
                            field_name = 'end_date'
                        elif 'início' in description:
                            field_name = 'start_date'
                        logger.info(f"Inferred field_name={field_name} from description")
                    elif not field_name and change_type == 'value_change':
                        if 'mensal' in description:
                            field_name = 'monthly_value'
                        elif 'total' in description:
                            field_name = 'value'
                        else:
                            field_name = 'value'  # Default to value
                        logger.info(f"Inferred field_name={field_name} from description")

                    # Normalize field_name using aliases before validation
                    if field_name:
                        original_field = field_name
                        field_name = normalize_field_name(field_name)
                        if field_name != original_field:
                            logger.info(f"Normalized field_name: '{original_field}' -> '{field_name}'")

                    logger.info(f"Processing change: type={change_type}, field={field_name}, value={suggested_value}, contract_id={contract_id}")

                    # Validate field_name is in whitelist before UPDATE
                    if field_name and field_name not in VALID_CONTRACT_COLUMNS:
                        logger.warning(f"Skipping change: field '{field_name}' is not a valid contracts column")
                        errors.append(f"Skipped: column '{field_name}' does not exist in contracts table")
                        # Still mark as applied so it doesn't retry
                        mark_skipped_cmd = """
                            UPDATE pending_contract_changes
                            SET status = 'applied', updated_at = NOW()
                            WHERE id = %s
                        """
                        self.execute_command(mark_skipped_cmd, (change.get('id'),))
                        continue

                    if change_type == 'date_change' and field_name:
                        # Update date field on contract
                        update_cmd = f"""
                            UPDATE contracts SET {field_name} = %s, updated_at = NOW()
                            WHERE id = %s
                        """
                        logger.info(f"Executing date_change UPDATE: SET {field_name} = {suggested_value} WHERE id = {contract_id}")
                        result = self.execute_command(update_cmd, (suggested_value, contract_id))
                        logger.info(f"Date change update result: {result}")
                        applied_count += 1

                    elif change_type == 'value_change' and field_name:
                        # Update value field on contract
                        update_cmd = f"""
                            UPDATE contracts SET {field_name} = %s, updated_at = NOW()
                            WHERE id = %s
                        """
                        logger.info(f"Executing value_change UPDATE: SET {field_name} = {suggested_value} WHERE id = {contract_id}")
                        result = self.execute_command(update_cmd, (suggested_value, contract_id))
                        logger.info(f"Value change update result: {result}")
                        applied_count += 1

                    elif change_type == 'service_add':
                        # Add service to contract services field (TEXT type - comma separated)
                        # First get current services
                        get_services = "SELECT services FROM contracts WHERE id = %s"
                        current = self.execute_query(get_services, (contract_id,))
                        current_services = ""
                        if current and len(current) > 0:
                            current_services = current[0].get('services') or ""

                        # Parse suggested_value which might be JSON array or string
                        new_services = suggested_value
                        if isinstance(suggested_value, str) and suggested_value.startswith('['):
                            try:
                                new_services = ', '.join(json.loads(suggested_value))
                            except:
                                pass

                        # Append to existing
                        if current_services:
                            updated_services = f"{current_services}, {new_services}"
                        else:
                            updated_services = new_services

                        update_cmd = """
                            UPDATE contracts
                            SET services = %s, updated_at = NOW()
                            WHERE id = %s
                        """
                        self.execute_command(update_cmd, (updated_services, contract_id))
                        logger.info(f"Updated services to: {updated_services}")
                        applied_count += 1

                    elif change_type == 'maintenance_add':
                        # For maintenance_add, store in special_conditions or observations instead
                        # since we don't have maintenance-specific columns
                        if suggested_value:
                            update_cmd = """
                                UPDATE contracts
                                SET special_conditions = COALESCE(special_conditions, '') || %s,
                                    updated_at = NOW()
                                WHERE id = %s
                            """
                            maintenance_note = f"\n\n[Manutenção Adicionada via Anexo]: {suggested_value}"
                            self.execute_command(update_cmd, (maintenance_note, contract_id))
                            logger.info(f"Added maintenance info to special_conditions")
                            applied_count += 1
                        else:
                            logger.warning(f"maintenance_add with no suggested_value, skipping")

                    elif change_type in ['condition_change', 'equipment_update', 'equipment_add'] and field_name:
                        # Update text field on contract
                        update_cmd = f"""
                            UPDATE contracts SET {field_name} = %s, updated_at = NOW()
                            WHERE id = %s
                        """
                        logger.info(f"Executing {change_type} UPDATE: SET {field_name} = {suggested_value} WHERE id = {contract_id}")
                        result = self.execute_command(update_cmd, (suggested_value, contract_id))
                        logger.info(f"{change_type} update result: {result}")
                        applied_count += 1

                    elif change_type in ['condition_change', 'equipment_update', 'equipment_add'] and not field_name:
                        # Store in observations if no specific field
                        if suggested_value:
                            update_cmd = """
                                UPDATE contracts
                                SET observations = COALESCE(observations, '') || %s,
                                    updated_at = NOW()
                                WHERE id = %s
                            """
                            note_prefix = "Equipamento" if 'equipment' in change_type else "Condição"
                            observation_note = f"\n\n[{note_prefix} via Anexo]: {suggested_value}"
                            self.execute_command(update_cmd, (observation_note, contract_id))
                            logger.info(f"Added {change_type} info to observations")
                            applied_count += 1
                        else:
                            logger.warning(f"{change_type} with no suggested_value, skipping")

                    else:
                        # Unhandled change type or missing field_name
                        logger.warning(f"Unhandled change: type={change_type}, field_name={field_name}, suggested_value={suggested_value}")
                        if not field_name and change_type in ['date_change', 'value_change']:
                            errors.append(f"Change {change.get('id')} missing field_name")
                        # Still mark as applied so it doesn't retry endlessly
                        mark_skipped_cmd = """
                            UPDATE pending_contract_changes
                            SET status = 'applied', updated_at = NOW()
                            WHERE id = %s
                        """
                        self.execute_command(mark_skipped_cmd, (change.get('id'),))
                        continue  # Skip the normal mark as applied below

                    # Mark change as applied (only if we processed it)
                    mark_applied_cmd = """
                        UPDATE pending_contract_changes
                        SET status = 'applied', updated_at = NOW()
                        WHERE id = %s
                    """
                    self.execute_command(mark_applied_cmd, (change.get('id'),))

                except Exception as change_error:
                    errors.append(f"Error applying change {change.get('id')}: {str(change_error)}")
                    logger.error(f"Error applying change {change.get('id')}: {change_error}")

            # Update addendum status
            self.update_addendum(addendum_id, {
                'status': 'applied',
                'applied_at': datetime.now().isoformat()
            })

            result = {
                'success': True,
                'applied_count': applied_count,
                'created_maintenances': created_maintenances,
                'errors': errors if errors else None
            }
            logger.info(f"Applied {applied_count} changes from addendum {addendum_id}")
            return result

        except Exception as e:
            logger.error(f"Error applying approved changes for addendum {addendum_id}: {e}")
            return {'success': False, 'error': str(e)}

# Global database instance
db = SupabaseDB()

def get_db() -> SupabaseDB:
    """Get database instance"""
    return db
