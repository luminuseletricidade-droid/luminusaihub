// Smart Chat - Versão Debug Ultra Simplificada
// Use este código para identificar o erro

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request received');
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log('📨 Request received:', req.method, req.url);

  try {
    // Log environment variables (sem expor valores sensíveis)
    console.log('🔑 Environment check:');
    console.log('  - GEMINI_API_KEY exists:', !!Deno.env.get('GEMINI_API_KEY'));
    console.log('  - OPENAI_API_KEY exists:', !!Deno.env.get('OPENAI_API_KEY'));
    console.log('  - SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('  - SUPABASE_ANON_KEY exists:', !!Deno.env.get('SUPABASE_ANON_KEY'));

    // Parse request body
    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    const { message } = body;

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('💬 Message received:', message);

    // Resposta simples de teste
    const response = {
      response: `✅ Função funcionando! Você disse: "${message}". Esta é uma resposta de teste.`,
      agent_used: 'debug-agent',
      ai_provider: 'Debug',
      ai_model: 'debug-v1',
      timestamp: new Date().toISOString(),
      environment: {
        hasGemini: !!Deno.env.get('GEMINI_API_KEY'),
        hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
        hasSupabase: !!Deno.env.get('SUPABASE_URL')
      }
    };

    console.log('✅ Sending success response');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Error occurred:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);

    return new Response(JSON.stringify({
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
