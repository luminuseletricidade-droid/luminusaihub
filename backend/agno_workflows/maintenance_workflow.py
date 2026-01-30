
from agno import Workflow, WorkflowStep
from agno.coordination import AgentCoordinator
from ..agno_agents import MaintenancePlannerAgent, ScheduleGeneratorAgent, ReportGeneratorAgent
from typing import Dict, Any
import asyncio

class MaintenanceWorkflow(Workflow):
    """
    Workflow for complete maintenance planning and execution
    """
    
    def __init__(self):
        super().__init__(name="Maintenance Workflow")
        
        # Inicializar agentes
        self.planner_agent = MaintenancePlannerAgent()
        self.schedule_agent = ScheduleGeneratorAgent()
        self.report_agent = ReportGeneratorAgent()
        
        # Configurar coordenador
        self.coordinator = AgentCoordinator([
            self.planner_agent,
            self.schedule_agent,
            self.report_agent
        ])
        
        # Definir steps do workflow
        self.define_workflow_steps()
    
    def define_workflow_steps(self):
        """Define maintenance workflow steps"""
        
        self.add_step(WorkflowStep(
            name="plan_creation",
            description="Create comprehensive maintenance plan",
            agent=self.planner_agent,
            function=self.create_plan,
            next_steps=["schedule_generation"]
        ))
        
        self.add_step(WorkflowStep(
            name="schedule_generation",
            description="Generate optimized schedule",
            agent=self.schedule_agent,
            function=self.generate_schedule,
            next_steps=["report_generation"]
        ))
        
        self.add_step(WorkflowStep(
            name="report_generation",
            description="Generate maintenance reports",
            agent=self.report_agent,
            function=self.generate_reports,
            next_steps=[]
        ))
    
    async def execute_maintenance_workflow(self, equipment_data: Dict[str, Any], contract_type: str) -> Dict[str, Any]:
        """Execute complete maintenance workflow"""
        
        workflow_state = {
            "equipment_data": equipment_data,
            "contract_type": contract_type,
            "maintenance_plan": None,
            "schedule": None,
            "reports": None
        }
        
        try:
            # Step 1: Plan Creation
            plan_result = await self.run_step("plan_creation", workflow_state)
            workflow_state["maintenance_plan"] = plan_result
            
            # Step 2: Schedule Generation
            schedule_result = await self.run_step("schedule_generation", workflow_state)
            workflow_state["schedule"] = schedule_result
            
            # Step 3: Report Generation
            report_result = await self.run_step("report_generation", workflow_state)
            workflow_state["reports"] = report_result
            
            return {
                "success": True,
                "workflow_state": workflow_state,
                "message": "Maintenance workflow completed successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_state": workflow_state,
                "message": "Maintenance workflow failed"
            }
    
    async def create_plan(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Create maintenance plan"""
        return await self.planner_agent.create_maintenance_plan(
            workflow_state["equipment_data"],
            workflow_state["contract_type"]
        )
    
    async def generate_schedule(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate optimized schedule"""
        maintenance_plan = workflow_state["maintenance_plan"]
        return await self.schedule_agent.generate_schedule(maintenance_plan)
    
    async def generate_reports(self, workflow_state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive reports"""
        maintenance_data = {
            "plan": workflow_state["maintenance_plan"],
            "schedule": workflow_state["schedule"]
        }
        contract_info = {
            "equipment": workflow_state["equipment_data"],
            "type": workflow_state["contract_type"]
        }
        
        return await self.report_agent.generate_technical_report(
            maintenance_data, contract_info
        )
