
from agno import Agent, AgentConfig
from agno.memory import Memory
from agno.knowledge import KnowledgeBase
from typing import Dict, Any, Optional
import openai
import os

class LuminusBaseAgent(Agent):
    """
    Base agent class for all Luminus agents with shared configurations
    """
    
    def __init__(self, name: str, description: str, level: int = 2):
        config = AgentConfig(
            name=name,
            description=description,
            model="gpt-5-mini-2025-08-07",
            api_key=os.getenv("OPENAI_API_KEY"),
            level=level,
            memory_enabled=level >= 3,
            knowledge_enabled=level >= 2,
            collaboration_enabled=level >= 4
        )
        
        super().__init__(config)
        
        # Configurar knowledge base compartilhada
        if self.config.knowledge_enabled:
            self.setup_knowledge_base()
    
    def setup_knowledge_base(self):
        """Setup knowledge base with technical standards and best practices"""
        knowledge_data = [
            {
                "topic": "Generator Maintenance Standards",
                "content": """
                NORMAS TÉCNICAS PARA MANUTENÇÃO DE GERADORES:
                
                1. ABNT NBR 5410 - Instalações elétricas de baixa tensão
                2. ABNT NBR 14039 - Instalações elétricas de média tensão
                3. NR-10 - Segurança em instalações e serviços em eletricidade
                4. NR-12 - Segurança no trabalho em máquinas e equipamentos
                
                FREQUÊNCIAS RECOMENDADAS:
                - Manutenção preventiva mensal: Verificação geral, níveis, filtros
                - Manutenção preventiva trimestral: Teste de carga, sistema de arrefecimento
                - Manutenção preventiva semestral: Análise de óleo, sistema de combustível
                - Manutenção preventiva anual: Revisão geral, calibrações
                """
            },
            {
                "topic": "Contract Types",
                "content": """
                TIPOS DE CONTRATOS LUMINOS:
                
                1. MANUTENÇÃO PREVENTIVA:
                   - Inspeções regulares programadas
                   - Substituição de componentes por tempo/uso
                   - Relatórios técnicos periódicos
                
                2. MANUTENÇÃO CORRETIVA:
                   - Atendimento emergencial 24/7
                   - Reparo de falhas e defeitos
                   - Diagnóstico e solução de problemas
                
                3. LOCAÇÃO DE GERADORES:
                   - Fornecimento temporário de equipamentos
                   - Instalação e configuração no local
                   - Manutenção incluída durante locação
                
                4. CONTRATOS MISTOS:
                   - Combinação de manutenção + locação
                   - Flexibilidade conforme necessidade do cliente
                """
            }
        ]
        
        self.knowledge_base = KnowledgeBase()
        for item in knowledge_data:
            self.knowledge_base.add(item["topic"], item["content"])
    
    def get_system_prompt(self) -> str:
        """Get base system prompt for Luminus agents"""
        return """
        Você é um assistente especializado da Luminus, empresa líder em manutenção e locação de geradores.
        
        CONTEXTO DA EMPRESA:
        - Atua no setor de manutenção preventiva e corretiva de geradores
        - Oferece serviços de locação de equipamentos
        - Foco em contratos B2B com empresas de diversos setores
        - Compromisso com qualidade, segurança e conformidade técnica
        
        DIRETRIZES GERAIS:
        - Sempre priorize segurança e conformidade com normas técnicas
        - Use linguagem profissional mas acessível
        - Seja preciso com informações técnicas e contratuais
        - Identifique oportunidades de melhoria nos processos
        - Mantenha foco na excelência do atendimento ao cliente
        """
