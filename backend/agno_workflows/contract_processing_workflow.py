
from agno import Workflow, WorkflowStep
from agno.coordination import AgentCoordinator
from ..agno_agents import PDFProcessorAgent, MaintenancePlannerAgent, SmartChatAgent
from typing import Dict, Any

class ContractProcessingWorkflow(Workflow):
    """
    End-to-end workflow for contract processing
    Level 5: Deterministic workflow with state management
    """
    
    def __init__(self):
        super().__init__(name="Contract Processing Workflow")
        
        # Inicializar agentes
        self.pdf_agent = PDFProcessorAgent()
        self.maintenance_agent = MaintenancePlannerAgent()
        self.chat_agent = SmartChatAgent()
        
        # Configurar coordenador
        self.coordinator = AgentCoordinator([
            self.pdf_agent,
            self.maintenance_agent,
            self.chat_agent
        ])
        
        # Definir steps do workflow
        self.define_workflow_steps()
    
    def define_workflow_steps(self):
        """Define the sequential steps of contract processing"""
        
        self.add_step(WorkflowStep(
            name="pdf_extraction",
            description="Extract data from PDF contract",
            agent=self.pdf_agent,
            function=self.extract_pdf_data,
            next_steps=["data_validation"]
        ))
        
        self.add_step(WorkflowStep(
            name="data_validation",
            description="Validate extracted contract data",
            agent=self.pdf_agent,
            function=self.validate_contract_data,
            next_steps=["maintenance_planning", "database_storage"]
        ))
        
        self.add_step(WorkflowStep(
            name="maintenance_planning",
            description="Create maintenance plan based on contract",
            agent=self.maintenance_agent,
            function=self.create_maintenance_plan,
            next_steps=["workflow_completion"]
        ))
        
        self.add_step(WorkflowStep(
            name="database_storage",
            description="Store processed data in database",
            agent=None,  # Sistema interno
            function=self.store_in_database,
            next_steps=["workflow_completion"]
        ))
        
        self.add_step(WorkflowStep(
            name="workflow_completion",
            description="Finalize workflow and generate summary",
            agent=self.chat_agent,
            function=self.generate_workflow_summary,
            next_steps=[]
        ))
    
    async def execute_workflow(self, pdf_content: bytes, contract_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the complete contract processing workflow"""
        
        workflow_state = {
            "pdf_content": pdf_content,
            "contract_metadata": contract_metadata,
            "extracted_data": None,
            "validation_result": None,
            "maintenance_plan": None,
            "storage_result": None,
            "workflow_summary": None
        }
        
        try:
            # Step 1: PDF Extraction
            extraction_result = await self.run_step("pdf_extraction", workflow_state)
            workflow_state["extracted_data"] = extraction_result
            
            # Step 2: Data Validation
            validation_result = await self.run_step("data_validation", workflow_state)
            workflow_state["validation_result"] = validation_result
            
            # Step 3: Parallel execution - Maintenance Planning & Database Storage
            maintenance_task = self.run_step("maintenance_planning", workflow_state)
            storage_task = self.run_step("database_storage", workflow_state)
            
            maintenance_result, storage_result = await asyncio.gather(
                maintenance_task, storage_task
            )
            
            workflow_state["maintenance_plan"] = maintenance_result
            workflow_state["storage_result"] = storage_result
            
            # Step 4: Workflow Completion
            summary_result = await self.run_step("workflow_completion", workflow_state)
            workflow_state["workflow_summary"] = summary_result
            
            return {
                "success": True,
                "workflow_state": workflow_state,
                "message": "Contract processed successfully through complete workflow"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_state": workflow_state,
                "message": "Workflow execution failed"
            }
    
    async def extract_pdf_data(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data from PDF using PDF Processor Agent"""
        pdf_text = self.extract_text_from_pdf(workflow_state["pdf_content"])
        return await self.pdf_agent.extract_contract_data(pdf_text)
    
    async def validate_contract_data(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted contract data"""
        extracted_data = workflow_state["extracted_data"]
        validation_result = await self.pdf_agent.validate_contract_data(extracted_data)
        
        # Check if validation failed due to missing CNPJ
        if validation_result.get("status") == "invalid":
            raise ValueError(validation_result.get("message", "Documento inválido"))
        
        return validation_result
    
    async def create_maintenance_plan(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Create maintenance plan based on contract data"""
        extracted_data = workflow_state["extracted_data"]
        equipment_data = extracted_data.get("equipamentos", [])
        contract_type = extracted_data.get("contrato", {}).get("tipo", "manutenção")
        
        if equipment_data:
            return await self.maintenance_agent.create_maintenance_plan(
                equipment_data[0], contract_type
            )
        return {"maintenance_plan": "No equipment data available"}
    
    async def store_in_database(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Store processed data in database"""
        # Implementar integração com Supabase
        return {"status": "stored", "message": "Data stored successfully"}
    
    async def generate_workflow_summary(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final workflow summary"""
        summary_prompt = f"""
        Gere um resumo executivo do processamento do contrato:
        
        DADOS EXTRAÍDOS: {workflow_state.get('extracted_data', {})}
        VALIDAÇÃO: {workflow_state.get('validation_result', {})}
        PLANO DE MANUTENÇÃO: {workflow_state.get('maintenance_plan', {})}
        
        Inclua:
        1. Status geral do processamento
        2. Informações principais do contrato
        3. Próximos passos recomendados
        4. Alertas ou observações importantes
        """
        
        return await self.chat_agent.run(summary_prompt)
    
    def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Helper method to extract text from PDF content"""
        # Implementar extração de texto do PDF
        # (reutilizar código existente do main.py)
        return "PDF text content here"
