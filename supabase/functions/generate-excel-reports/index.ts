
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
    const { contractData, reportType } = await req.json();
    
    console.log('Generating Excel report for contract:', contractData.id);
    console.log('Report type:', reportType);

    let systemPrompt = '';
    let userPrompt = '';

    switch (reportType) {
      case 'maintenance_schedule':
        systemPrompt = `Você é um especialista em planejamento de manutenção da empresa Luminos.
        Sua função é criar cronogramas detalhados de manutenção em formato de dados estruturados para planilhas Excel.
        
        Diretrizes:
        - Organize por equipamento e tipo de manutenção
        - Inclua datas, responsáveis e procedimentos
        - Considere criticidade e prioridades
        - Defina intervalos de manutenção adequados`;

        userPrompt = `Crie dados estruturados para uma planilha Excel de cronograma de manutenção baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Equipamentos: ${contractData.equipment_details || 'Geradores industriais'}
- Período: ${contractData.start_date} até ${contractData.end_date}

Retorne dados em formato JSON com a seguinte estrutura:
{
  "headers": ["Data", "Equipamento", "Tipo Manutenção", "Responsável", "Status", "Observações"],
  "rows": [
    ["2024-01-15", "Gerador 01", "Preventiva", "João Silva", "Agendado", "Verificar óleo"],
    // ... mais linhas
  ],
  "summary": {
    "total_maintenances": 24,
    "preventive": 18,
    "corrective": 6
  }
}`;
        break;

      case 'cost_analysis':
        systemPrompt = `Você é um especialista em análise financeira de projetos da empresa Luminos.
        Sua função é criar relatórios de análise de custos detalhados para contratos de manutenção.
        
        Diretrizes:
        - Categorize custos por tipo e centro de custo
        - Inclua análise comparativa e tendências
        - Considere variações e desvios orçamentários
        - Projete cenários futuros`;

        userPrompt = `Crie dados estruturados para uma planilha Excel de análise de custos baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Valor Total: R$ ${contractData.total_value?.toLocaleString('pt-BR')}
- Período: ${contractData.start_date} até ${contractData.end_date}

Retorne dados em formato JSON com múltiplas abas:
{
  "sheets": {
    "Resumo Executivo": {
      "headers": ["Categoria", "Orçado (R$)", "Realizado (R$)", "Variação (%)", "Status"],
      "rows": [...]
    },
    "Detalhamento Mensal": {
      "headers": ["Mês", "Mão de Obra", "Materiais", "Equipamentos", "Total"],
      "rows": [...]
    },
    "Indicadores": {
      "headers": ["Indicador", "Valor", "Meta", "Status"],
      "rows": [...]
    }
  }
}`;
        break;

      case 'performance_report':
        systemPrompt = `Você é um especialista em indicadores de performance de manutenção da empresa Luminos.
        Sua função é criar relatórios de performance operacional com KPIs e métricas relevantes.
        
        Diretrizes:
        - Inclua indicadores de disponibilidade e confiabilidade
        - Calcule MTBF, MTTR e outros indicadores
        - Analise tendências e padrões
        - Proponha ações de melhoria`;

        userPrompt = `Crie dados estruturados para uma planilha Excel de relatório de performance baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Equipamentos: ${contractData.equipment_details || 'Geradores industriais'}
- Período: ${contractData.start_date} até ${contractData.end_date}

Retorne dados em formato JSON com múltiplas abas focadas em performance:
{
  "sheets": {
    "Dashboard KPIs": {
      "headers": ["KPI", "Valor Atual", "Meta", "Variação", "Tendência"],
      "rows": [...]
    },
    "Disponibilidade": {
      "headers": ["Equipamento", "Horas Operação", "Horas Parada", "Disponibilidade %"],
      "rows": [...]
    },
    "Análise Falhas": {
      "headers": ["Data", "Equipamento", "Tipo Falha", "Tempo Reparo", "Causa Raiz"],
      "rows": [...]
    }
  }
}`;
        break;

      case 'inventory_control':
        systemPrompt = `Você é um especialista em gestão de estoque e materiais da empresa Luminos.
        Sua função é criar relatórios de controle de estoque para materiais de manutenção.
        
        Diretrizes:
        - Categorize materiais por criticidade
        - Inclua níveis de estoque e pontos de reposição
        - Analise giro de estoque e custos
        - Identifique itens obsoletos ou em excesso`;

        userPrompt = `Crie dados estruturados para uma planilha Excel de controle de estoque baseado nos dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Equipamentos: ${contractData.equipment_details || 'Geradores industriais'}

Retorne dados em formato JSON:
{
  "sheets": {
    "Estoque Atual": {
      "headers": ["Item", "Código", "Qtd Atual", "Qtd Mínima", "Valor Unit.", "Status"],
      "rows": [...]
    },
    "Movimentação": {
      "headers": ["Data", "Item", "Tipo", "Qtd", "Responsável", "Observações"],
      "rows": [...]
    },
    "Análise ABC": {
      "headers": ["Classe", "Qtd Itens", "Valor Total", "% do Estoque"],
      "rows": [...]
    }
  }
}`;
        break;

      default:
        throw new Error('Tipo de relatório não reconhecido');
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
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedContent = data.choices[0].message.content;
    
    console.log('Successfully generated Excel report data');

    return new Response(JSON.stringify({ 
      success: true,
      content: generatedContent,
      type: reportType,
      contractId: contractData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-excel-reports function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
