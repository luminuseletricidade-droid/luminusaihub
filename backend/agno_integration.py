
"""
Main integration file for Agno framework with Luminus system
"""

from agno import AgentManager, WorkflowManager
from agno.memory import MemoryManager
from agno.knowledge import KnowledgeManager
from .agno_agents import *
from .agno_workflows import *
from typing import Dict, Any, List
import os

class LuminusAgnoSystem:
    """
    Main class that orchestrates all Agno agents and workflows
    """
    
    def __init__(self):
        # Inicializar managers
        self.agent_manager = AgentManager()
        self.workflow_manager = WorkflowManager()
        self.memory_manager = MemoryManager()
        self.knowledge_manager = KnowledgeManager()
        
        # Registrar agentes
        self.register_agents()
        
        # Registrar workflows
        self.register_workflows()
        
        # Configurar sistema
        self.setup_system()
    
    def register_agents(self):
        """Register all Luminus agents"""
        agents = [
            PDFProcessorAgent(),
            MaintenancePlannerAgent(),
            ScheduleGeneratorAgent(),
            ReportGeneratorAgent(),
            SmartChatAgent()
        ]
        
        for agent in agents:
            self.agent_manager.register_agent(agent)
    
    def register_workflows(self):
        """Register all workflows"""
        workflows = [
            ContractProcessingWorkflow(),
            MaintenanceWorkflow()
        ]
        
        for workflow in workflows:
            self.workflow_manager.register_workflow(workflow)
    
    def setup_system(self):
        """Setup system configurations"""
        # Configurar conexão com banco de dados
        database_url = os.getenv("SUPABASE_DB_URL")
        self.memory_manager.configure_database(database_url)
        
        # Configurar knowledge base
        self.knowledge_manager.load_knowledge_base("luminos_knowledge")
    
    async def process_contract(self, pdf_content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Main entry point for contract processing"""
        workflow = self.workflow_manager.get_workflow("Contract Processing Workflow")
        return await workflow.execute_workflow(pdf_content, metadata)
    
    async def chat_with_user(self, message: str, contract_context: Dict[str, Any] = None) -> str:
        """Main entry point for user chat"""
        chat_agent = self.agent_manager.get_agent("Smart Chat Assistant")
        return await chat_agent.process_user_message(message, contract_context)
    
    async def generate_maintenance_plan(self, equipment_data: Dict[str, Any], contract_type: str) -> Dict[str, Any]:
        """Generate maintenance plan using specialized agent"""
        maintenance_agent = self.agent_manager.get_agent("Maintenance Planner")
        return await maintenance_agent.create_maintenance_plan(equipment_data, contract_type)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get status of all system components"""
        return {
            "agents": self.agent_manager.get_agent_status(),
            "workflows": self.workflow_manager.get_workflow_status(),
            "memory": self.memory_manager.get_memory_status(),
            "knowledge": self.knowledge_manager.get_knowledge_status()
        }

# Singleton instance
luminos_agno_system = LuminusAgnoSystem()
