
#!/usr/bin/env python3
"""
Script de teste para verificar funcionalidades do sistema Luminus
"""
import asyncio
import json
import os
from pathlib import Path
import requests
import time

# Adicionar o diretório atual ao path
import sys
sys.path.insert(0, str(Path(__file__).parent))

def test_health_check():
    """Testa o endpoint de health check"""
    print("\n🔍 Testando Health Check...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health Check - OK")
            print(f"   Status: {data.get('status')}")
            print(f"   Version: {data.get('version')}")
            print(f"   OpenAI: {'✅' if data.get('config', {}).get('openai_configured') else '❌'}")
            return True
        else:
            print(f"❌ Health Check falhou: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check erro: {e}")
        return False

def test_root_endpoint():
    """Testa o endpoint raiz"""
    print("\n🔍 Testando Root Endpoint...")
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Root Endpoint - OK")
            print(f"   Message: {data.get('message')}")
            print(f"   Framework: {data.get('framework')}")
            return True
        else:
            print(f"❌ Root Endpoint falhou: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root Endpoint erro: {e}")
        return False

def test_chat_endpoint():
    """Testa o endpoint de chat"""
    print("\n🔍 Testando Chat Endpoint...")
    try:
        payload = {
            "message": "Olá! Como você pode me ajudar com contratos?",
            "contract_context": {
                "contract_number": "TEST-001",
                "client_name": "Cliente Teste"
            }
        }
        
        response = requests.post(
            "http://localhost:8000/chat", 
            json=payload, 
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat Endpoint - OK")
            print(f"   Success: {data.get('success')}")
            print(f"   Response preview: {data.get('response', '')[:100]}...")
            print(f"   Agno Powered: {data.get('agno_powered')}")
            return True
        else:
            print(f"❌ Chat Endpoint falhou: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Erro: {error_data.get('error', 'Unknown')}")
            except:
                pass
            return False
    except Exception as e:
        print(f"❌ Chat Endpoint erro: {e}")
        return False

def test_pdf_libraries():
    """Testa as bibliotecas de PDF"""
    print("\n🔍 Testando Bibliotecas PDF...")
    try:
        from utils.pdf_extractor import PDFExtractor
        
        libraries = PDFExtractor.get_available_libraries()
        print("📚 Bibliotecas PDF disponíveis:")
        for lib, available in libraries.items():
            status = "✅" if available else "❌"
            print(f"   {status} {lib}")
        
        available_count = sum(libraries.values())
        if available_count > 0:
            print(f"✅ {available_count} bibliotecas PDF funcionando")
            return True
        else:
            print("❌ Nenhuma biblioteca PDF disponível")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao testar bibliotecas PDF: {e}")
        return False

def test_agno_system():
    """Testa o sistema Agno"""
    print("\n🔍 Testando Sistema Agno...")
    try:
        from agno_system import luminos_agno_system
        
        status = luminos_agno_system.get_system_status()
        print("🤖 Status do Sistema Agno:")
        print(f"   Inicializado: {'✅' if status.get('initialized') else '❌'}")
        print(f"   OpenAI: {'✅' if status.get('openai_configured') else '❌'}")
        print(f"   Última verificação: {status.get('last_health_check', 'N/A')}")
        
        return status.get('initialized', False)
        
    except Exception as e:
        print(f"❌ Erro ao testar sistema Agno: {e}")
        return False

def run_all_tests():
    """Executa todos os testes"""
    print("🧪 Luminus Backend - Bateria de Testes")
    print("=" * 50)
    
    # Aguardar um pouco para o servidor inicializar
    print("⏳ Aguardando servidor inicializar...")
    time.sleep(2)
    
    tests = [
        ("Health Check", test_health_check),
        ("Root Endpoint", test_root_endpoint),
        ("Bibliotecas PDF", test_pdf_libraries),
        ("Sistema Agno", test_agno_system),
        ("Chat Endpoint", test_chat_endpoint),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erro no teste {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumo dos resultados
    print("\n" + "=" * 50)
    print("📊 RESUMO DOS TESTES")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{len(results)} testes passaram")
    
    if passed == len(results):
        print("🎉 Todos os testes passaram! Sistema funcionando perfeitamente!")
    elif passed >= len(results) // 2:
        print("⚠️  Sistema funcionando com algumas limitações")
    else:
        print("❌ Sistema com problemas críticos")
    
    return passed >= len(results) // 2

if __name__ == "__main__":
    run_all_tests()
