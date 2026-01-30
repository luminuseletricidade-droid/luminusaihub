
from .base_agent import LuminusBaseAgent
from agno.tools import Tool
from typing import Dict, Any, List
import datetime

class ScheduleGeneratorAgent(LuminusBaseAgent):
    """
    Agent specialized in generating technical schedules and timelines
    Level 2: Knowledge-enabled agent
    """
    
    def __init__(self):
        super().__init__(
            name="Schedule Generator",
            description="Especialista em geração de cronogramas técnicos",
            level=2
        )
        
        self.add_tools([
            Tool(
                name="generate_schedule",
                description="Generate detailed schedule for maintenance activities",
                function=self.generate_schedule
            ),
            Tool(
                name="optimize_timeline",
                description="Optimize timeline considering constraints",
                function=self.optimize_timeline
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Geração de Cronogramas Técnicos
        
        Você é responsável por:
        1. Criar cronogramas detalhados de manutenção
        2. Otimizar sequências de atividades
        3. Considerar restrições de tempo e recursos
        4. Gerar marcos e deadlines críticos
        5. Balancear carga de trabalho das equipes técnicas
        """
    
    async def generate_schedule(self, maintenance_plan: Dict[str, Any], constraints: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate detailed schedule from maintenance plan"""
        prompt = f"""
        Gere um cronograma detalhado baseado neste plano de manutenção:
        
        PLANO: {maintenance_plan}
        RESTRIÇÕES: {constraints or 'Nenhuma restrição específica'}
        
        Inclua:
        1. Sequência otimizada de atividades
        2. Duração estimada para cada tarefa
        3. Dependências entre atividades
        4. Marcos críticos e deadlines
        5. Recursos necessários por período
        """
        
        response = await self.run(prompt)
        return {"schedule": response}
    
    async def optimize_timeline(self, schedule: Dict[str, Any], optimization_criteria: List[str]) -> Dict[str, Any]:
        """Optimize timeline based on specific criteria"""
        prompt = f"""
        Otimize este cronograma:
        
        CRONOGRAMA ATUAL: {schedule}
        CRITÉRIOS DE OTIMIZAÇÃO: {optimization_criteria}
        
        Considere:
        - Minimização de tempo total
        - Balanceamento de recursos
        - Redução de custos
        - Maximização de qualidade
        """
        
        response = await self.run(prompt)
        return {"optimized_timeline": response}
