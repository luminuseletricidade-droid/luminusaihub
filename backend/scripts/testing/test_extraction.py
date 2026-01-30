#!/usr/bin/env python3
import base64
import json
import requests
import sys
from pathlib import Path

def test_pdf_extraction():
    # Find a PDF file to test
    pdf_path = "/Users/renansantos/Downloads/CONTRATO ASSINADO_ACAO CIDADANIA (1).pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ PDF file not found at: {pdf_path}")
        return
    
    print(f"✅ Found PDF: {pdf_path}")
    
    # Read and encode the PDF
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()
    
    # Create base64 string with data URI prefix
    base64_str = base64.b64encode(pdf_bytes).decode('utf-8')
    base64_with_prefix = f"data:application/pdf;base64,{base64_str}"
    
    print(f"📄 PDF size: {len(pdf_bytes) / (1024*1024):.2f} MB")
    print(f"🔤 Base64 size: {len(base64_str) / (1024*1024):.2f} MB")
    
    # Prepare request payload
    payload = {
        "base64Data": base64_with_prefix,
        "filename": "CONTRATO ASSINADO_ACAO CIDADANIA (1).pdf",
        "contractId": "test-contract-123"
    }
    
    # Send request
    url = "http://localhost:8000/process-base64-pdf"
    print(f"\n🚀 Sending request to: {url}")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"📡 Response status: {response.status_code}")
        print(f"📝 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCESS!")
            print(json.dumps(result, indent=2, ensure_ascii=False)[:2000])
        else:
            print(f"\n❌ ERROR {response.status_code}")
            print(f"Response text: {response.text[:1000]}")
            
            # Try to parse error JSON
            try:
                error_data = response.json()
                print("\nError details:")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                pass
                
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 60 seconds")
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_pdf_extraction()