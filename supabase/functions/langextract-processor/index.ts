import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';


const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExtractionRequest {
  pdfBase64: string;
  extractionType: 'contract' | 'maintenance' | 'general';
  schema?: any;
  filename?: string;
}

interface ExtractionResult {
  success: boolean;
  data?: any;
  sourceGrounding?: any[];
  confidence?: number;
  error?: string;
  metadata?: {
    processingTime: number;
    pages: number;
    method: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const { pdfBase64, extractionType, schema, filename }: ExtractionRequest = await req.json();
    
    console.log(`Processing PDF extraction: ${filename || 'unnamed'}, type: ${extractionType}`);
    
    const startTime = Date.now();
    
    // Preparar schema baseado no tipo de extração
    const extractionSchema = getExtractionSchema(extractionType, schema);

    // Normalizar base64 (aceita payload puro ou data URL)
    const payloadOnly = (pdfBase64.startsWith('data:')
      ? pdfBase64.substring(pdfBase64.indexOf(',') + 1)
      : pdfBase64
    );

    let extractionResult;
    try {
      // Tentar Gemini primeiro
      extractionResult = await extractWithGemini(payloadOnly, extractionSchema, extractionType);
    } catch (geminiErr) {
      console.error('Gemini extraction failed, trying OCR fallback...', geminiErr);
      // Fallback: OCR via vision-processor
      const dataUrl = pdfBase64.startsWith('data:')
        ? pdfBase64
        : `data:application/pdf;base64,${payloadOnly}`;

      const { data: visionData, error: visionError } = await supabase.functions.invoke('vision-processor', {
        body: {
          images: [dataUrl],
          analysisType: 'document_ocr',
          prompt: 'Extraia todo o texto deste PDF com máxima fidelidade; responda em JSON {"texto_extraido": string}'
        }
      });

      if (visionError || !visionData?.success) {
        throw new Error(visionError?.message || visionData?.error || 'OCR fallback failed');
      }

      let texto = visionData.analysis;
      try {
        const parsed = JSON.parse(visionData.analysis);
        texto = parsed.texto_extraido || parsed.extracted_text || visionData.analysis;
      } catch (_) {}

      extractionResult = {
        data: { texto_extraido: texto },
        sourceGrounding: [],
        confidence: 0.6,
        pages: 1
      };
    }

    const processingTime = Date.now() - startTime;

    const result: ExtractionResult = {
      success: true,
      data: extractionResult.data,
      sourceGrounding: extractionResult.sourceGrounding,
      confidence: extractionResult.confidence,
      metadata: {
        processingTime,
        pages: extractionResult.pages || 1,
        method: 'langextract-gemini-2.5-or-ocr'
      }
    };

    console.log(`Extraction completed in ${processingTime}ms`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in langextract-processor:', error);
    
    const result: ExtractionResult = {
      success: false,
      error: error.message,
      metadata: {
        processingTime: 0,
        pages: 0,
        method: 'langextract-gemini'
      }
    };
    
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractWithGemini(pdfBase64: string, schema: any, extractionType: string) {
  const models = ['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']; // fallback interno
  const prompt = buildExtractionPrompt(extractionType, schema);

  let lastErr: any = null;
  for (const model of models) {
    // Retry com backoff para lidar com 429/5xx
    const maxRetries = 5;
    let delay = 500; // ms

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentando ${model} - tentativa ${attempt + 1}/${maxRetries + 1}`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.0,
              topK: 32,
              topP: 1,
              maxOutputTokens: 16384,
            }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          // Se 429/5xx, tenta novamente
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Retryable error (${response.status}): ${errText}`);
          }
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errText}`);
        }

        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('No content received from Gemini API');

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No valid JSON found in response');
        const extractedData = JSON.parse(jsonMatch[0]);

        return {
          data: extractedData,
          sourceGrounding: extractedData._sourceGrounding || [],
          confidence: extractedData._confidence || 0.85,
          pages: 1,
          model
        };
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 2, 5000);
          continue;
        }
      }
      break;
    }
  }
  throw lastErr || new Error('Gemini extraction failed');
}

function getExtractionSchema(extractionType: string, customSchema?: any) {
  if (customSchema) return customSchema;
  
  switch (extractionType) {
    case 'contract':
      return {
        cliente: {
          nome: "string",
          cnpj: "string",
          contato: "string",
          endereco: "string"
        },
        contrato: {
          numero: "string",
          tipo: "string",
          valor_mensal: "number",
          valor_total: "number",
          inicio: "date",
          fim: "date"
        },
        equipamentos: [{
          tipo: "string",
          modelo: "string",
          quantidade: "number",
          localizacao: "string"
        }],
        servicos: [{
          nome: "string",
          frequencia: "string",
          descricao: "string"
        }]
      };
    
    case 'maintenance':
      return {
        equipamento: "string",
        tipo_manutencao: "string",
        data_execucao: "date",
        responsavel: "string",
        observacoes: "string",
        checklist: ["string"]
      };
    
    default:
      return {
        content: "string",
        metadata: {}
      };
  }
}

function buildExtractionPrompt(extractionType: string, schema: any): string {
  const basePrompt = `
Analise este documento PDF e extraia as informações estruturadas conforme o schema fornecido.

IMPORTANTE:
1. Retorne APENAS um JSON válido seguindo exatamente o schema
2. Para cada campo extraído, inclua informações de source grounding quando possível
3. Use valores null para campos não encontrados
4. Seja preciso com datas (formato YYYY-MM-DD) e números
5. Inclua um campo _confidence (0-1) indicando a confiança na extração
6. Inclua um campo _sourceGrounding com array de objetos: {field, page, position, text}

Schema a seguir:
${JSON.stringify(schema, null, 2)}
`;

  switch (extractionType) {
    case 'contract':
      return basePrompt + `
CONTEXTO: Este é um contrato de manutenção/locação de geradores.
Foque em identificar: dados do cliente, detalhes do contrato, equipamentos envolvidos e serviços contratados.
`;
    
    case 'maintenance':
      return basePrompt + `
CONTEXTO: Este é um documento de manutenção.
Foque em: equipamentos, tipo de manutenção, datas, responsáveis e observações técnicas.
`;
    
    default:
      return basePrompt + `
CONTEXTO: Documento geral.
Extraia as informações principais conforme o schema fornecido.
`;
  }
}