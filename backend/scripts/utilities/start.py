
#!/usr/bin/env python3
"""
Startup script for Luminus Agno Backend
"""
import os
import sys
import logging
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv não instalado, variáveis de .env não serão carregadas")

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = {
        'fastapi': 'FastAPI',
        'uvicorn': 'Uvicorn',
        'pdfplumber': 'PDFPlumber',
        'PyPDF2': 'PyPDF2',
        'openai': 'OpenAI',
        'pydantic': 'Pydantic'
    }
    
    missing = []
    available = []
    
    for package, name in required_packages.items():
        try:
            if package == 'PyPDF2':
                import PyPDF2
            elif package == 'pdfplumber':
                import pdfplumber
            else:
                __import__(package)
            available.append(name)
        except ImportError:
            missing.append(name)
    
    if available:
        print(f"✅ Dependências disponíveis: {', '.join(available)}")
    
    if missing:
        print(f"❌ Dependências ausentes: {', '.join(missing)}")
        print("Execute: pip install -r requirements.txt")
        return False
    
    print("✅ Todas as dependências verificadas")
    return True

def check_environment():
    """Check environment variables"""
    openai_key = os.getenv('OPENAI_API_KEY')
    if openai_key:
        print("✅ OPENAI_API_KEY configurada")
        key_preview = f"{openai_key[:10]}...{openai_key[-4:]}" if len(openai_key) > 14 else "***"
        print(f"   Preview: {key_preview}")
        return True
    else:
        print("⚠️  OPENAI_API_KEY não configurada")
        print("   O sistema funcionará com limitações")
        return False

def test_basic_functionality():
    """Test basic system functionality"""
    try:
        # Test PDF libraries
        from utils.pdf_extractor import PDFExtractor
        pdf_status = PDFExtractor.get_available_libraries()
        pdf_count = sum(pdf_status.values())
        print(f"📚 Bibliotecas PDF: {pdf_count}/3 disponíveis")
        
        # Test Agno system
        from agno_system import luminos_agno_system
        agno_status = luminos_agno_system.get_system_status()
        if agno_status.get('initialized'):
            print("🤖 Sistema Agno: Inicializado")
        else:
            print("⚠️  Sistema Agno: Problemas na inicialização")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Erro nos testes básicos: {e}")
        return False

def main():
    """Main startup function"""
    print("🌟 Luminus Agno Backend - Iniciando...")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Instale as dependências primeiro:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    
    # Check environment
    env_ok = check_environment()
    
    # Test functionality
    test_basic_functionality()
    
    # Import and start the application
    try:
        import uvicorn
        from main import app
        from config import Config
        
        print("\n" + "=" * 50)
        print("🚀 SERVIDOR INICIANDO")
        print("=" * 50)
        print(f"🌐 URL: http://{Config.HOST}:{Config.PORT}")
        print(f"📖 Docs: http://localhost:{Config.PORT}/docs")
        print(f"🔗 Health: http://localhost:{Config.PORT}/health")
        print(f"💬 Chat: http://localhost:{Config.PORT}/chat")
        print("=" * 50)
        
        if not env_ok:
            print("⚠️  ATENÇÃO: Sistema funcionando sem OpenAI API Key")
        
        print("🔥 Sistema Agno carregado com sucesso!")
        print("🛑 Pressione Ctrl+C para parar")
        
        uvicorn.run(
            app, 
            host=Config.HOST, 
            port=Config.PORT,
            reload=True,
            log_level=Config.LOG_LEVEL.lower()
        )
        
    except KeyboardInterrupt:
        print("\n👋 Servidor parado pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro ao iniciar servidor: {e}")
        print("\nDicas de troubleshooting:")
        print("1. Verifique se a porta 8000 está livre")
        print("2. Confirme se todas as dependências estão instaladas")
        print("3. Verifique os logs acima para mais detalhes")
        sys.exit(1)

if __name__ == "__main__":
    main()
