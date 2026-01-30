import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';


const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

function isPdfFile(dataUrl: string): boolean {
  return typeof dataUrl === 'string' && dataUrl.includes('application/pdf');
}

function isImageFile(dataUrl: string): boolean {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/');
}

function toInlinePart(dataUrl: string) {
  const [header, b64] = dataUrl.split(',');
  const mime = header.replace('data:', '').replace(';base64', '');
  return {
    inline_data: {
      mime_type: mime,
      data: b64,
    }
  };
}

async function callGemini(parts: any[], systemPrompt: string, temperature = 0.2, maxTokens = 8000) {
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY não configurada');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          ...parts
        ]
      }
    ],
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  };

  // Retries para 429/5xx
  let delay = 800;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta vazia do Gemini');
      return text;
    }

    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 5000);
      continue;
    }

    const errTxt = await res.text();
    throw new Error(`Gemini error: ${res.status} ${res.statusText} - ${errTxt}`);
  }
  throw new Error('Gemini esgotou tentativas');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const { images, analysisType, prompt } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('Nenhum arquivo fornecido');
    }

    const hasPdf = images.some((x: string) => isPdfFile(x));

    console.log('Processing vision request:', { analysisType, imagesCount: images.length });

    const systemPrompt = (() => {
      switch (analysisType) {
        case 'document_ocr':
          return `Você é um especialista em OCR e análise de documentos da empresa Luminos. Extraia texto e dados estruturados de PDFs e imagens. Retorne JSON em pt-BR.`;
        case 'equipment_analysis':
          return `Você é especialista em análise visual de equipamentos industriais. Retorne avaliação estruturada em JSON.`;
        case 'report_analysis':
          return `Você analisa relatórios técnicos, extrai tabelas/gráficos e gera insights. Responda em JSON.`;
        default:
          return `Você analisa imagens/documentos e retorna uma análise detalhada em JSON.`;
      }
    })();

    const userPrompt = prompt || 'Realize a melhor análise possível do conteúdo fornecido.';

    const parts: any[] = [{ text: userPrompt }];
    for (const file of images) {
      if (typeof file !== 'string') continue;
      if (isPdfFile(file) || isImageFile(file)) {
        parts.push(toInlinePart(file));
      } else {
        // tentar normalizar como imagem png base64
        const normalized = file.startsWith('data:') ? file : `data:image/png;base64,${file}`;
        parts.push(toInlinePart(normalized));
      }
    }

    const analysisText = await callGemini(parts, systemPrompt, analysisType === 'document_ocr' ? 0.1 : 0.2, analysisType === 'document_ocr' ? 8000 : 4000);

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisText,
      analysisType,
      processedFiles: images.length,
      model: 'gemini-2.5-flash',
      hasPdf,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in vision-processor function:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
