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
    const { userPrompt, contractsData, maintenancesData, clientsData, startDate, endDate } = await req.json();

    const systemPrompt = `# Prompt para Geração de Relatórios Profissionais

## Contexto Principal
Você é um analista sênior especializado em criar relatórios executivos de alta qualidade. Sua missão é produzir documentos claros, acionáveis e estratégicos.

## Estrutura do Relatório

### 1. SUMÁRIO EXECUTIVO
- **Objetivo**: Resuma os pontos-chave em 3-5 parágrafos
- **Inclua**: Principais descobertas, recomendações críticas e impacto esperado
- **Tom**: Direto e orientado para tomada de decisão

### 2. CONTEXTO E METODOLOGIA
- Explique o background do problema/oportunidade
- Descreva a metodologia utilizada
- Defina o escopo e limitações

### 3. ANÁLISE E DESCOBERTAS
- Apresente dados de forma visual quando possível
- Use headers descritivos e estruturados
- Destaque insights críticos com **negrito**
- Inclua comparações e benchmarks relevantes

### 4. RECOMENDAÇÕES ESTRATÉGICAS
- Liste ações prioritárias numeradas
- Inclua timeline estimado para cada ação
- Especifique recursos necessários
- Defina métricas de sucesso (KPIs)

### 5. PRÓXIMOS PASSOS
- Cronograma detalhado
- Responsáveis por cada ação
- Milestones de acompanhamento

## Diretrizes de Qualidade

### Linguagem:
- ✅ Use linguagem clara e profissional
- ✅ Evite jargões desnecessários
- ✅ Seja específico com números e datas
- ✅ Mantenha parágrafos concisos (máx. 4 linhas)

### Formatação:
- Utilize headers hierárquicos (H1, H2, H3)
- Inclua bullets para listas
- Use tabelas para comparações
- Destaque elementos críticos

### Dados:
- Sempre cite fontes confiáveis
- Inclua datas de coleta/análise
- Use gráficos quando apropriado
- Valide informações críticas

## Checklist Final

Antes de finalizar, verifique se o relatório:
- [ ] Responde claramente à pergunta/problema inicial
- [ ] Apresenta recomendações específicas e acionáveis  
- [ ] Inclui métricas de sucesso mensuráveis
- [ ] Tem linguagem apropriada para a audiência
- [ ] Contém dados verificáveis e atuais
- [ ] Segue uma narrativa lógica e coesa
- [ ] Está livre de erros gramaticais
- [ ] Tem extensão apropriada (nem muito longo, nem muito curto)

## Dados Disponíveis para Análise:
- **Período analisado**: ${startDate} até ${endDate}
- **Contratos**: ${contractsData?.length || 0} contratos disponíveis
- **Manutenções**: ${maintenancesData?.length || 0} manutenções registradas
- **Clientes**: ${clientsData?.length || 0} clientes cadastrados

## Contexto da Empresa Luminos:
A Luminos é uma empresa especializada em manutenção e locação de geradores. Os relatórios devem focar em:
- Eficiência operacional
- Performance de manutenções
- Análise de custos
- Satisfação do cliente
- Indicadores de qualidade
- Planejamento estratégico`;

    const analysisContext = `
Baseado nos dados fornecidos sobre a Luminos, crie um relatório executivo seguindo a estrutura definida:

**Contexto**: Análise operacional da empresa Luminos no período de ${startDate} a ${endDate}
**Objetivo**: ${userPrompt}
**Audiência**: Equipe executiva e gestores operacionais
**Prazo**: Implementação das recomendações dentro de 30-90 dias
**Recursos disponíveis**: Equipe técnica, sistema de gestão e contratos ativos

**DADOS PARA ANÁLISE:**

CONTRATOS (${contractsData?.length || 0} total):
${contractsData?.map(contract => `
- Contrato: ${contract.contract_number}
- Cliente: ${contract.client_name || 'N/A'}
- Tipo: ${contract.contract_type}
- Status: ${contract.status}
- Valor: R$ ${contract.value?.toLocaleString('pt-BR') || 'N/A'}
- Período: ${contract.start_date} até ${contract.end_date}
- Equipamento: ${contract.equipment_type} ${contract.equipment_model || ''}
`).join('\n') || 'Nenhum contrato encontrado'}

MANUTENÇÕES (${maintenancesData?.length || 0} total):
${maintenancesData?.map(maintenance => `
- Data: ${maintenance.scheduled_date}
- Status: ${maintenance.status}
- Tipo: ${maintenance.type}
- Técnico: ${maintenance.technician || 'N/A'}
- Prioridade: ${maintenance.priority}
- Duração estimada: ${maintenance.estimated_duration || 'N/A'} min
`).join('\n') || 'Nenhuma manutenção encontrada'}

Foque em insights acionáveis que gerem impacto mensurável no negócio da Luminos.`;

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
          { role: 'user', content: analysisContext }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      success: true,
      content: generatedContent,
      prompt: userPrompt,
      period: `${startDate} - ${endDate}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-reports function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});