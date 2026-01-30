
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
    // Get request body
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    if (!requestBody) {
      throw new Error('Request body is empty');
    }
    
    const { contractData, analysisType } = JSON.parse(requestBody);
    
    console.log('Generating maintenance plan for contract:', contractData.id);
    console.log('Analysis type:', analysisType);

    let systemPrompt = '';
    let userPrompt = '';

    if (analysisType === 'technical_analysis') {
      systemPrompt = `Você é um especialista em manutenção de geradores e equipamentos industriais da empresa Luminos. 
      Sua função é criar um memorial descritivo técnico detalhado para planos de manutenção.
      
      Diretrizes:
      - Seja técnico e específico
      - Inclua procedimentos de segurança
      - Detalhe os componentes a serem verificados
      - Especifique ferramentas e materiais necessários
      - Considere normas técnicas brasileiras
      - Formate em seções organizadas`;

      userPrompt = `Crie um memorial descritivo técnico para manutenção baseado nos seguintes dados do contrato:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Tipo de Contrato: ${contractData.contract_type}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Valor Total: R$ ${contractData.total_value?.toLocaleString('pt-BR') || 'N/A'}
- Equipamentos: ${contractData.equipment_details || 'Geradores de energia'}

Gere um memorial descritivo completo incluindo:
1. Objetivo da Manutenção
2. Escopo dos Serviços
3. Procedimentos Técnicos Detalhados
4. Normas e Regulamentações Aplicáveis
5. Materiais e Ferramentas Necessários
6. Procedimentos de Segurança
7. Critérios de Aceitação
8. Responsabilidades

O documento deve ser profissional e adequado para contratos industriais.`;

    } else if (analysisType === 'operational_calendar') {
      systemPrompt = `Você é um especialista em planejamento operacional da empresa Luminos.
      Sua função é criar calendários operacionais detalhados para manutenções de geradores.
      
      Diretrizes:
      - Distribua as manutenções uniformemente ao longo do período
      - Considere diferentes tipos de manutenção (preventiva, preditiva, corretiva)
      - Inclua datas específicas e horários sugeridos
      - Considere feriados e fins de semana
      - Organize por prioridade e complexidade`;

      userPrompt = `Crie um calendário operacional detalhado baseado nos seguintes dados:

Dados do Contrato:
- Cliente: ${contractData.client_name}
- Tipo: ${contractData.contract_type}
- Período: ${contractData.start_date} até ${contractData.end_date}
- Duração: ${contractData.duration_months || 'N/A'} meses

Gere um calendário que inclua:
1. Cronograma de Manutenções Preventivas (mensais/trimestrais)
2. Inspeções Preditivas (períodos recomendados)
3. Datas específicas com horários sugeridos
4. Tipo de manutenção para cada data
5. Tempo estimado para cada atividade
6. Recursos necessários por atividade
7. Pontos críticos de verificação
8. Plano de contingência

Organize o calendário mês a mês com datas específicas e justificativas técnicas.`;
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
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedContent = data.choices[0].message.content;
    
    console.log('Successfully generated maintenance plan');

    return new Response(JSON.stringify({ 
      success: true,
      content: generatedContent,
      type: analysisType,
      contractId: contractData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-maintenance-plan function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
