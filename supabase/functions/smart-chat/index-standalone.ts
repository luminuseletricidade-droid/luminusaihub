// Smart Chat Edge Function - Versão Standalone (sem dependências externas)
// Deploy manual: copie este arquivo inteiro para o Supabase Dashboard

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// ============= CORS CONFIGURATION =============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Max-Age': '86400',
};

function handleCorsPreflightRequest() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

function createJsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function createErrorResponse(error: string | Error, status: number = 500) {
  const errorMessage = error instanceof Error ? error.message : error;
  return new Response(JSON.stringify({
    error: errorMessage,
    success: false,
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
// ============= END CORS CONFIGURATION =============

const getSupabaseForRequest = (req: Request) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
};

// AI service functions with fallback - OPTIMIZED FOR SPEED
const callOpenAI = async (messages: any[], agentId: string, timeoutMs = 30000): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🤖 Trying OpenAI (30s timeout)...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.3,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'OpenAI',
      model: 'gpt-4o-mini'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ OpenAI failed:', error.message);
    throw error;
  }
};

const callGemini = async (messages: any[], agentId: string = '', timeoutMs = 45000): Promise<any> => {
  if (!geminiApiKey) {
    throw new Error('Gemini API Key não configurada');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🔮 Trying Gemini (45s timeout)...');
    const model = 'gemini-2.0-flash-exp';

    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

    let prompt = '';
    if (systemMessage) {
      prompt = systemMessage.content + '\n\n';
    }

    userMessages.forEach(msg => {
      if (msg.role === 'user') {
        prompt += `Usuário: ${msg.content}\n`;
      } else {
        prompt += `Assistente: ${msg.content}\n`;
      }
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 8000,
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Resposta inválida do Gemini');
    }

    return {
      response: content,
      provider: 'Gemini',
      model: model
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Gemini failed:', error.message);
    throw error;
  }
};

const callAIWithFallback = async (messages: any[], agentId: string): Promise<any> => {
  let lastError: any = null;

  if (!geminiApiKey && !openAIApiKey) {
    throw new Error('Nenhuma API de IA configurada. Configure a GEMINI_API_KEY.');
  }

  if (geminiApiKey) {
    try {
      const result = await callGemini(messages, agentId);
      console.log(`✅ Gemini successful: ${result.model}`);
      return result;
    } catch (error) {
      console.log('⚠️ Gemini falhou, tentando OpenAI como fallback...');
      lastError = error;
    }
  }

  if (openAIApiKey) {
    try {
      const result = await callOpenAI(messages, agentId);
      console.log(`✅ OpenAI successful (fallback): ${result.model}`);
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Todas as IAs falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
};

const cleanMarkdownOutput = (text: string): string => {
  let cleaned = text;
  cleaned = cleaned.replace(/```[a-zA-Z]*\n?/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  return cleaned;
};

const getAgentSystemPrompt = (agentId: string): string => {
  return `Você é o Assistente IA Luminos, especializado em análise de contratos e gestão de documentos para a empresa Luminos (manutenção e locação de geradores).`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const sb = getSupabaseForRequest(req);
    const requestBody = await req.json();

    const {
      message,
      agent_id = 'luminos-assistant',
      maintain_context = true
    } = requestBody;

    if (!message || typeof message !== 'string') {
      throw new Error('Mensagem é obrigatória e deve ser uma string');
    }

    const sanitizedMessage = message.slice(0, 10000).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const allowedAgents = ['luminos-assistant', 'gpt-4o-mini', 'maintenance-expert', 'contract-analyzer'];
    const validatedAgentId = allowedAgents.includes(agent_id) ? agent_id : 'luminos-assistant';

    console.log('Smart chat request:', { agent_id, maintainContext: maintain_context });

    if (!openAIApiKey && !geminiApiKey) {
      throw new Error('Nenhuma API de IA configurada. Configure OpenAI ou Gemini API Key.');
    }

    console.log('🚀 Fast path: No files, direct AI processing...');

    const messages = [
      { role: 'system', content: getAgentSystemPrompt(validatedAgentId) },
      { role: 'user', content: sanitizedMessage }
    ];

    const aiResult = await callAIWithFallback(messages, validatedAgentId);
    const cleanedResponse = cleanMarkdownOutput(aiResult.response);

    console.log(`✅ Fast path completed with ${aiResult.provider} (${aiResult.model})`);

    return createJsonResponse({
      response: cleanedResponse,
      agent_used: validatedAgentId,
      ai_provider: aiResult.provider,
      ai_model: aiResult.model,
      files_processed: 0,
      context_maintained: maintain_context,
      processing_method: 'fast_path'
    });

  } catch (error) {
    console.error('Error in smart-chat function:', error);
    return createErrorResponse(error.message || 'Erro desconhecido', 500);
  }
});
