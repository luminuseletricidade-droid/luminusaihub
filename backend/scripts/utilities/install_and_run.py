
#!/usr/bin/env python3
"""
Script automatizado para instalar dependências e iniciar o backend Luminus
"""
import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Execute um comando e exibe o resultado"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True)
        print(f"✅ {description} - Sucesso!")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erro!")
        print(f"Error: {e.stderr}")
        return False

def check_python():
    """Verifica se Python está disponível"""
    try:
        result = subprocess.run([sys.executable, "--version"], 
                              capture_output=True, text=True)
        print(f"✅ Python encontrado: {result.stdout.strip()}")
        return True
    except:
        print("❌ Python não encontrado!")
        return False

def install_dependencies():
    """Instala as dependências do requirements.txt"""
    print("📦 Instalando dependências do backend...")
    
    # Upgrade pip primeiro
    if not run_command(f"{sys.executable} -m pip install --upgrade pip", 
                      "Atualizando pip"):
        return False
    
    # Instalar dependências
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt", 
                      "Instalando dependências"):
        return False
    
    return True

def check_environment():
    """Verifica variáveis de ambiente"""
    print("\n🔍 Verificando configuração...")
    
    openai_key = os.getenv('OPENAI_API_KEY')
    if openai_key:
        print("✅ OPENAI_API_KEY configurada")
        print(f"   Key preview: {openai_key[:10]}...{openai_key[-4:]}")
    else:
        print("⚠️  OPENAI_API_KEY não encontrada")
        print("   O sistema funcionará com limitações")
    
    return True

def test_imports():
    """Testa se as dependências principais podem ser importadas"""
    print("\n🧪 Testando importações...")
    
    test_modules = [
        'fastapi', 'uvicorn', 'pdfplumber', 'PyPDF2', 
        'pdfminer', 'openai', 'dotenv', 'pydantic'
    ]
    
    success_count = 0
    for module in test_modules:
        try:
            if module == 'pdfminer':
                __import__('pdfminer.high_level')
            elif module == 'dotenv':
                __import__('python_dotenv')
            else:
                __import__(module)
            print(f"✅ {module}")
            success_count += 1
        except ImportError as e:
            print(f"❌ {module}: {e}")
    
    print(f"\n📊 Módulos importados: {success_count}/{len(test_modules)}")
    return success_count >= len(test_modules) - 1  # Permitir 1 falha

def start_server():
    """Inicia o servidor FastAPI"""
    print("\n🚀 Iniciando servidor Luminus Agno...")
    print("📖 Documentação: http://localhost:8000/docs")
    print("🔗 Health Check: http://localhost:8000/health")
    print("💬 Chat Test: http://localhost:8000")
    print("\n🔥 Pressione Ctrl+C para parar o servidor")
    
    try:
        # Importar e iniciar o app
        os.system(f"{sys.executable} start.py")
    except KeyboardInterrupt:
        print("\n👋 Servidor parado pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro ao iniciar servidor: {e}")

def main():
    """Função principal"""
    print("🌟 Luminus Backend - Instalação e Inicialização")
    print("=" * 50)
    
    # Verificar Python
    if not check_python():
        sys.exit(1)
    
    # Mudar para diretório do backend
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    print(f"📁 Diretório: {backend_dir}")
    
    # Instalar dependências
    if not install_dependencies():
        print("\n❌ Falha na instalação de dependências")
        sys.exit(1)
    
    # Verificar ambiente
    check_environment()
    
    # Testar importações
    if not test_imports():
        print("\n⚠️  Algumas dependências falharam, mas continuando...")
    
    # Iniciar servidor
    start_server()

if __name__ == "__main__":
    main()
