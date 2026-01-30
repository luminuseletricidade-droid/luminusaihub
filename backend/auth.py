"""
Authentication module for PostgreSQL backend
Handles real authentication with Supabase auth schema
"""

import os
import logging
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from database import get_db

logger = logging.getLogger(__name__)

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

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user against PostgreSQL"""
    try:
        db = get_db()
        user = db.verify_user_credentials(email, password)
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
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