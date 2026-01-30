#!/usr/bin/env python3
"""
Simple test to verify the server can start
"""
from fastapi import FastAPI
import uvicorn
import os

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Server is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "port": os.environ.get("PORT", "8000")}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting test server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)