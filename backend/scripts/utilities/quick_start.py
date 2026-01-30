
#!/usr/bin/env python3
"""
Quick start script para o backend Luminus
"""
import subprocess
import sys
import os

def main():
    print("🚀 Luminus Backend - Quick Start")
    print("=" * 40)
    
    try:
        # Instalar dependências
        print("📦 Instalando dependências...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True)
        print("✅ Dependências instaladas!")
        
        # Verificar OpenAI API Key
        if os.getenv('OPENAI_API_KEY'):
            print("✅ OpenAI API Key configurada")
        else:
            print("⚠️  OpenAI API Key não encontrada")
        
        # Iniciar servidor
        print("\n🔥 Iniciando servidor...")
        print("📖 Docs: http://localhost:8000/docs")
        print("🔗 Health: http://localhost:8000/health")
        
        subprocess.run([sys.executable, "start.py"])
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Servidor parado")

if __name__ == "__main__":
    main()
