import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { GoogleAIFileManager } from "npm:@google/generative-ai/server";


const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: convert Data URL/base64 to Uint8Array
const dataUrlToUint8 = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Poll until file becomes ACTIVE in Gemini Files API
const waitForActive = async (fileManager: GoogleAIFileManager, name: string, maxMs = 60000) => {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const f = await fileManager.getFile(name);
    if ((f as any)?.file?.state === 'ACTIVE') return (f as any).file;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Timeout esperando processamento do arquivo no Gemini');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');

    const body = await req.json();
    const {
      question,
      files = [],
    } = body || {};

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'question obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: 'Envie pelo menos um arquivo em files[]' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare uploads
    const uploaded: Array<{ uri: string; mimeType: string; name: string }> = [];

    for (const f of files) {
      const mimeType: string = f.type || 'application/pdf';
      const displayName: string = f.name || 'document.pdf';

      let uint8: Uint8Array | null = null;

      if (f.storage_path) {
        // Default bucket if not provided
        const bucket = f.bucket || 'contract-documents';
        const { data: blob, error } = await supabase.storage.from(bucket).download(f.storage_path);
        if (error || !blob) throw new Error(`Falha ao baixar arquivo do Storage: ${error?.message || 'sem blob'}`);
        const buf = new Uint8Array(await blob.arrayBuffer());
        uint8 = buf;
      } else if (f.content) {
        uint8 = dataUrlToUint8(f.content);
      } else {
        throw new Error('Arquivo sem storage_path ou content');
      }

      // Upload to Gemini Files API
      const uploadResp = await fileManager.uploadFile(new Blob([uint8], { type: mimeType }), {
        mimeType,
        displayName,
      } as any);

      const fileResource = (uploadResp as any)?.file;
      if (!fileResource?.name) throw new Error('Falha no upload para Gemini Files API');

      // Wait until ACTIVE
      const active = await waitForActive(fileManager, fileResource.name);
      uploaded.push({ uri: active.uri, mimeType: mimeType, name: displayName });
    }

    // Build parts with fileData + question
    const parts: any[] = uploaded.map(u => ({ fileData: { fileUri: u.uri, mimeType: u.mimeType } }));
    parts.push({ text: question });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
    } as any);

    const text = (result as any)?.response?.text?.() || (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ success: true, answer: text, files: uploaded }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('gemini-files-ask error:', e?.message || e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
