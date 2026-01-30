
from .base_agent import LuminusBaseAgent
from agno.tools import Tool
from typing import Dict, Any, List

class ReportGeneratorAgent(LuminusBaseAgent):
    """
    Agent specialized in generating comprehensive reports
    Level 2: Knowledge-enabled agent
    """
    
    def __init__(self):
        super().__init__(
            name="Report Generator",
            description="Especialista em geração de relatórios técnicos e gerenciais",
            level=2
        )
        
        self.add_tools([
            Tool(
                name="generate_technical_report",
                description="Generate technical maintenance report",
                function=self.generate_technical_report
            ),
            Tool(
                name="generate_management_report",
                description="Generate management summary report",
                function=self.generate_management_report
            ),
            Tool(
                name="generate_excel_data",
                description="Generate structured data for Excel reports",
                function=self.generate_excel_data
            )
        ])
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return f"""
        {base_prompt}
        
        ESPECIALIZAÇÃO: Geração de Relatórios
        
        Você é especialista em:
        1. Relatórios técnicos detalhados de manutenção
        2. Resumos executivos para gestão
        3. Análises de performance e indicadores
        4. Estruturação de dados para Excel/dashboards
        5. Compliance e documentação regulatória
        
        TIPOS DE RELATÓRIOS:
        - Técnicos: Procedimentos, resultados, conformidade
        - Gerenciais: KPIs, custos, performance
        - Regulatórios: Auditorias, certificações
        - Operacionais: Cronogramas, recursos, status
        """
    
    async def generate_technical_report(self, maintenance_data: Dict[str, Any], contract_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive technical report"""
        prompt = f"""
        Gere um relatório técnico completo:
        
        DADOS DE MANUTENÇÃO: {maintenance_data}
        INFORMAÇÕES DO CONTRATO: {contract_info}
        
        O relatório deve incluir:
        1. Resumo executivo
        2. Detalhes técnicos das atividades realizadas
        3. Resultados de testes e medições
        4. Não conformidades identificadas
        5. Recomendações técnicas
        6. Próximos passos
        7. Assinaturas e aprovações
        
        Formato: Documento estruturado pronto para impressão/PDF
        """
        
        response = await self.run(prompt)
        return {"technical_report": response}
    
    async def generate_management_report(self, contracts_data: List[Dict[str, Any]], period: str) -> Dict[str, Any]:
        """Generate management summary report"""
        prompt = f"""
        Gere um relatório gerencial para o período: {period}
        
        DADOS DOS CONTRATOS: {contracts_data}
        
        Inclua:
        1. Dashboard executivo com KPIs principais
        2. Análise de performance por contrato
        3. Indicadores financeiros (receita, custos, margem)
        4. Status de conformidade e qualidade
        5. Análise de tendências e oportunidades
        6. Recomendações estratégicas
        
        Formato: Apresentação executiva com gráficos e métricas
        """
        
        response = await self.run(prompt)
        return {"management_report": response}
    
    async def generate_excel_data(self, raw_data: Dict[str, Any], report_type: str) -> Dict[str, Any]:
        """Generate structured data for Excel reports"""
        prompt = f"""
        Estruture estes dados para relatório Excel:
        
        DADOS BRUTOS: {raw_data}
        TIPO DE RELATÓRIO: {report_type}
        
        Retorne estrutura JSON com:
        1. Planilhas sugeridas (sheets)
        2. Colunas para cada planilha
        3. Dados formatados e organizados
        4. Fórmulas e cálculos sugeridos
        5. Formatação condicional recomendada
        
        Objetivo: Facilitar geração automatizada de Excel
        """
        
        response = await self.run(prompt)
        return {"excel_structure": response}
