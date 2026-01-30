
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const { contractData, scheduleType } = await req.json();
    
    console.log('Generating technical schedules for contract:', contractData.id);
    console.log('Schedule type:', scheduleType);

    let systemPrompt = '';
    let userPrompt = '';

    switch (scheduleType) {
      case 'project_structure':
        systemPrompt = `Você é um especialista em gestão de projetos e estruturas analíticas da empresa Luminos.
        Sua função é criar Estruturas Analíticas de Projeto (EAP) detalhadas para contratos de manutenção.
        
        Diretrizes:
        - Use metodologia PMBOK
        - Organize em níveis hierárquicos
        - Inclua pacotes de trabalho específicos
        - Defina deliverables mensuráveis
        - Considere recursos e dependências`;

        userPrompt = `Crie uma Estrutura Analítica de Projeto (EAP) completa baseada nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Tipo: ${contractData.contract_type}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Equipamentos: ${contractData.equipment_details || 'Geradores industriais'}

Crie uma EAP que inclua:
1. Fases principais do projeto
2. Entregas por fase
3. Pacotes de trabalho detalhados
4. Recursos necessários
5. Critérios de aceitação
6. Dependências entre atividades
7. Marcos principais
8. Estrutura de custos

Organize hierarquicamente com códigos WBS.`;
        break;

      case 'global_schedule':
        systemPrompt = `Você é um especialista em cronogramas de projeto da empresa Luminos.
        Sua função é criar cronogramas globais detalhados para projetos de manutenção.
        
        Diretrizes:
        - Use método do caminho crítico
        - Defina durações realistas
        - Considere recursos e disponibilidade
        - Inclua marcos e entregas
        - Organize por fases sequenciais`;

        userPrompt = `Crie um cronograma global detalhado baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Tipo: ${contractData.contract_type}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Duração: ${contractData.duration_months || '12'} meses

Gere um cronograma que inclua:
1. Fases principais com durações
2. Atividades críticas
3. Sequenciamento lógico
4. Marcos principais
5. Recursos alocados
6. Folgas e buffers
7. Plano de comunicação
8. Cronograma de entregas

Use formato de cronograma Gantt conceitual.`;
        break;

      case 'financial_schedule':
        systemPrompt = `Você é um especialista em gestão financeira de projetos da empresa Luminos.
        Sua função é criar cronogramas físico-financeiros para contratos de manutenção.
        
        Diretrizes:
        - Relacione progresso físico com financeiro
        - Distribua custos ao longo do tempo
        - Considere fluxo de caixa
        - Inclua indicadores de performance
        - Preveja cenários de variação`;

        userPrompt = `Crie um cronograma físico-financeiro baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Valor: R$ ${contractData.total_value?.toLocaleString('pt-BR')}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Tipo: ${contractData.contract_type}

Desenvolva um cronograma que inclua:
1. Curva S de progresso físico e financeiro
2. Distribuição mensal de custos
3. Indicadores de performance (CPI, SPI)
4. Fluxo de caixa projetado
5. Marcos de faturamento
6. Análise de valor agregado
7. Cenários de contingência
8. Relatórios de acompanhamento

Formate como cronograma executivo.`;
        break;

      case 'procurement_schedule':
        systemPrompt = `Você é um especialista em compras e suprimentos da empresa Luminos.
        Sua função é criar cronogramas de compras para projetos de manutenção.
        
        Diretrizes:
        - Identifique itens críticos
        - Considere lead times de fornecedores
        - Organize por categoria de compra
        - Inclua processos de aprovação
        - Preveja contingências de estoque`;

        userPrompt = `Crie um cronograma de compras detalhado baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Equipamentos: ${contractData.equipment_details || 'Geradores industriais'}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Tipo: ${contractData.contract_type}

Desenvolva um cronograma que inclua:
1. Lista de materiais e insumos
2. Categorização por criticidade
3. Lead times de fornecedores
4. Cronograma de solicitações
5. Processo de aprovação de compras
6. Gestão de estoque mínimo
7. Fornecedores homologados
8. Plano de contingência para atrasos

Organize por categoria e prioridade.`;
        break;

      default:
        throw new Error('Tipo de cronograma não reconhecido');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedContent = data.choices[0].message.content;
    
    console.log('Successfully generated technical schedule');

    return new Response(JSON.stringify({ 
      success: true,
      content: generatedContent,
      type: scheduleType,
      contractId: contractData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-technical-schedules function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
