"""
Authentication module for PostgreSQL backend
Handles real authentication with Supabase auth schema
Supports both direct PostgreSQL and Supabase REST API authentication
"""

import os
import logging
import jwt
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from database import get_db

logger = logging.getLogger(__name__)

# Supabase configuration for REST API fallback
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jtrhpbgrpsgneleptzgm.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjU5ODYsImV4cCI6MjA4NTgwMTk4Nn0.cjoswlcAemdJ45-9oKFnPiNn64Wm46-pkvUcI96QX64"
)

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return {"id": user_id, "email": payload.get("email")}
    except jwt.PyJWTError:
        return None

def authenticate_via_supabase_api(email: str, password: str) -> Optional[Dict]:
    """Authenticate user via Supabase REST API"""
    try:
        # Use Supabase Auth API
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={"email": email, "password": password},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            user_data = data.get("user", {})

            # Return user info in expected format
            return {
                "id": user_data.get("id"),
                "email": user_data.get("email"),
                "role": user_data.get("user_metadata", {}).get("role", "user")
            }
        else:
            logger.warning(f"Supabase API auth failed: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        logger.error(f"Supabase API authentication error: {e}")
        return None

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """
    Authenticate user with hybrid approach:
    1. Try Supabase REST API first (works without PostgreSQL connection)
    2. Fallback to direct PostgreSQL if API fails and DB is available
    """
    # Try Supabase API first (preferred method)
    user = authenticate_via_supabase_api(email, password)
    if user:
        logger.info(f"✅ User authenticated via Supabase API: {email}")
        return user

    # Fallback to PostgreSQL if available
    try:
        db = get_db()
        if db.is_connected():
            user = db.verify_user_credentials(email, password)
            if user:
                logger.info(f"✅ User authenticated via PostgreSQL: {email}")
                return user
    except Exception as e:
        logger.warning(f"PostgreSQL authentication fallback failed: {e}")

    logger.error(f"❌ Authentication failed for: {email}")
    return None

def create_user(email: str, password: str) -> Optional[Dict]:
    """Create new user in PostgreSQL"""
    try:
        db = get_db()
        user = db.create_user(email, password)
        return user
    except Exception as e:
        logger.error(f"User creation error: {e}")
        return None

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID"""
    try:
        db = get_db()
        user = db.get_user_by_id(user_id)
        return user
    except Exception as e:
        logger.error(f"Get user error: {e}")
        return None