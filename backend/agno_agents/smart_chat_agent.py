
from .base_agent import LuminusBaseAgent
from agno.memory import ConversationMemory
from agno.tools import Tool
from typing import Dict, Any, List

class SmartChatAgent(LuminusBaseAgent):
    """
    Advanced conversational agent with memory and context awareness
    Level 4: Team collaboration enabled
    """
    
    def __init__(self):
        super().__init__(
            name="Smart Chat Assistant",
            description="Assistente conversacional inteligente com memória e colaboração",
            level=4
        )
        
        # Configurar memória de conversação
        self.conversation_memory = ConversationMemory()
        
        self.add_tools([
            Tool(
                name="search_contract_info",
                description="Search for specific contract information",
                function=self.search_contract_info
            ),
            Tool(
                name="collaborate_with_agents",
                description="Collaborate with other specialized agents",
                function=self.collaborate_with_agents
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Chat Inteligente e Colaboração
        
        Você é o assistente principal que interage com usuários e coordena outros agentes.
        
        CAPACIDADES ESPECIAIS:
        1. Memória persistente de conversações
        2. Acesso à base de conhecimento técnica
        3. Colaboração com agentes especializados:
           - PDF Processor: Para análise de documentos
           - Maintenance Planner: Para planos de manutenção
           - Schedule Generator: Para cronogramas
           - Report Generator: Para relatórios
        
        COMPORTAMENTO:
        - Mantenha contexto das conversas anteriores
        - Identifique quando precisa de ajuda de agentes especializados
        - Forneça respostas completas e contextualizadas
        - Seja proativo em sugerir ações relevantes
        - Use colaboração inter-agentes quando necessário
        
        EXEMPLOS DE COLABORAÇÃO:
        - Usuário pergunta sobre contrato → Colabora com PDF Processor
        - Usuário quer plano manutenção → Colabora com Maintenance Planner
        - Usuário precisa relatório → Colabora com Report Generator
        """
    
    async def process_user_message(self, message: str, contract_context: Dict[str, Any] = None) -> str:
        """Process user message with memory and context"""
        
        # Adicionar contexto à memória
        if contract_context:
            context_str = f"Contexto do contrato: {contract_context.get('contract_number', 'N/A')}"
            self.conversation_memory.add_context(context_str)
        
        # Adicionar mensagem do usuário à memória
        self.conversation_memory.add_message("user", message)
        
        # Construir prompt com memória
        conversation_history = self.conversation_memory.get_recent_messages(limit=10)
        
        prompt = f"""
        HISTÓRICO DA CONVERSA:
        {conversation_history}
        
        MENSAGEM ATUAL DO USUÁRIO:
        {message}
        
        CONTEXTO DO CONTRATO (se disponível):
        {contract_context or 'Nenhum contrato específico selecionado'}
        
        Responda de forma natural e útil. Se precisar de informações especializadas,
        indique que tipo de colaboração com outros agentes seria necessária.
        """
        
        response = await self.run(prompt)
        
        # Adicionar resposta à memória
        self.conversation_memory.add_message("assistant", response)
        
        return response
    
    async def search_contract_info(self, query: str, contract_id: str = None) -> Dict[str, Any]:
        """Search for specific contract information"""
        # Integração com database/knowledge base
        search_prompt = f"""
        Busque informações sobre: {query}
        {'Para o contrato: ' + contract_id if contract_id else 'Em todos os contratos'}
        
        Use a base de conhecimento e informações disponíveis para fornecer
        uma resposta precisa e estruturada.
        """
        
        response = await self.run(search_prompt)
        return {"search_results": response}
    
    async def collaborate_with_agents(self, task: str, agent_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Collaborate with other specialized agents"""
        collaboration_prompt = f"""
        Preciso colaborar com o agente '{agent_type}' para:
        {task}
        
        Dados disponíveis:
        {data}
        
        Prepare uma solicitação estruturada para enviar ao agente especializado.
        """
        
        response = await self.run(collaboration_prompt)
        return {"collaboration_request": response, "target_agent": agent_type}
