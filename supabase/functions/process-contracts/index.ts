
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';


const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const { fileContent, fileName, analysisType } = await req.json();

    console.log(`Processing contract document: ${fileName}`);
    console.log(`Analysis type: ${analysisType}`);

    if (!openaiApiKey) {
      throw new Error('OpenAI API Key não configurada');
    }

    // Limita o conteúdo para não exceder limites da API
    const maxChars = 8000;
    const truncatedContent = fileContent.length > maxChars 
      ? fileContent.substring(0, maxChars) + '...' 
      : fileContent;

    const prompt = `Analise este contrato de manutenção de geradores e extraia APENAS as informações reais presentes no documento.

INSTRUÇÕES CRÍTICAS:
- NUNCA use dados fictícios ou de exemplo
- NUNCA invente informações que não estão no texto
- Use apenas os dados que estão literalmente presentes no documento
- Para campos não encontrados, use exatamente "não informado"

TEXTO DO CONTRATO:
${truncatedContent}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "contract_info": {
    "client_name": "nome real da empresa cliente conforme documento",
    "cnpj": "CNPJ real se encontrado no documento",
    "contact_person": "pessoa de contato real mencionada",
    "email": "email real encontrado",
    "phone": "telefone real encontrado",
    "address": "endereço real completo",
    "contract_type": "tipo real do contrato",
    "contract_number": "número real do contrato se especificado",
    "start_date": "data real de início",
    "end_date": "data real de término",
    "monthly_value": "valor mensal real se especificado",
    "total_value": "valor total real se especificado"
  },
  "equipment": [
    {
      "type": "tipo real de equipamento mencionado",
      "model": "modelo real especificado",
      "location": "localização real mencionada",
      "quantity": "quantidade real especificada"
    }
  ],
  "services": {
    "preventive_maintenance": {
      "frequency": "frequência real especificada",
      "description": "descrição real dos serviços"
    },
    "corrective_maintenance": {
      "response_time": "tempo de resposta real especificado",
      "description": "descrição real dos serviços corretivos"
    }
  },
  "terms": {
    "payment_terms": "condições reais de pagamento",
    "warranty": "informações reais sobre garantia",
    "penalties": "penalidades reais especificadas"
  },
  "contacts": {
    "technical_responsible": "responsável técnico real mencionado",
    "emergency_contact": "contato de emergência real"
  },
  "summary": "resumo baseado apenas no conteúdo real do documento",
  "confidence": "alta/média/baixa baseada na qualidade dos dados extraídos"
}

REGRA ABSOLUTA: Se uma informação não estiver claramente presente no documento, use "não informado".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em análise de contratos. JAMAIS invente ou use dados de exemplo. Extraia APENAS informações que estão literalmente presentes no documento. Use "não informado" para campos não encontrados. Retorne apenas JSON válido com dados reais.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('Contract analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis,
      fileName: fileName,
      analysisType: analysisType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-contracts function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
