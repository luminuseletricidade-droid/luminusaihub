
import os
import sys
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for the Luminus backend"""
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Server Configuration
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    
    # File Upload Configuration - Removido limite de tamanho
    MAX_FILE_SIZE_MB = None  # Sem limite
    MAX_FILE_SIZE_BYTES = None  # Sem limite
    
    # Allowed file types
    ALLOWED_FILE_TYPES = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]
    
    # CORS Configuration - reads from ENV or uses defaults
    # ENV formats supported:
    #   - Simple: CORS_ORIGINS=https://domain1.com,https://domain2.com
    #   - JSON:   CORS_ORIGINS=["https://domain1.com","https://domain2.com"]
    _default_origins = [
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @staticmethod
    def _parse_cors_origins():
        import json
        import re
        env_val = os.getenv("CORS_ORIGINS", "")
        if not env_val:
            return Config._default_origins

        # Clean up the value
        env_val = env_val.strip()

        # Try to parse as JSON first (most reliable)
        try:
            origins = json.loads(env_val)
            if isinstance(origins, list):
                # Filter and validate each origin
                valid_origins = [
                    o.strip().rstrip('/') for o in origins
                    if isinstance(o, str) and o.strip().startswith('http')
                ]
                if valid_origins:
                    return valid_origins
        except json.JSONDecodeError:
            pass  # Fall through to manual parsing

        # Remove outer brackets if present: ['...'] or ["..."]
        if env_val.startswith('[') and env_val.endswith(']'):
            env_val = env_val[1:-1]

        # Split by comma and clean each origin
        origins = []
        for part in env_val.split(','):
            # Strip whitespace and quotes (both single and double)
            origin = part.strip().strip("'\"").rstrip('/')
            if origin and origin.startswith('http'):
                origins.append(origin)

        return origins if origins else Config._default_origins

    CORS_ORIGINS = _parse_cors_origins.__func__()
    
    # Logging Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Timeout Configuration - synchronized with frontend
    TIMEOUT_CONFIG = {
        # Default timeout for regular requests (30 seconds)
        "default": int(os.getenv("TIMEOUT_DEFAULT", "30000")),

        # Timeout for small files < 5MB (60 seconds)
        "small": int(os.getenv("TIMEOUT_SMALL", "60000")),

        # Timeout for medium files 5-10MB (120 seconds)
        "medium": int(os.getenv("TIMEOUT_MEDIUM", "120000")),

        # Timeout for large files > 10MB (300 seconds)
        "large": int(os.getenv("TIMEOUT_LARGE", "300000")),

        # Maximum timeout (10 minutes)
        "maximum": int(os.getenv("TIMEOUT_MAXIMUM", "600000"))
    }

    @classmethod
    def get_timeout_for_file_size(cls, file_size_mb: float) -> int:
        """Get timeout based on file size in MB"""
        if file_size_mb < 5:
            return cls.TIMEOUT_CONFIG["small"]
        elif file_size_mb < 10:
            return cls.TIMEOUT_CONFIG["medium"]
        else:
            return cls.TIMEOUT_CONFIG["large"]
    
    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validate configuration and return status"""
        errors = []
        warnings = []
        
        # Check required API keys
        if not cls.OPENAI_API_KEY:
            warnings.append("OpenAI API key not configured. AI features will be disabled.")
        elif not cls.OPENAI_API_KEY.startswith('sk-'):
            errors.append("Invalid OpenAI API key format")
        
        # Validate server configuration
        if not isinstance(cls.PORT, int) or cls.PORT < 1 or cls.PORT > 65535:
            errors.append(f"Invalid port number: {cls.PORT}")
        
        # Print errors and warnings in development
        if errors:
            print("❌ Configuration Errors:")
            for error in errors:
                print(f"  - {error}")
        
        if warnings:
            print("⚠️  Configuration Warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        
        status = {
            "openai_configured": bool(cls.OPENAI_API_KEY),
            "max_file_size_mb": "Sem limite",
            "cors_origins": len(cls.CORS_ORIGINS),
            "log_level": cls.LOG_LEVEL,
            "errors": errors,
            "warnings": warnings,
            "is_valid": len(errors) == 0
        }
        return status
    
    @classmethod
    def check_required_env(cls) -> bool:
        """Check if all required environment variables are set"""
        config_status = cls.validate_config()
        if not config_status["is_valid"]:
            print("\n❌ Configuration validation failed!")
            print("Please check your .env file and ensure all required variables are set.")
            print("Refer to .env.example for the required format.")
            return False
        return True
