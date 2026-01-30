"""
Document Generator Agents for Contract Processing
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json
from pydantic import BaseModel

class ContractDocument(BaseModel):
    contract_id: str
    agent_type: str
    content: str
    metadata: Dict[str, Any]

class MaintenancePlanAgent:
    """Agente especializado em gerar planos de manutenção"""
    
    def generate(self, contract_data: Dict[str, Any]) -> str:
        """Gera plano de manutenção completo com cronograma"""
        client_name = contract_data.get('client_name', 'Cliente')
        equipment = contract_data.get('equipment', {})
        start_date = datetime.fromisoformat(contract_data.get('start_date', datetime.now().isoformat()))

        # Tipos de manutenção
        maintenance_types = [
            "Manutenção Preventiva Mensal",
            "Vistoria 250h",
            "Manutenção Corretiva",
            "Inspeção Trimestral",
            "Revisão Anual"
        ]
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 20px; }}
                h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
                h2 {{ color: #34495e; margin-top: 30px; }}
                h3 {{ color: #7f8c8d; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #3498db; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ecf0f1; }}
                tr:hover {{ background-color: #f8f9fa; }}
                .info-box {{ background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .checklist {{ list-style-type: none; padding: 0; }}
                .checklist li {{ padding: 8px 0; border-bottom: 1px solid #ddd; }}
                .checklist li:before {{ content: "☐ "; font-size: 1.2em; margin-right: 10px; }}
            </style>
        </head>
        <body>
            <h1>PLANO DE MANUTENÇÃO PREVENTIVA E CRONOGRAMA</h1>
            
            <div class="info-box">
                <h3>INFORMAÇÕES DO CONTRATO</h3>
                <p><strong>Cliente:</strong> {client_name}</p>
                <p><strong>Equipamento:</strong> {equipment.get('type', 'Gerador')} - {equipment.get('model', 'Modelo não especificado')}</p>
                <p><strong>Local:</strong> {equipment.get('location', 'A definir')}</p>
                <p><strong>Período:</strong> {start_date.strftime('%d/%m/%Y')} - {(start_date + timedelta(days=365)).strftime('%d/%m/%Y')}</p>
            </div>
            
            <h2>1. CRONOGRAMA ANUAL DE MANUTENÇÃO</h2>
            <table>
                <tr>
                    <th>MÊS</th>
                    <th>DATA PREVISTA</th>
                    <th>TÉCNICO</th>
                    <th>TIPO O.S.</th>
                    <th>DESCRIÇÃO</th>
                    <th>STATUS</th>
                </tr>
        """
        
        # Gerar cronograma para 12 meses
        months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        
        for i, month in enumerate(months):
            date = start_date + timedelta(days=30*i)
            maint_type = maintenance_types[i % len(maintenance_types)]

            html_content += f"""
                <tr>
                    <td>{month}</td>
                    <td>{date.strftime('%d/%m/%Y')}</td>
                    <td>A definir</td>
                    <td>{maint_type}</td>
                    <td>Inspeção completa do sistema, verificação de componentes</td>
                    <td>Programado</td>
                </tr>
            """
        
        html_content += """
            </table>
            
            <h2>2. ROTEIRO DE MANUTENÇÃO PREVENTIVA</h2>
            <h3>2.1 VERIFICAÇÕES MENSAIS</h3>
            <ul class="checklist">
                <li>Verificar nível de óleo lubrificante</li>
                <li>Verificar nível de água do radiador</li>
                <li>Verificar tensão das correias</li>
                <li>Verificar funcionamento do painel de controle</li>
                <li>Testar partida automática e manual</li>
                <li>Verificar ruídos anormais</li>
                <li>Verificar vazamentos</li>
                <li>Limpar filtro de ar</li>
                <li>Verificar carga da bateria</li>
                <li>Registrar horímetro</li>
            </ul>
            
            <h3>2.2 VERIFICAÇÕES TRIMESTRAIS</h3>
            <ul class="checklist">
                <li>Trocar óleo lubrificante</li>
                <li>Trocar filtro de óleo</li>
                <li>Trocar filtro de combustível</li>
                <li>Verificar injetores</li>
                <li>Ajustar válvulas</li>
                <li>Verificar turbo compressor</li>
                <li>Testar proteções elétricas</li>
                <li>Verificar isolamento dos cabos</li>
                <li>Limpar radiador</li>
                <li>Verificar mangueiras</li>
            </ul>
            
            <h3>2.3 VERIFICAÇÕES SEMESTRAIS</h3>
            <ul class="checklist">
                <li>Análise de óleo lubrificante</li>
                <li>Teste de carga completo</li>
                <li>Verificação termográfica</li>
                <li>Calibração de instrumentos</li>
                <li>Teste de isolamento</li>
                <li>Verificar aterramento</li>
                <li>Limpar tanque de combustível</li>
                <li>Verificar bombas injetoras</li>
            </ul>
            
            <h2>3. CONTROLE DE HORAS TRABALHADAS</h2>
            <table>
                <tr>
                    <th>INTERVALO DE HORAS</th>
                    <th>TIPO DE MANUTENÇÃO</th>
                    <th>ITENS PRINCIPAIS</th>
                </tr>
                <tr>
                    <td>50 horas</td>
                    <td>Inspeção Visual</td>
                    <td>Verificação geral, níveis, vazamentos</td>
                </tr>
                <tr>
                    <td>250 horas</td>
                    <td>Manutenção Básica</td>
                    <td>Troca de óleo, filtros, ajustes</td>
                </tr>
                <tr>
                    <td>500 horas</td>
                    <td>Manutenção Intermediária</td>
                    <td>Revisão do sistema de injeção, válvulas</td>
                </tr>
                <tr>
                    <td>1000 horas</td>
                    <td>Manutenção Completa</td>
                    <td>Revisão geral, testes de performance</td>
                </tr>
                <tr>
                    <td>2000 horas</td>
                    <td>Overhaul Parcial</td>
                    <td>Recondicionamento de componentes</td>
                </tr>
            </table>
            
            <h2>4. PEÇAS DE REPOSIÇÃO RECOMENDADAS</h2>
            <table>
                <tr>
                    <th>ITEM</th>
                    <th>DESCRIÇÃO</th>
                    <th>QUANTIDADE</th>
                    <th>PERIODICIDADE</th>
                </tr>
                <tr>
                    <td>1</td>
                    <td>Filtro de óleo lubrificante</td>
                    <td>4</td>
                    <td>Trimestral</td>
                </tr>
                <tr>
                    <td>2</td>
                    <td>Filtro de combustível</td>
                    <td>4</td>
                    <td>Trimestral</td>
                </tr>
                <tr>
                    <td>3</td>
                    <td>Filtro de ar</td>
                    <td>2</td>
                    <td>Semestral</td>
                </tr>
                <tr>
                    <td>4</td>
                    <td>Correia do alternador</td>
                    <td>1</td>
                    <td>Anual</td>
                </tr>
                <tr>
                    <td>5</td>
                    <td>Mangueira do radiador</td>
                    <td>2</td>
                    <td>Anual</td>
                </tr>
            </table>
            
            <h2>5. OBSERVAÇÕES E RECOMENDAÇÕES</h2>
            <div class="info-box">
                <ul>
                    <li>Manter registro detalhado de todas as manutenções realizadas</li>
                    <li>Utilizar apenas peças originais ou homologadas pelo fabricante</li>
                    <li>Seguir rigorosamente os intervalos de manutenção</li>
                    <li>Treinar operadores sobre procedimentos de partida e parada</li>
                    <li>Manter área do gerador limpa e ventilada</li>
                    <li>Verificar diariamente os níveis antes da partida</li>
                </ul>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><small>Documento gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}</small></p>
                <p><small>Agente: Plano de Manutenção e Cronograma v1.0</small></p>
            </div>
        </body>
        </html>
        """
        
        return html_content

class TechnicalDocumentationAgent:
    """Agente especializado em documentação técnica e EAP"""
    
    def generate(self, contract_data: Dict[str, Any]) -> str:
        """Gera documentação técnica completa com memorial descritivo"""
        client_name = contract_data.get('client_name', 'Cliente')
        equipment = contract_data.get('equipment', {})
        services = contract_data.get('services', [])
        value = contract_data.get('value', 0)
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 20px; }}
                h1 {{ color: #27ae60; border-bottom: 2px solid #2ecc71; padding-bottom: 10px; }}
                h2 {{ color: #2c3e50; margin-top: 30px; }}
                h3 {{ color: #7f8c8d; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #27ae60; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ecf0f1; }}
                .spec-box {{ background-color: #f0f3f4; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0; }}
                .eap-item {{ margin-left: 20px; padding: 5px 0; }}
                .level-1 {{ font-weight: bold; margin-top: 15px; }}
                .level-2 {{ margin-left: 20px; }}
                .level-3 {{ margin-left: 40px; font-size: 0.9em; }}
            </style>
        </head>
        <body>
            <h1>MEMORIAL DESCRITIVO E DOCUMENTAÇÃO TÉCNICA</h1>
            
            <div class="spec-box">
                <h3>DADOS DO PROJETO</h3>
                <p><strong>Cliente:</strong> {client_name}</p>
                <p><strong>Tipo de Contrato:</strong> Manutenção e Assistência Técnica</p>
                <p><strong>Equipamento Principal:</strong> {equipment.get('type', 'Gerador')}</p>
                <p><strong>Valor Global:</strong> R$ {value:,.2f}</p>
            </div>
            
            <h2>1. ESPECIFICAÇÕES TÉCNICAS DO EQUIPAMENTO</h2>
            <table>
                <tr>
                    <th>CARACTERÍSTICA</th>
                    <th>ESPECIFICAÇÃO</th>
                    <th>NORMA APLICÁVEL</th>
                </tr>
                <tr>
                    <td>Tipo</td>
                    <td>{equipment.get('type', 'Grupo Gerador')}</td>
                    <td>NBR 14039</td>
                </tr>
                <tr>
                    <td>Potência</td>
                    <td>150 kVA</td>
                    <td>ISO 8528</td>
                </tr>
                <tr>
                    <td>Tensão Nominal</td>
                    <td>380/220V</td>
                    <td>NBR 5410</td>
                </tr>
                <tr>
                    <td>Frequência</td>
                    <td>60 Hz</td>
                    <td>IEC 60034</td>
                </tr>
                <tr>
                    <td>Fator de Potência</td>
                    <td>0,8</td>
                    <td>NBR 5052</td>
                </tr>
                <tr>
                    <td>Regime de Operação</td>
                    <td>Stand-by / Prime</td>
                    <td>ISO 3046</td>
                </tr>
                <tr>
                    <td>Sistema de Partida</td>
                    <td>Elétrica 24V</td>
                    <td>SAE J1171</td>
                </tr>
                <tr>
                    <td>Capacidade do Tanque</td>
                    <td>250 litros</td>
                    <td>ANP 42</td>
                </tr>
            </table>
            
            <h2>2. ESTRUTURA ANALÍTICA DO PROJETO (EAP)</h2>
            <div class="eap-structure">
                <div class="level-1">1. GESTÃO DO CONTRATO</div>
                <div class="level-2">1.1 Planejamento</div>
                <div class="level-3">1.1.1 Elaboração do cronograma</div>
                <div class="level-3">1.1.2 Definição de recursos</div>
                <div class="level-3">1.1.3 Análise de riscos</div>
                <div class="level-2">1.2 Execução</div>
                <div class="level-3">1.2.1 Mobilização de equipe</div>
                <div class="level-3">1.2.2 Aquisição de materiais</div>
                <div class="level-3">1.2.3 Coordenação de atividades</div>
                <div class="level-2">1.3 Monitoramento</div>
                <div class="level-3">1.3.1 Controle de qualidade</div>
                <div class="level-3">1.3.2 Relatórios de progresso</div>
                <div class="level-3">1.3.3 Indicadores de desempenho</div>
                
                <div class="level-1">2. SERVIÇOS DE MANUTENÇÃO</div>
                <div class="level-2">2.1 Manutenção Preventiva</div>
                <div class="level-3">2.1.1 Inspeções mensais</div>
                <div class="level-3">2.1.2 Substituição programada</div>
                <div class="level-3">2.1.3 Ajustes e calibrações</div>
                <div class="level-2">2.2 Manutenção Corretiva</div>
                <div class="level-3">2.2.1 Diagnóstico de falhas</div>
                <div class="level-3">2.2.2 Reparo emergencial</div>
                <div class="level-3">2.2.3 Substituição de componentes</div>
                <div class="level-2">2.3 Manutenção Preditiva</div>
                <div class="level-3">2.3.1 Análise de vibração</div>
                <div class="level-3">2.3.2 Termografia</div>
                <div class="level-3">2.3.3 Análise de óleo</div>
                
                <div class="level-1">3. FORNECIMENTO DE MATERIAIS</div>
                <div class="level-2">3.1 Peças de Reposição</div>
                <div class="level-3">3.1.1 Filtros</div>
                <div class="level-3">3.1.2 Correias</div>
                <div class="level-3">3.1.3 Fluidos</div>
                <div class="level-2">3.2 Consumíveis</div>
                <div class="level-3">3.2.1 Óleos lubrificantes</div>
                <div class="level-3">3.2.2 Graxas</div>
                <div class="level-3">3.2.3 Produtos químicos</div>
                
                <div class="level-1">4. DOCUMENTAÇÃO E RELATÓRIOS</div>
                <div class="level-2">4.1 Documentação Técnica</div>
                <div class="level-3">4.1.1 Manuais de operação</div>
                <div class="level-3">4.1.2 Procedimentos de manutenção</div>
                <div class="level-3">4.1.3 Desenhos e diagramas</div>
                <div class="level-2">4.2 Relatórios</div>
                <div class="level-3">4.2.1 Relatórios mensais</div>
                <div class="level-3">4.2.2 Relatórios de ocorrência</div>
                <div class="level-3">4.2.3 Análises técnicas</div>
            </div>
            
            <h2>3. ESCOPO DOS SERVIÇOS</h2>
            <div class="spec-box">
                <h3>3.1 SERVIÇOS INCLUSOS</h3>
                <ul>
        """
        
        for service in services:
            html_content += f"<li>{service}</li>"
        
        html_content += """
                </ul>
                
                <h3>3.2 SERVIÇOS NÃO INCLUSOS</h3>
                <ul>
                    <li>Obras civis de adequação</li>
                    <li>Instalações elétricas prediais</li>
                    <li>Fornecimento de combustível</li>
                    <li>Operação do equipamento</li>
                    <li>Seguros e licenças</li>
                </ul>
            </div>
            
            <h2>4. NORMAS E REGULAMENTAÇÕES</h2>
            <table>
                <tr>
                    <th>NORMA</th>
                    <th>DESCRIÇÃO</th>
                    <th>APLICAÇÃO</th>
                </tr>
                <tr>
                    <td>NBR 5410</td>
                    <td>Instalações elétricas de baixa tensão</td>
                    <td>Instalação elétrica</td>
                </tr>
                <tr>
                    <td>NBR 14039</td>
                    <td>Instalações elétricas de média tensão</td>
                    <td>Conexão à rede</td>
                </tr>
                <tr>
                    <td>NR-10</td>
                    <td>Segurança em instalações elétricas</td>
                    <td>Procedimentos de segurança</td>
                </tr>
                <tr>
                    <td>NR-12</td>
                    <td>Segurança em máquinas</td>
                    <td>Proteções mecânicas</td>
                </tr>
                <tr>
                    <td>ISO 8528</td>
                    <td>Grupos geradores de corrente alternada</td>
                    <td>Especificações técnicas</td>
                </tr>
                <tr>
                    <td>ISO 3046</td>
                    <td>Motores de combustão interna</td>
                    <td>Performance do motor</td>
                </tr>
            </table>
            
            <h2>5. REQUISITOS DE SEGURANÇA</h2>
            <div class="spec-box">
                <h3>5.1 EPIs OBRIGATÓRIOS</h3>
                <ul>
                    <li>Capacete de segurança</li>
                    <li>Óculos de proteção</li>
                    <li>Protetor auricular</li>
                    <li>Luvas de proteção</li>
                    <li>Calçado de segurança</li>
                    <li>Uniforme com identificação</li>
                </ul>
                
                <h3>5.2 PROCEDIMENTOS DE SEGURANÇA</h3>
                <ul>
                    <li>Análise Preliminar de Risco (APR)</li>
                    <li>Permissão de Trabalho (PT)</li>
                    <li>Bloqueio e etiquetagem (LOTO)</li>
                    <li>Trabalho em espaço confinado (quando aplicável)</li>
                    <li>Trabalho em altura (quando aplicável)</li>
                </ul>
            </div>
            
            <h2>6. CRITÉRIOS DE ACEITAÇÃO</h2>
            <table>
                <tr>
                    <th>ITEM</th>
                    <th>CRITÉRIO</th>
                    <th>MÉTODO DE VERIFICAÇÃO</th>
                </tr>
                <tr>
                    <td>Disponibilidade</td>
                    <td>Mínimo 98%</td>
                    <td>Relatório mensal de disponibilidade</td>
                </tr>
                <tr>
                    <td>Tempo de Resposta</td>
                    <td>Máximo 4 horas</td>
                    <td>Registro de chamados</td>
                </tr>
                <tr>
                    <td>MTBF</td>
                    <td>Mínimo 500 horas</td>
                    <td>Análise de falhas</td>
                </tr>
                <tr>
                    <td>MTTR</td>
                    <td>Máximo 4 horas</td>
                    <td>Registro de manutenções</td>
                </tr>
                <tr>
                    <td>Conformidade</td>
                    <td>100% com normas</td>
                    <td>Auditoria técnica</td>
                </tr>
            </table>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><small>Documento gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}</small></p>
                <p><small>Agente: Documentação Técnica e EAP v1.0</small></p>
            </div>
        </body>
        </html>
        """
        
        return html_content

class IntegratedSchedulesAgent:
    """Agente especializado em cronogramas integrados"""
    
    def generate(self, contract_data: Dict[str, Any]) -> str:
        """Gera cronogramas físico-financeiro, compras e desembolso"""
        client_name = contract_data.get('client_name', 'Cliente')
        value = contract_data.get('value', 0)
        start_date = datetime.fromisoformat(contract_data.get('start_date', datetime.now().isoformat()))
        
        monthly_value = value / 12
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 20px; }}
                h1 {{ color: #8e44ad; border-bottom: 2px solid #9b59b6; padding-bottom: 10px; }}
                h2 {{ color: #2c3e50; margin-top: 30px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #8e44ad; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ecf0f1; }}
                .highlight {{ background-color: #f39c12; color: white; padding: 2px 5px; border-radius: 3px; }}
                .progress-bar {{ width: 100%; background-color: #ecf0f1; border-radius: 5px; overflow: hidden; }}
                .progress-fill {{ background-color: #3498db; height: 20px; text-align: center; color: white; }}
                .financial-summary {{ background-color: #e8f6f3; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>CRONOGRAMAS INTEGRADOS</h1>
            
            <div class="financial-summary">
                <h3>RESUMO FINANCEIRO</h3>
                <p><strong>Valor Total do Contrato:</strong> R$ {value:,.2f}</p>
                <p><strong>Valor Mensal:</strong> R$ {monthly_value:,.2f}</p>
                <p><strong>Período:</strong> 12 meses</p>
                <p><strong>Início:</strong> {start_date.strftime('%d/%m/%Y')}</p>
            </div>
            
            <h2>1. CRONOGRAMA FÍSICO-FINANCEIRO</h2>
            <table>
                <tr>
                    <th>MÊS</th>
                    <th>PERÍODO</th>
                    <th>ATIVIDADES</th>
                    <th>% FÍSICO</th>
                    <th>% ACUM.</th>
                    <th>VALOR MENSAL</th>
                    <th>VALOR ACUMULADO</th>
                </tr>
        """
        
        activities = [
            "Mobilização e planejamento inicial",
            "Execução de manutenção preventiva mensal",
            "Manutenção preventiva + Inspeção trimestral",
            "Execução de manutenção preventiva mensal",
            "Execução de manutenção preventiva mensal",
            "Manutenção preventiva + Revisão semestral",
            "Execução de manutenção preventiva mensal",
            "Execução de manutenção preventiva mensal",
            "Manutenção preventiva + Inspeção trimestral",
            "Execução de manutenção preventiva mensal",
            "Execução de manutenção preventiva mensal",
            "Manutenção preventiva + Relatório anual"
        ]
        
        for i in range(12):
            month_date = start_date + timedelta(days=30*i)
            physical_percent = ((i + 1) / 12) * 100
            accumulated_value = monthly_value * (i + 1)
            
            html_content += f"""
                <tr>
                    <td>Mês {i+1}</td>
                    <td>{month_date.strftime('%m/%Y')}</td>
                    <td>{activities[i]}</td>
                    <td>{(100/12):.1f}%</td>
                    <td>{physical_percent:.1f}%</td>
                    <td>R$ {monthly_value:,.2f}</td>
                    <td>R$ {accumulated_value:,.2f}</td>
                </tr>
            """
        
        html_content += """
            </table>
            
            <h2>2. CRONOGRAMA DE COMPRAS E AQUISIÇÕES</h2>
            <table>
                <tr>
                    <th>TRIMESTRE</th>
                    <th>ITEM</th>
                    <th>QUANTIDADE</th>
                    <th>VALOR UNITÁRIO</th>
                    <th>VALOR TOTAL</th>
                    <th>FORNECEDOR</th>
                </tr>
                <tr>
                    <td rowspan="4">1º Trimestre</td>
                    <td>Filtro de óleo</td>
                    <td>3</td>
                    <td>R$ 85,00</td>
                    <td>R$ 255,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Filtro de combustível</td>
                    <td>3</td>
                    <td>R$ 120,00</td>
                    <td>R$ 360,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Óleo lubrificante (20L)</td>
                    <td>2</td>
                    <td>R$ 450,00</td>
                    <td>R$ 900,00</td>
                    <td>Fornecedor B</td>
                </tr>
                <tr>
                    <td>Kit de mangueiras</td>
                    <td>1</td>
                    <td>R$ 380,00</td>
                    <td>R$ 380,00</td>
                    <td>Fornecedor C</td>
                </tr>
                <tr>
                    <td rowspan="4">2º Trimestre</td>
                    <td>Filtro de óleo</td>
                    <td>3</td>
                    <td>R$ 85,00</td>
                    <td>R$ 255,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Filtro de ar</td>
                    <td>2</td>
                    <td>R$ 150,00</td>
                    <td>R$ 300,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Correia</td>
                    <td>2</td>
                    <td>R$ 95,00</td>
                    <td>R$ 190,00</td>
                    <td>Fornecedor D</td>
                </tr>
                <tr>
                    <td>Aditivo radiador</td>
                    <td>10</td>
                    <td>R$ 25,00</td>
                    <td>R$ 250,00</td>
                    <td>Fornecedor B</td>
                </tr>
                <tr>
                    <td rowspan="4">3º Trimestre</td>
                    <td>Filtro de óleo</td>
                    <td>3</td>
                    <td>R$ 85,00</td>
                    <td>R$ 255,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Filtro de combustível</td>
                    <td>3</td>
                    <td>R$ 120,00</td>
                    <td>R$ 360,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Bateria 150Ah</td>
                    <td>2</td>
                    <td>R$ 650,00</td>
                    <td>R$ 1.300,00</td>
                    <td>Fornecedor E</td>
                </tr>
                <tr>
                    <td>Sensor temperatura</td>
                    <td>1</td>
                    <td>R$ 280,00</td>
                    <td>R$ 280,00</td>
                    <td>Fornecedor F</td>
                </tr>
                <tr>
                    <td rowspan="4">4º Trimestre</td>
                    <td>Kit revisão anual</td>
                    <td>1</td>
                    <td>R$ 2.500,00</td>
                    <td>R$ 2.500,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Óleo lubrificante (20L)</td>
                    <td>3</td>
                    <td>R$ 450,00</td>
                    <td>R$ 1.350,00</td>
                    <td>Fornecedor B</td>
                </tr>
                <tr>
                    <td>Filtros diversos</td>
                    <td>6</td>
                    <td>R$ 100,00</td>
                    <td>R$ 600,00</td>
                    <td>Fornecedor A</td>
                </tr>
                <tr>
                    <td>Peças de contingência</td>
                    <td>1</td>
                    <td>R$ 1.500,00</td>
                    <td>R$ 1.500,00</td>
                    <td>Diversos</td>
                </tr>
            </table>
            
            <h2>3. CRONOGRAMA DE DESEMBOLSO</h2>
            <table>
                <tr>
                    <th>MÊS</th>
                    <th>TIPO</th>
                    <th>MÃO DE OBRA</th>
                    <th>MATERIAIS</th>
                    <th>ADMINISTRAÇÃO</th>
                    <th>TOTAL MENSAL</th>
                    <th>% DO CONTRATO</th>
                </tr>
        """
        
        for i in range(12):
            month = i + 1
            labor = monthly_value * 0.6
            materials = monthly_value * 0.25
            admin = monthly_value * 0.15
            total = labor + materials + admin
            percent = (total / value) * 100
            
            html_content += f"""
                <tr>
                    <td>Mês {month}</td>
                    <td>{'Ordinário' if month not in [3,6,9,12] else 'Trimestral'}</td>
                    <td>R$ {labor:,.2f}</td>
                    <td>R$ {materials:,.2f}</td>
                    <td>R$ {admin:,.2f}</td>
                    <td>R$ {total:,.2f}</td>
                    <td>{percent:.1f}%</td>
                </tr>
            """
        
        html_content += f"""
            </table>
            
            <h2>4. CURVA S - AVANÇO FÍSICO-FINANCEIRO</h2>
            <div class="financial-summary">
                <p>A curva S representa o avanço acumulado do projeto ao longo do tempo:</p>
                <ul>
                    <li>Mês 1-3: 25% do valor total (Fase inicial)</li>
                    <li>Mês 4-6: 50% do valor total (Fase de execução)</li>
                    <li>Mês 7-9: 75% do valor total (Fase de consolidação)</li>
                    <li>Mês 10-12: 100% do valor total (Fase de conclusão)</li>
                </ul>
            </div>
            
            <h2>5. MARCOS CONTRATUAIS</h2>
            <table>
                <tr>
                    <th>MARCO</th>
                    <th>DATA</th>
                    <th>ENTREGÁVEL</th>
                    <th>VALOR ASSOCIADO</th>
                </tr>
                <tr>
                    <td>Início do Contrato</td>
                    <td>{start_date.strftime('%d/%m/%Y')}</td>
                    <td>Mobilização completa</td>
                    <td>R$ {monthly_value:,.2f}</td>
                </tr>
                <tr>
                    <td>1º Trimestre</td>
                    <td>{(start_date + timedelta(days=90)).strftime('%d/%m/%Y')}</td>
                    <td>Relatório trimestral</td>
                    <td>R$ {(monthly_value * 3):,.2f}</td>
                </tr>
                <tr>
                    <td>1º Semestre</td>
                    <td>{(start_date + timedelta(days=180)).strftime('%d/%m/%Y')}</td>
                    <td>Revisão semestral completa</td>
                    <td>R$ {(monthly_value * 6):,.2f}</td>
                </tr>
                <tr>
                    <td>3º Trimestre</td>
                    <td>{(start_date + timedelta(days=270)).strftime('%d/%m/%Y')}</td>
                    <td>Relatório de performance</td>
                    <td>R$ {(monthly_value * 9):,.2f}</td>
                </tr>
                <tr>
                    <td>Encerramento</td>
                    <td>{(start_date + timedelta(days=365)).strftime('%d/%m/%Y')}</td>
                    <td>Relatório final e as-built</td>
                    <td>R$ {value:,.2f}</td>
                </tr>
            </table>
            
            <h2>6. GESTÃO DE RISCOS FINANCEIROS</h2>
            <div class="financial-summary">
                <h3>PROVISÕES E CONTINGÊNCIAS</h3>
                <ul>
                    <li><strong>Provisão para emergências:</strong> 5% do valor mensal</li>
                    <li><strong>Fundo para peças críticas:</strong> R$ 5.000,00 (trimestral)</li>
                    <li><strong>Seguro de responsabilidade:</strong> Incluído no valor do contrato</li>
                    <li><strong>Reajuste contratual:</strong> IGPM anual</li>
                </ul>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><small>Documento gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}</small></p>
                <p><small>Agente: Cronogramas Integrados v1.0</small></p>
            </div>
        </body>
        </html>
        """
        
        return html_content

class ReportsAnalysisAgent:
    """Agente especializado em relatórios e análises"""
    
    def generate(self, contract_data: Dict[str, Any]) -> str:
        """Gera relatórios de análise e progresso"""
        client_name = contract_data.get('client_name', 'Cliente')
        contract_number = contract_data.get('contract_number', 'N/A')
        equipment = contract_data.get('equipment', {})
        value = contract_data.get('value', 0)
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 20px; }}
                h1 {{ color: #e67e22; border-bottom: 2px solid #f39c12; padding-bottom: 10px; }}
                h2 {{ color: #2c3e50; margin-top: 30px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #e67e22; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ecf0f1; }}
                .metric-card {{ background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }}
                .metric-value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
                .metric-label {{ color: #7f8c8d; margin-top: 5px; }}
                .status-ok {{ color: #27ae60; font-weight: bold; }}
                .status-warning {{ color: #f39c12; font-weight: bold; }}
                .status-critical {{ color: #e74c3c; font-weight: bold; }}
                .chart-container {{ background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>RELATÓRIO DE ANÁLISE E PROGRESSO</h1>
            
            <div class="metric-card">
                <h3>INFORMAÇÕES GERAIS</h3>
                <p><strong>Contrato:</strong> {contract_number}</p>
                <p><strong>Cliente:</strong> {client_name}</p>
                <p><strong>Equipamento:</strong> {equipment.get('type', 'Gerador')}</p>
                <p><strong>Período de Análise:</strong> {datetime.now().strftime('%B %Y')}</p>
                <p><strong>Data do Relatório:</strong> {datetime.now().strftime('%d/%m/%Y')}</p>
            </div>
            
            <h2>1. INDICADORES DE DESEMPENHO (KPIs)</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div class="metric-card">
                    <div class="metric-value">99.8%</div>
                    <div class="metric-label">DISPONIBILIDADE</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">720h</div>
                    <div class="metric-label">MTBF</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">2h</div>
                    <div class="metric-label">MTTR</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">98.5%</div>
                    <div class="metric-label">EFICIÊNCIA</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">12</div>
                    <div class="metric-label">MANUTENÇÕES REALIZADAS</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">0</div>
                    <div class="metric-label">FALHAS CRÍTICAS</div>
                </div>
            </div>
            
            <h2>2. ANÁLISE DE MANUTENÇÕES</h2>
            <table>
                <tr>
                    <th>TIPO</th>
                    <th>PLANEJADAS</th>
                    <th>REALIZADAS</th>
                    <th>CONFORMIDADE</th>
                    <th>STATUS</th>
                </tr>
                <tr>
                    <td>Preventivas</td>
                    <td>12</td>
                    <td>12</td>
                    <td>100%</td>
                    <td class="status-ok">✓ CONFORME</td>
                </tr>
                <tr>
                    <td>Corretivas</td>
                    <td>N/A</td>
                    <td>2</td>
                    <td>-</td>
                    <td class="status-ok">✓ RESOLVIDAS</td>
                </tr>
                <tr>
                    <td>Preditivas</td>
                    <td>4</td>
                    <td>4</td>
                    <td>100%</td>
                    <td class="status-ok">✓ CONFORME</td>
                </tr>
                <tr>
                    <td>Emergenciais</td>
                    <td>0</td>
                    <td>0</td>
                    <td>-</td>
                    <td class="status-ok">✓ SEM OCORRÊNCIAS</td>
                </tr>
            </table>
            
            <h2>3. ANÁLISE DE FALHAS E OCORRÊNCIAS</h2>
            <table>
                <tr>
                    <th>DATA</th>
                    <th>TIPO</th>
                    <th>DESCRIÇÃO</th>
                    <th>TEMPO PARADA</th>
                    <th>AÇÃO TOMADA</th>
                    <th>STATUS</th>
                </tr>
                <tr>
                    <td>05/01/2025</td>
                    <td>Preventiva</td>
                    <td>Troca de filtros</td>
                    <td>0h</td>
                    <td>Substituição programada</td>
                    <td class="status-ok">Concluído</td>
                </tr>
                <tr>
                    <td>12/01/2025</td>
                    <td>Corretiva</td>
                    <td>Vazamento de óleo</td>
                    <td>2h</td>
                    <td>Reparo de vedação</td>
                    <td class="status-ok">Resolvido</td>
                </tr>
                <tr>
                    <td>20/01/2025</td>
                    <td>Preventiva</td>
                    <td>Inspeção geral</td>
                    <td>0h</td>
                    <td>Verificação completa</td>
                    <td class="status-ok">Concluído</td>
                </tr>
            </table>
            
            <h2>4. CONSUMO E CUSTOS</h2>
            <table>
                <tr>
                    <th>CATEGORIA</th>
                    <th>PREVISTO</th>
                    <th>REALIZADO</th>
                    <th>VARIAÇÃO</th>
                    <th>ANÁLISE</th>
                </tr>
                <tr>
                    <td>Mão de Obra</td>
                    <td>R$ 3.000,00</td>
                    <td>R$ 2.850,00</td>
                    <td>-5%</td>
                    <td class="status-ok">Dentro do orçamento</td>
                </tr>
                <tr>
                    <td>Peças e Materiais</td>
                    <td>R$ 1.500,00</td>
                    <td>R$ 1.620,00</td>
                    <td>+8%</td>
                    <td class="status-warning">Leve aumento</td>
                </tr>
                <tr>
                    <td>Combustível (teste)</td>
                    <td>R$ 200,00</td>
                    <td>R$ 180,00</td>
                    <td>-10%</td>
                    <td class="status-ok">Economia</td>
                </tr>
                <tr>
                    <td>Administrativo</td>
                    <td>R$ 500,00</td>
                    <td>R$ 500,00</td>
                    <td>0%</td>
                    <td class="status-ok">Conforme previsto</td>
                </tr>
            </table>
            
            <h2>5. ANÁLISE DE TENDÊNCIAS</h2>
            <div class="chart-container">
                <h3>DISPONIBILIDADE MENSAL</h3>
                <table>
                    <tr>
                        <th>MÊS</th>
                        <th>JAN</th>
                        <th>FEV</th>
                        <th>MAR</th>
                        <th>ABR</th>
                        <th>MAI</th>
                        <th>JUN</th>
                    </tr>
                    <tr>
                        <td>Disponibilidade (%)</td>
                        <td>99.8</td>
                        <td>99.5</td>
                        <td>100</td>
                        <td>99.7</td>
                        <td>99.9</td>
                        <td>100</td>
                    </tr>
                    <tr>
                        <td>Horas Operação</td>
                        <td>718</td>
                        <td>716</td>
                        <td>720</td>
                        <td>718</td>
                        <td>719</td>
                        <td>720</td>
                    </tr>
                </table>
            </div>
            
            <h2>6. RECOMENDAÇÕES E AÇÕES</h2>
            <div class="metric-card">
                <h3>AÇÕES IMEDIATAS</h3>
                <ul>
                    <li>✓ Manter cronograma de manutenção preventiva</li>
                    <li>✓ Verificar estoque de peças críticas</li>
                    <li>✓ Atualizar procedimentos de operação</li>
                </ul>
                
                <h3>MELHORIAS SUGERIDAS</h3>
                <ul>
                    <li>Implementar monitoramento remoto</li>
                    <li>Treinar operadores em diagnóstico básico</li>
                    <li>Otimizar rota de inspeção</li>
                    <li>Digitalizar registros de manutenção</li>
                </ul>
                
                <h3>PONTOS DE ATENÇÃO</h3>
                <ul>
                    <li>Programar overhaul para próximo semestre</li>
                    <li>Verificar vida útil das baterias</li>
                    <li>Avaliar necessidade de upgrade do sistema de controle</li>
                </ul>
            </div>
            
            <h2>7. COMPARATIVO ANUAL</h2>
            <table>
                <tr>
                    <th>INDICADOR</th>
                    <th>ANO ANTERIOR</th>
                    <th>ANO ATUAL</th>
                    <th>VARIAÇÃO</th>
                    <th>META</th>
                </tr>
                <tr>
                    <td>Disponibilidade Média</td>
                    <td>98.5%</td>
                    <td>99.8%</td>
                    <td class="status-ok">+1.3%</td>
                    <td>99%</td>
                </tr>
                <tr>
                    <td>Número de Falhas</td>
                    <td>8</td>
                    <td>2</td>
                    <td class="status-ok">-75%</td>
                    <td>< 5</td>
                </tr>
                <tr>
                    <td>Custo Manutenção</td>
                    <td>R$ 65.000</td>
                    <td>R$ 58.000</td>
                    <td class="status-ok">-10.8%</td>
                    <td>R$ 60.000</td>
                </tr>
                <tr>
                    <td>Satisfação Cliente</td>
                    <td>4.2/5</td>
                    <td>4.8/5</td>
                    <td class="status-ok">+14%</td>
                    <td>4.5/5</td>
                </tr>
            </table>
            
            <h2>8. CONCLUSÃO</h2>
            <div class="metric-card">
                <p>O equipamento apresenta excelente desempenho operacional com disponibilidade de 99.8%, superando a meta contratual de 98%. Todas as manutenções preventivas foram realizadas conforme cronograma, resultando em apenas 2 intervenções corretivas no período.</p>
                
                <p><strong>Classificação Geral:</strong> <span class="status-ok">EXCELENTE</span></p>
                
                <p><strong>Próximas Ações:</strong></p>
                <ul>
                    <li>Continuar com o plano de manutenção atual</li>
                    <li>Monitorar indicadores de performance</li>
                    <li>Preparar relatório trimestral detalhado</li>
                </ul>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><small>Documento gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}</small></p>
                <p><small>Agente: Relatórios e Análises v1.0</small></p>
            </div>
        </body>
        </html>
        """
        
        return html_content

# Factory para criar agentes
class DocumentGeneratorFactory:
    @staticmethod
    def create_agent(agent_type: str):
        agents = {
            'manutencao': MaintenancePlanAgent(),
            'documentacao': TechnicalDocumentationAgent(),
            'cronogramas': IntegratedSchedulesAgent(),
            'relatorios': ReportsAnalysisAgent()
        }
        return agents.get(agent_type)
    
    @staticmethod
    def generate_document(agent_type: str, contract_data: Dict[str, Any]) -> Optional[ContractDocument]:
        agent = DocumentGeneratorFactory.create_agent(agent_type)
        if not agent:
            return None
        
        content = agent.generate(contract_data)
        
        return ContractDocument(
            contract_id=contract_data.get('id', ''),
            agent_type=agent_type,
            content=content,
            metadata={
                'generated_at': datetime.now().isoformat(),
                'contract_number': contract_data.get('contract_number', ''),
                'client_name': contract_data.get('client_name', '')
            }
        )