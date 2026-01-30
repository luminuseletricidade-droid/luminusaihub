
from .base_agent import LuminusBaseAgent
from agno.memory import Memory
from agno.tools import Tool
from typing import Dict, Any, List
import datetime

class MaintenancePlannerAgent(LuminusBaseAgent):
    """
    Agent specialized in creating maintenance plans and schedules
    Level 3: Memory-enabled agent
    """
    
    def __init__(self):
        super().__init__(
            name="Maintenance Planner",
            description="Especialista em planejamento e cronograma de manutenções",
            level=3
        )
        
        # Configurar memória para histórico de planos
        self.memory = Memory()
        
        self.add_tools([
            Tool(
                name="create_maintenance_plan",
                description="Create comprehensive maintenance plan",
                function=self.create_maintenance_plan
            ),
            Tool(
                name="optimize_schedule",
                description="Optimize maintenance schedule based on resources",
                function=self.optimize_schedule
            ),
            Tool(
                name="generate_checklist",
                description="Generate maintenance checklist for specific equipment",
                function=self.generate_checklist
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Planejamento de Manutenção
        
        Você é especialista em:
        1. Criar planos de manutenção preventiva baseados em normas técnicas
        2. Otimizar cronogramas considerando recursos e prioridades
        3. Gerar checklists detalhados para execução
        4. Considerar histórico de manutenções anteriores
        5. Aplicar boas práticas da indústria de geradores
        
        DIRETRIZES TÉCNICAS:
        - Seguir normas ABNT NBR 5410, 14039, NR-10, NR-12
        - Considerar tipo, modelo e idade do equipamento
        - Priorizar segurança e conformidade regulatória
        - Otimizar custos sem comprometer qualidade
        - Documentar todas as atividades e resultados
        
        FREQUÊNCIAS PADRÃO LUMINOS:
        - Mensal: Inspeção visual, níveis, filtros básicos
        - Trimestral: Teste funcional, sistema elétrico
        - Semestral: Análise de óleo, sistema combustível
        - Anual: Revisão geral, calibrações, testes carga
        """
    
    async def create_maintenance_plan(self, equipment_data: Dict[str, Any], contract_type: str) -> Dict[str, Any]:
        """Create comprehensive maintenance plan"""
        
        # Consultar memória para planos similares
        similar_plans = self.memory.search(f"equipment_type:{equipment_data.get('type', '')}")
        
        plan_prompt = f"""
        Crie um plano de manutenção completo para:
        
        EQUIPAMENTO:
        {equipment_data}
        
        TIPO DE CONTRATO: {contract_type}
        
        PLANOS SIMILARES ANTERIORES:
        {similar_plans[:500] if similar_plans else 'Nenhum histórico encontrado'}
        
        O plano deve incluir:
        1. Cronograma de atividades (mensal, trimestral, semestral, anual)
        2. Procedimentos específicos para cada manutenção
        3. Materiais e ferramentas necessários
        4. Tempo estimado para cada atividade
        5. Critérios de qualidade e conformidade
        6. Documentação obrigatória
        
        Formato de saída: JSON estruturado
        """
        
        response = await self.run(plan_prompt)
        
        # Salvar na memória para futuros planos
        self.memory.add(f"maintenance_plan_{equipment_data.get('type', 'unknown')}", response)
        
        return {"maintenance_plan": response}
    
    async def optimize_schedule(self, maintenance_tasks: List[Dict], resources: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize maintenance schedule based on available resources"""
        
        optimization_prompt = f"""
        Otimize este cronograma de manutenção:
        
        TAREFAS:
        {maintenance_tasks}
        
        RECURSOS DISPONÍVEIS:
        {resources}
        
        Critérios de otimização:
        1. Minimizar deslocamentos de técnicos
        2. Balancear carga de trabalho
        3. Respeitar janelas de manutenção do cliente
        4. Priorizar equipamentos críticos
        5. Considerar disponibilidade de peças/materiais
        
        Retorne cronograma otimizado com:
        - Sequência de execução
        - Alocação de recursos
        - Estimativa de tempo total
        - Identificação de gargalos potenciais
        """
        
        response = await self.run(optimization_prompt)
        return {"optimized_schedule": response}
    
    async def generate_checklist(self, equipment_type: str, maintenance_type: str) -> Dict[str, Any]:
        """Generate detailed maintenance checklist"""
        
        checklist_prompt = f"""
        Gere um checklist detalhado para:
        
        EQUIPAMENTO: {equipment_type}
        TIPO DE MANUTENÇÃO: {maintenance_type}
        
        O checklist deve incluir:
        1. Procedimentos de segurança obrigatórios
        2. Verificações passo-a-passo
        3. Medições e testes específicos
        4. Critérios de aprovação/reprovação
        5. Documentação fotográfica necessária
        6. Assinatura de responsáveis
        
        Baseie-se nas normas técnicas aplicáveis e melhores práticas da Luminus.
        """
        
        response = await self.run(checklist_prompt)
        return {"maintenance_checklist": response}
