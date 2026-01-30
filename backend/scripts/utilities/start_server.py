#!/usr/bin/env python3
"""
Railway-compatible startup script for the backend server
"""
import os
import sys
import uvicorn
from main import app

if __name__ == "__main__":
    # Get port from environment variable (Railway provides this)
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"
    
    print(f"🚀 Starting server on {host}:{port}")
    print(f"📍 Environment: {os.environ.get('ENVIRONMENT', 'production')}")
    
    # Check for required environment variables
    if not os.environ.get("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. AI features will be limited.")
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )