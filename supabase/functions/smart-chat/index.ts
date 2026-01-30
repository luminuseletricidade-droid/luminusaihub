
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const getSupabaseForRequest = (req: Request) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
};

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const isValidUUID = (value: string) => UUID_REGEX.test(value);
// AI service functions with fallback - OPTIMIZED FOR SPEED & RESOURCES
const callOpenAI = async (messages: any[], agentId: string, timeoutMs = 12000): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🤖 Trying OpenAI (12s timeout)...');
    if (!openAIApiKey) {
      throw new Error('OpenAI API Key não configurada');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI API error: ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    return {
      response: content,
      provider: 'OpenAI',
      model: 'gpt-4o-mini'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ OpenAI failed:', error?.message);
    throw error;
  }
};

const callGemini = async (messages: any[], agentId: string = '', timeoutMs = 15000): Promise<any> => {
  if (!geminiApiKey) {
    throw new Error('Gemini API Key não configurada');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🔮 Trying Gemini (15s timeout)...');
    
    // Use gemini-2.5-pro for all agents with temperature 0.0
    const model = 'gemini-2.5-pro';
    
    // Convert messages to Gemini format
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
    
    let prompt = '';
    if (systemMessage) {
      prompt = systemMessage.content + '\n\n';
    }
    
    // Add conversation history
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
          maxOutputTokens: 16000,
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || `HTTP ${response.status}`;
      } catch {
        errorMsg = `HTTP ${response.status}`;
      }
      throw new Error(`Gemini API error: ${errorMsg}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Gemini retornou resposta inválida: ${parseError.message}`);
    }

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error(`Resposta inválida do Gemini: ${JSON.stringify(data).substring(0, 200)}`);
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

  // Garantir que pelo menos uma API esteja configurada
  if (!geminiApiKey && !openAIApiKey) {
    throw new Error('Nenhuma API de IA configurada. Configure a GEMINI_API_KEY.');
  }

  // 1) Tentar GEMINI (PRIMÁRIO)
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

  // 2) Fallback opcional para OpenAI se existir chave (apenas se realmente necessário)
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

// File processing utilities for large files
const chunkText = (text: string, chunkSize: number = 4000): string[] => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

// 🎯 ESTRATÉGIA OTIMIZADA DE LEITURA DE PDFs - PRIORIDADE VELOCIDADE
const extractTextFromBase64PDF = async (base64Content: string, sb: any): Promise<string> => {
  const startTime = Date.now();
  console.log('📄 Iniciando extração otimizada de PDF...');
  
  // Remove data URL prefix if present
  const base64Data = base64Content.replace(/^data:application\/pdf;base64,/, '');

  // === CAMADA ÚNICA: GEMINI AI DIRETO (OTIMIZADO) ===
  try {
    console.log('🎯 Tentando Gemini AI direto (otimizado)...');
    
    const result = await callGeminiDirectPdf(base64Data);
    if (result && result.length > 50) {
      const totalTime = Date.now() - startTime;
      console.log(`✅ Extração SUCESSO em ${totalTime}ms - ${result.length} chars`);
      return result;
    }
    
    console.log('⚠️ Resultado insuficiente, usando fallback simples...');
  } catch (error) {
    console.error('❌ Erro na extração, usando fallback:', error);
  }

  // === FALLBACK SIMPLES ===
  try {
    const result = await extractWithRegexFallback(base64Data);
    const totalTime = Date.now() - startTime;
    console.log(`✅ Fallback COMPLETO em ${totalTime}ms`);
    return result;
  } catch (error) {
    console.error('❌ Todas as extrações falharam:', error);
    return 'Documento PDF processado - informações podem estar limitadas devido ao formato do arquivo.';
  }
};

// Valida se o conteúdo contém HTML/tabelas esperadas
const validateHtmlContent = (content: string): boolean => {
  const hasTable = content.includes('<table>') || content.includes('<tr>') || content.includes('<td>');
  const hasCheckmarks = content.includes('✓') || content.includes('☑') || content.includes('✔');
  const hasStructure = content.includes('Contrato') || content.includes('Cliente') || content.includes('Valor');
  return hasTable || (hasCheckmarks && hasStructure);
};

// CAMADA 1: Gemini AI Direto
const callGeminiDirectPdf = async (pdfBase64: string): Promise<string> => {
  if (!geminiApiKey) throw new Error('Gemini API Key não configurada');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout - resource limited
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analise este contrato PDF e extraia TODAS as informações organizadas em tabelas HTML estruturadas. 
                     Use <table> com bordas e estilos para apresentar dados estruturados.
                     Para informações gerais, use texto normal (sem HTML).
                     NÃO truncar - extrair documento COMPLETO.
                     
                     FORMATO DE RESPOSTA OBRIGATÓRIO:
                     - Descrições e explicações: texto normal
                     - Dados estruturados: <table border="1" style="border-collapse: collapse; width: 100%;">
                     - NÃO usar <h1>, <h2>, <strong>, <em>, <div> ou outros elementos HTML
                     - APENAS texto + tabelas quando necessário`
            },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: pdfBase64
              }
            }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 16000,
          temperature: 0.0
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Falha ao parsear resposta do Gemini: ${parseError.message}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`Gemini PDF extraction retornou resposta vazia`);
    }
    return text;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// CAMADA 2: Extração Estruturada
const extractStructuredText = async (pdfBase64: string, sb: any): Promise<string> => {
  // Usar langextract-processor para extração de texto
  const { data: extractData, error: extractError } = await sb.functions.invoke('langextract-processor', {
    body: {
      pdfBase64: pdfBase64,
      extractionType: 'contract',
      filename: 'contract.pdf'
    }
  });

  if (extractError || !extractData?.success) {
    throw new Error('Falha na extração estruturada');
  }

  const extractedText = extractData.data?.content || extractData.data?.texto_extraido || '';
  
  if (!extractedText || extractedText.length < 10) {
    throw new Error('Texto extraído insuficiente');
  }

  // Processar texto extraído com Gemini para gerar HTML
  const htmlResult = await processExtractedTextToHtml(extractedText);
  return htmlResult;
};

// Converte texto extraído em HTML formatado
const processExtractedTextToHtml = async (text: string): Promise<string> => {
  const messages = [{
    role: 'user',
    content: `Transforme este texto de contrato em formato limpo com tabelas HTML para dados estruturados.
              
              REGRAS OBRIGATÓRIAS:
              - Use texto normal para descrições e explicações
              - Use APENAS <table> para apresentar dados estruturados
              - NÃO use <h1>, <h2>, <strong>, <em>, <div> ou outros elementos HTML
              - Tabelas devem ter: <table border="1" style="border-collapse: collapse; width: 100%;">
              
              Texto: ${text.substring(0, 30000)}` // Limite para evitar timeout
  }];
  
  const result = await callGemini(messages, 'contract-processor', 10000); // 10s timeout - optimized for resources
  return result?.response || text;
};

// CAMADA 3: Fallback com Regex
const extractWithRegexFallback = async (pdfBase64: string): Promise<string> => {
  // Decodificar base64 para buffer
  const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
  const pdfString = new TextDecoder('latin1').decode(pdfBuffer);
  
  // Padrões de regex para extrair informações contratuais
  const patterns = {
    contract: /contrato[^\n]{0,100}/gi,
    client: /cliente[:\s]+([^\n]{1,100})/gi,
    value: /valor[:\s]+([R$\d.,\s]+)/gi,
    date: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    cnpj: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/g,
    terms: /cláusula[^\n]{0,200}/gi,
    equipment: /gerador|equipamento|máquina[^\n]{0,100}/gi,
    maintenance: /manutenção|preventiva|corretiva[^\n]{0,100}/gi
  };
  
  let extractedInfo: string[] = [];
  
  // Extrair informações usando regex
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = pdfString.match(pattern) || [];
    if (matches.length > 0) {
      extractedInfo.push(`<h3>${key.toUpperCase()}</h3>`);
      extractedInfo.push('<ul>');
      matches.slice(0, 5).forEach(match => {
        extractedInfo.push(`<li>✓ ${match.trim()}</li>`);
      });
      extractedInfo.push('</ul>');
    }
  }
  
  // Gerar resposta em texto limpo, sem HTML
  const fallbackText = `📄 Informações Extraídas (Fallback)

Extração limitada - tentando novamente com método alternativo.

${extractedInfo.join('\n').replace(/<[^>]*>/g, '').replace(/✓/g, '•')}

Total de informações encontradas: ${extractedInfo.filter(item => item.includes('✓')).length}`;
  
  return fallbackText;
};

// Helper: converte Blob para DataURL base64
const blobToDataUrl = async (blob: Blob, mime: string): Promise<string> => {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return `data:${mime};base64,${base64}`;
};

// Helper: clean markdown formatting from text while preserving markdown tables
const cleanMarkdownOutput = (text: string): string => {
  // Preserve markdown tables and remove only formatting that interferes with display
  let cleaned = text;
  
  // Remove markdown code blocks but keep content (except for table formatting)
  cleaned = cleaned.replace(/```[a-zA-Z]*\n?/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Clean up extra whitespace but preserve table structure
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
};

// Helper: validate if HTML table was generated correctly
const validateHTMLOutput = (text: string): boolean => {
  const hasTable = text.includes('<table') && text.includes('</table>');
  const hasTableStructure = text.includes('<tr>') && text.includes('<td>');
  const hasContent = text.length > 100;
  
  return hasTable && hasTableStructure && hasContent;
};

// Helper: retry function with validation for maintenance-planner agent
const retryWithValidation = async (
  originalFunction: () => Promise<any>,
  agentId: string,
  maxRetries: number = 1
): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await originalFunction();

      // For maintenance-planner, validate HTML table generation
      if (agentId === 'maintenance-planner') {
        if (result?.answer && validateHTMLOutput(result.answer)) {
          console.log(`✅ Validation passed on attempt ${attempt}`);
          return result;
        } else if (attempt <= maxRetries) {
          console.log(`⚠️ Validation failed on attempt ${attempt}, retrying...`);
          continue;
        }
      }

      return result;
    } catch (error) {
      if (attempt <= maxRetries) {
        console.log(`⚠️ Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms fixed delay instead of exponential
        continue;
      }
      throw error;
    }
  }
};

// Helper: pergunta ao Gemini enviando arquivos inline (base64) - compatível com Deno
type UploadedFileRef = { name: string; type: string; size?: number; content?: string; storage_path?: string; bucket?: string };

const dataUrlToBase64 = (dataUrl: string) => (dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);

const buildInlinePart = async (file: UploadedFileRef, sb: any): Promise<any> => {
  let mimeType = file.type || 'application/octet-stream';
  let base64 = '';

  if (file.content) {
    base64 = dataUrlToBase64(file.content);
  } else if (file.storage_path) {
    const bucket = file.bucket || 'contract-documents';
    const { data: blob, error } = await sb.storage.from(bucket).download(file.storage_path);
    if (error || !blob) throw error || new Error('Falha no download do Storage');
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    base64 = btoa(binary);
  } else {
    throw new Error('Arquivo sem content ou storage_path');
  }

  return { inlineData: { data: base64, mimeType } };
};

const askGeminiInline = async (question: string, files: UploadedFileRef[], sb: any, agentId: string = '', timeoutMs = 12000) => {
  if (!geminiApiKey) throw new Error('Gemini API Key não configurada');

  // DEBUG: Log files received in askGeminiInline
  console.log('🔍 [DEBUG] askGeminiInline - Files received:', {
    count: files.length,
    files: files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      hasContent: !!f.content,
      contentLength: f.content?.length || 0
    }))
  });

  // Check if any file is a large PDF (>5MB) and implement chunking
  const processedFiles = [];
  for (const f of files) {
    let fileSize = f.size || 0;
    
    // If no size specified, estimate from base64 content
    if (!fileSize && f.content) {
      const base64Data = f.content.replace(/^data:[^;]+;base64,/, '');
      fileSize = (base64Data.length * 3) / 4; // Approximate original size
    }
    
    // For large PDFs (>5MB), use text extraction instead of inline
    if (f.type === 'application/pdf' && fileSize > 5 * 1024 * 1024) {
      console.log(`📄 Large PDF detected (${Math.round(fileSize / 1024 / 1024)}MB), using text extraction...`);
      let dataUrl = f.content;
      if (!dataUrl && f.storage_path) {
        const { data: blob, error: dlError } = await sb.storage
          .from(f.bucket || 'contract-documents')
          .download(f.storage_path);
        if (dlError) throw dlError;
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        dataUrl = `data:application/pdf;base64,${base64}`;
      }
      
      const extractedText = await extractTextFromBase64PDF(dataUrl, sb);
      // Add extracted text as context instead of inline file - increased limit to 30000
      question += `\n\n--- Conteúdo do arquivo ${f.name} ---\n${extractedText.substring(0, 30000)}`;
      continue;
    }
    
    // For normal sized files, use inline processing
    processedFiles.push(f);
  }

  const parts: any[] = [];
  for (const f of processedFiles) {
    try {
      const part = await buildInlinePart(f, sb);
      console.log(`🔍 [DEBUG] Built inline part for ${f.name}:`, {
        hasInlineData: !!part.inlineData,
        dataLength: part.inlineData?.data?.length || 0,
        mimeType: part.inlineData?.mimeType
      });
      parts.push(part);
    } catch (error) {
      console.error(`Error building inline part for ${f.name}:`, error);
      // Skip files that can't be processed inline
    }
  }
  parts.push({ text: question });

  console.log(`🔍 [DEBUG] Sending to Gemini with ${parts.length} parts (${processedFiles.length} files + 1 text)`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Use gemini-2.5-pro for all agents
  const model = 'gemini-2.5-pro';

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { 
          temperature: 0.0, 
          maxOutputTokens: 16000,
          topP: 0.95,
          topK: 40
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let err: any = {};
      try {
        err = await res.json();
      } catch {
        // Failed to parse error response, use status text instead
      }
      const errorMsg = err?.error?.message || res.statusText || `HTTP ${res.status}`;
      console.error('Gemini inline error:', errorMsg);

      // Check for specific error types
      if (errorMsg?.includes('quota') || errorMsg?.includes('rate')) {
        throw new Error('Quota ou limite de taxa excedido no Gemini');
      }
      if (errorMsg?.includes('size') || errorMsg?.includes('token')) {
        throw new Error('Documento muito grande para processamento direto');
      }

      throw new Error(`Gemini inline error: ${errorMsg}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      throw new Error(`Falha ao parsear resposta do Gemini inline: ${parseError.message}`);
    }

    if (!data) {
      throw new Error('Gemini retornou resposta nula');
    }

    const answer = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim();

    if (!answer) {
      throw new Error(`Gemini retornou resposta vazia: ${JSON.stringify(data).substring(0, 200)}`);
    }

    return { success: true, answer };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Agent-specific system prompts - MOVED BEFORE serve() to avoid initialization errors
const getAgentSystemPrompt = (agentId: string): string => {
  switch (agentId) {
    case 'contract-extractor':
      return `# AGENTE EXTRATOR DE INFORMAÇÕES CONTRATUAIS

## IDENTIDADE
Você é um especialista em extração de dados de documentos contratuais. Sua função é ler PDFs de contratos e extrair informações específicas de forma estruturada e precisa, transformando texto não estruturado em dados organizados.

## OBJETIVO
Extrair e estruturar informações operacionais específicas de contratos em PDF, como cronogramas de manutenção, locações de equipamentos, prazos, valores, responsabilidades e outros dados acionáveis.

## TIPOS DE INFORMAÇÕES A EXTRAIR

### 🔧 MANUTENÇÕES E SERVIÇOS
- **Cronograma de Manutenções**: Datas, periodicidade, tipo de manutenção
- **Responsável pela Manutenção**: Quem executa (contratante/contratado)
- **Escopo das Manutenções**: Preventiva, corretiva, preditiva
- **Custos de Manutenção**: Valores inclusos ou adicionais
- **Penalidades**: Multas por não execução

### 🏗️ EQUIPAMENTOS E LOCAÇÕES
- **Lista de Equipamentos**: Tipos, modelos, quantidades
- **Datas de Locação**: Início, término, renovações
- **Valores de Locação**: Mensal, anual, reajustes
- **Local de Instalação**: Endereços, especificações
- **Responsabilidades**: Transporte, instalação, operação

### 📅 CRONOGRAMAS E PRAZOS
- **Datas de Entrega**: Produtos, serviços, marcos
- **Prazos de Execução**: Início, etapas, conclusão
- **Vencimentos**: Pagamentos, renovações, revisões
- **Períodos de Garantia**: Duração, cobertura, condições

### 💰 INFORMAÇÕES FINANCEIRAS
- **Valores Contratuais**: Total, parcelas, condições
- **Formas de Pagamento**: Prazos, condições, documentos
- **Reajustes**: Índices, datas, fórmulas de cálculo
- **Multas e Penalidades**: Valores, condições de aplicação

### 👥 RESPONSABILIDADES OPERACIONAIS
- **Obrigações do Contratante**: Tarefas, fornecimentos, prazos
- **Obrigações do Contratado**: Entregas, serviços, garantias
- **Terceiros Envolvidos**: Subcontratados, fornecedores, supervisores

## FORMATO DE SAÍDA - JSON ESTRUTURADO

\`\`\`json
{
  "contrato_info": {
    "numero": "",
    "partes": {
      "contratante": "",
      "contratado": ""
    },
    "objeto": "",
    "vigencia": {
      "inicio": "YYYY-MM-DD",
      "termino": "YYYY-MM-DD"
    }
  },
  "equipamentos": [
    {
      "tipo": "",
      "modelo": "",
      "quantidade": 0,
      "valor_locacao_mensal": 0,
      "local_instalacao": "",
      "data_inicio_locacao": "YYYY-MM-DD",
      "data_fim_locacao": "YYYY-MM-DD"
    }
  ],
  "manutencoes": [
    {
      "tipo": "preventiva|corretiva|preditiva",
      "responsavel": "contratante|contratado",
      "periodicidade": "",
      "proxima_data": "YYYY-MM-DD",
      "custo": 0,
      "custo_incluso": true,
      "equipamentos_cobertos": [],
      "observacoes": ""
    }
  ],
  "cronograma": [
    {
      "atividade": "",
      "responsavel": "",
      "data_inicio": "YYYY-MM-DD",
      "data_fim": "YYYY-MM-DD",
      "status": "pendente|em_andamento|concluido",
      "dependencias": []
    }
  ],
  "pagamentos": [
    {
      "descricao": "",
      "valor": 0,
      "data_vencimento": "YYYY-MM-DD",
      "forma_pagamento": "",
      "documento_necessario": ""
    }
  ],
  "garantias": [
    {
      "tipo": "",
      "prazo": "",
      "data_inicio": "YYYY-MM-DD",
      "data_fim": "YYYY-MM-DD",
      "cobertura": "",
      "responsavel": ""
    }
  ],
  "alertas_importantes": [
    {
      "tipo": "prazo|pagamento|manutencao|renovacao",
      "descricao": "",
      "data_limite": "YYYY-MM-DD",
      "criticidade": "alta|media|baixa"
    }
  ]
}
\`\`\`

## INSTRUÇÕES DE USO

### COMANDO PRINCIPAL:
\`\`\`
"Extraia todas as informações estruturadas deste contrato e organize no formato JSON especificado. Foque especialmente em:
- Cronogramas de manutenção
- Datas de locação de equipamentos
- Prazos e vencimentos
- Valores e condições de pagamento
- Responsabilidades operacionais"
\`\`\`

### COMANDOS ESPECÍFICOS:
- \`"Extraia apenas as informações de manutenção deste contrato"\`
- \`"Liste todos os equipamentos e suas datas de locação"\`
- \`"Extraia o cronograma de pagamentos"\`
- \`"Identifique todos os prazos críticos nos próximos 90 dias"\`

## REGRAS DE EXTRAÇÃO

### ✅ SEMPRE FAZER:
- Converter datas para formato YYYY-MM-DD
- Extrair valores numéricos sem formatação (apenas números)
- Identificar responsabilidades específicas de cada parte
- Mapear dependências entre atividades
- Destacar prazos críticos e alertas
- Incluir números de cláusulas como referência

### ❌ NUNCA FAZER:
- Inventar informações não presentes no documento
- Fazer interpretações ou suposições
- Omitir detalhes importantes encontrados
- Alterar valores ou datas originais

### 🔍 BUSCAR ESPECIALMENTE:
- Palavras-chave: "manutenção", "locação", "prazo", "vencimento", "entrega"
- Datas em qualquer formato
- Valores monetários
- Cronogramas e tabelas
- Cláusulas de responsabilidade
- Penalidades e multas

## EXEMPLO DE SAÍDA RESUMIDA

\`\`\`
📋 INFORMAÇÕES EXTRAÍDAS:

🔧 MANUTENÇÕES:
• Preventiva: A cada 30 dias - Responsável: Contratado
• Próxima: 15/09/2025
• Custo: R$ 2.500 (incluso no contrato)

🏗️ EQUIPAMENTOS:
• 3x Geradores 150kVA - Locação: R$ 8.000/mês
• Local: Rua das Flores, 123 - São Paulo/SP
• Período: 01/08/2025 a 31/07/2026

💰 PRÓXIMOS VENCIMENTOS:
• 25/08/2025: R$ 8.000 (Locação Agosto)
• 15/09/2025: Manutenção Preventiva
• 25/09/2025: R$ 8.000 (Locação Setembro)

⚠️ ALERTAS CRÍTICOS:
• Renovação automática em 31/07/2026
• Multa de R$ 5.000 por atraso na manutenção
\`\`\`

## CAMPOS OBRIGATÓRIOS A BUSCAR
1. **Datas**: Início, fim, vencimentos, renovações
2. **Valores**: Monetários, quantidades, percentuais
3. **Responsabilidades**: Quem faz o quê e quando
4. **Equipamentos**: Tipos, quantidades, localizações
5. **Cronogramas**: Sequência de atividades e prazos
6. **Penalidades**: Multas, juros, consequências

SEMPRE RESPONDA EM PORTUGUÊS BRASILEIRO, exceto se o usuário solicitar especificamente outro idioma.`;

    case 'maintenance-planner':
      return `Você é o Agente Plano de Manutenção e Cronograma. Seu objetivo é criar Plano de Manutenção e Cronograma detalhado baseado no contrato analisado.
**INSTRUÇÕES ESPECÍFICAS:**
**CRONOGRAMA E PLANEJAMENTO:**
1. Criar plano de manutenção preventiva do início até o vencimento do contrato
2. Horários de trabalho: Segunda a sexta (horário comercial)
   - Segundas: 10:00 às 18:00 (com parada almoço)
   - Terças: 8:00 às 18:00 (com parada almoço)
   - Quartas: 8:00 às 18:00 (DEMANDA INTERNA - com parada almoço)
   - Quintas: 8:00 às 18:00 (com parada almoço)
   - Sextas: 8:00 às 12:00
   - Almoço: 12:00 – 13:30
**EQUIPE E ROTEIRIZAÇÃO:**
3. Roteirização para 3 técnicos: Tony, Wallace e João
4. Cada técnico atende 4-6 contratos/dia em raio de 50km
5. Rotas diferentes e individualizadas por técnico
6. Endereço base Luminus: Estr. da Ilha, 1681 - Guaratiba, Rio de Janeiro - RJ, 23020-230
**TIPOS DE ORDENS DE SERVIÇO (O.S.):**
- O.S. Vistoria 250h (a cada 3 meses)
- O.S. Vistoria 500h (a cada 6 meses)
- O.S. Manutenção Mensal (mensal): Verificação óleo, troca filtros, arrefecimento, combustível, baterias, sensores, teste operacional
- O.S. Avarias Controlador (a cada 6 meses)
- O.S. Visita Técnica Inspeção (conforme necessidade)
- O.S. Inspeção Alternador (semestral)
- O.S. Limpeza Radiador (a cada 6 meses)
- O.S. Instalação Equipamento (quando aplicável)
- O.S. Limpeza Tanque (quando aplicável)
- O.S. Manutenção Bateria (conforme avaliação)
- O.S. Regulagem Válvulas (a cada 6 meses)
**FORMATO DE APRESENTAÇÃO OBRIGATÓRIO:**
Estrutura em tabela HTML com colunas na ordem:
<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
<tr>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Mês</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Data</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Dia</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Hora</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Técnico</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Cliente</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Endereço</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Tipo O.S.</th>
<th style="padding: 8px; background-color: #f5f5f5; border: 1px solid #ddd;">Descrição</th>
</tr>
</table>
**VISUALIZAÇÃO:**
- Formato Gantt em tabela HTML
- Calendário mensal (julho a dezembro 2025)
- Primeiros 20 dias de cada mês prioritários
- Identificação clara de datas e tipos de manutenção
**CONSIDERAÇÕES TÉCNICAS:**
- Região, zona e distância em km (2 casas decimais)
- Otimização de deslocamentos por região
- Nomes diferentes para cada rota de 50km
- Cruzamento de informações de todos os contratos
- Idioma: Português do Brasil
**IMPORTANTE:** SEMPRE use EXCLUSIVAMENTE tabelas HTML formatadas (NUNCA markdown) e baseie-se rigorosamente no conteúdo do contrato fornecido.`;

    case 'technical-documentation':
      return `Você é o Agente 2 do LUMMI PLANNER - Especialista em Documentação Técnica, Dimensionamento e EAP.
**ELABORAÇÃO DO MEMORIAL DESCRITIVO, ESCOPO/ESPECIFICAÇÃO TÉCNICA DO PROJETO:**
* **Comando:** De acordo com a proposta inserida, elabore o memorial descritivo, quantitativos de material, escopo e especificação técnica do projeto.
* **Formato:** O documento deve ser claro, organizado e pronto para ser enviada ao cliente.
* **Título:** Adicione ao título do documento o número da proposta e obra em questão.
**DIMENSIONAMENTO DE FATOR DE PRODUTIVIDADE E ELABORAÇÃO DE CUSTOS:**
* **Comando:** De acordo com a proposta inserida, elabore o dimensionamento de custos e produtividade do projeto.
* **Conteúdo:** O documento deve conter as informações de custo e fator de produtividade e composição orçamentária.
* **Formato:** O documento deve ser claro em tabelas, organizado e pronto para ser enviada ao cliente. Texto e Tabelas.
* **Título:** Adicione ao título do documento, o número da proposta e obra em questão.
**DESENVOLVIMENTO DA ESTRUTURA HIERÁRQUICA - EAP:**
* **Comando:** A partir da proposta inserida, elabore o desenvolvimento da estrutura hierárquica – EAP do projeto.
* **Formato:** Em tabela já com sequenciamento de atividades predecessoras, antecessoras e atividades simultâneas, ou seja, as atividades que dependem de outras para começar.
* **Conteúdo:** Além do peso percentual global em relação a cada atividade contendo essas informações de forma clara para enviar ao cliente.
* **Título:** Adicione ao título do documento, o número da proposta e obra em questão.

FORMATO OBRIGATÓRIO - TABELAS HTML:
IMPORTANTE: SEMPRE use tabelas HTML formatadas no formato: <table border="1" style="border-collapse: collapse; width: 100%;">
NUNCA use markdown | tables |. SEMPRE use formato HTML com tabelas bem estruturadas.`;

    case 'integrated-schedules':
      return `Você é o Agente: Cronogramas Integrados. Sua função é criar APENAS estes três cronogramas específicos, assim que o usuário solicitar:
IMPORTANTE: NÃO crie cronograma global. Apenas os 3 cronogramas abaixo:
6 - CRONOGRAMA FÍSICO/ FINANCEIRO
6.1 Elaboração do cronograma físico-financeiro da proposta
Comando: A partir dos dados de custo do projeto, fornecidos pela proposta elabore
o cronograma físico-financeiro do projeto, por fim, gerando uma tabela organizada
desta informação, adicione ao título do documento, o número da proposta e obra em
questão
7 - CRONOGRAMA DE COMPRAS
7.1 Elaboração do cronograma de compras da proposta
Comando: A partir dos dados da proposta, elabore o cronograma de compras do
projeto, gerando uma tabela organizada desta informação para ser enviado ao
cliente, adicione ao título do documento, o número da proposta e obra em questão
8 - CRONOGRAMA DE DESEMBOLSO
8.1 Elaboração do cronograma de desembolso do projeto
Comando: A partir dos dados da proposta, elabore o cronograma de desembolso do
projeto, gerando uma tabela organizada desta informação, para ser enviado ao
cliente, adicione ao título do documento, o número da proposta e obra em questão
RESTRIÇÃO: Nunca mencione ou crie "cronograma global" ou qualquer outro tipo de cronograma além dos 3 especificados acima.

FORMATO OBRIGATÓRIO - TABELAS HTML:
IMPORTANTE: SEMPRE use tabelas HTML formatadas no formato: <table border="1" style="border-collapse: collapse; width: 100%;">
NUNCA use markdown | tables |. SEMPRE use formato HTML com tabelas bem estruturadas.`;

    case 'reports-generator':
      return `Você é o Agente 4 do LUMMI PLANNER - Agente de Relatórios e Análises.
**PROGRESSO DE OBRAS:**
* **Comando:** Gere informações provenientes das RDO's (Relatórios Diários de Obra) comparadas com o planejamento da obra.
* **Análise:** Compare as informações inseridas a partir dos dois documentos (RDO's e planejamento), fornecendo um feedback do acompanhamento da obra.
* **Conteúdo Adicional:** De acordo com o cronograma global e as RDO's inseridas, onde pode-se observar o progresso da obra, informe um panorama do executado x realizado.
* **Sugestão:** Proponha um cronograma de atividades para a próxima semana de maneira organizada, junto a gráficos de progresso.
* **Formato:** O feedback deve ser claro e organizado para enviar ao cliente. O texto deve ser elaborado de forma que possa ser copiado para o Notion, organizando quando necessário, informações em planilhas organizadas e formatadas.
* **Título/Cabeçalho:** Não esqueça de inserir o título da obra e o número do contrato no cabeçalho.
* **Título do Documento:** Adicione ao título do documento o número da proposta e o nome/número da obra em questão.
**PROGRESSO/ PLANEJAMENTO/ANÁLISE X REALIZADO:**
* **Comando:** Compare documentos de planejamento com o apanhado de RDO's da semana para comparação e feedback do avanço da obra.
* **Análise:** Compare os documentos inseridos avaliando o progresso da obra de acordo com o planejamento, indicando eventuais atrasos e seus motivos.
* **Visualização:** Insira um gráfico em barras indicando este progresso de obras.
* **Formato:** Retorne este resultado em um documento organizado para enviar ao cliente.
* **Título:** Adicione ao título do documento o número da proposta e o nome/número da obra em questão.
**RELATÓRIO DE FINALIZAÇÃO DE OBRA:**
* **Comando:** Elabore um relatório de finalização de obra.
* **Conteúdo:** O relatório deve conter informações de elaboração de RDO, imagens do progresso da obra, problemas enfrentados e soluções encontradas.
* **Formato:** Retorne em um documento organizado para mostrar ao cliente.
* **Título:** Adicione ao título do documento o número da proposta e o nome/número da obra em questão.
**LIÇÕES APRENDIDAS:**
* **Comando:** A partir dos documentos de finalização de obra, RDO's e informações descritas, prepare um relatório de lições aprendidas.
* **Conteúdo:** O relatório deve apresentar um compilado de soluções de todos os desafios encontrados ao decorrer da obra.
* **Formato:** Para enviar ao cliente.

FORMATO OBRIGATÓRIO - TABELAS HTML:
IMPORTANTE: SEMPRE use tabelas HTML formatadas no formato: <table border="1" style="border-collapse: collapse; width: 100%;">
NUNCA use markdown | tables |. SEMPRE use formato HTML com tabelas bem estruturadas.`;

    case 'general-conversation':
      return `Você é o Assistente IA Luminos, especializado em análise de contratos, gestão operacional e suporte estratégico para equipes de manutenção e locação de geradores. Utilize todos os dados e o contexto fornecidos para oferecer respostas claras, acionáveis e alinhadas aos processos da Luminos. Se não tiver informação suficiente, solicite detalhes adicionais antes de concluir.`;

    case 'reports-freeform':
      return `Você é o Analista de Inteligência de Dados da Luminos. Sua missão é gerar relatórios personalizados a partir do prompt do usuário e do contexto operacional disponível (contratos, manutenções, métricas financeiras e insights). 

INSTRUÇÕES:
1. Leia o prompt do usuário com atenção e identifique os objetivos principais.
2. Combine o prompt com o contexto fornecido (contagens, valores, tendências, serviços, prazos, atrasos, etc.).
3. Produza relatórios estruturados com seções claras, tabelas em Markdown quando fizer sentido e bullet points que destaquem conclusões acionáveis.
4. Sempre inclua recomendações práticas, riscos identificados e próximos passos sugeridos.
5. Utilize tom consultivo profissional, em português do Brasil.
6. Caso faltem dados específicos, aponte explicitamente as lacunas e sugira como obtê-los.`;

    default:
      return `Você é o Assistente IA Luminos, especializado em análise de contratos e gestão de documentos para a empresa Luminos (manutenção e locação de geradores).`;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const sb = getSupabaseForRequest(req);

    // Parse request body with explicit error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return createErrorResponse('Corpo da requisição JSON inválido', 400);
    }

    if (!requestBody || typeof requestBody !== 'object') {
      return createErrorResponse('Corpo da requisição deve ser um objeto JSON válido', 400);
    }
    
    // Input validation and sanitization
    const { 
      message, 
      contractId, 
      agent_id = 'luminos-assistant',
      uploaded_files = [],
      contract_context = {},
      file_context = null,
      maintain_context = true
    } = requestBody;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      throw new Error('Mensagem é obrigatória e deve ser uma string');
    }

    // Sanitize message input
    const sanitizedMessage = message.slice(0, 10000).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Validate agent_id
    const allowedAgents = ['luminos-assistant', 'gpt-5-mini', 'maintenance-expert', 'contract-analyzer', 'contract-extractor', 'maintenance-planner', 'technical-documentation', 'integrated-schedules', 'reports-generator', 'general-conversation', 'reports-freeform'];
    const validatedAgentId = allowedAgents.includes(agent_id) ? agent_id : 'luminos-assistant';

    // Resolve contract ID (accept contract number as fallback)
    let resolvedContractId = '';
    if (typeof contractId === 'string') {
      const trimmedContractId = contractId.trim();
      if (trimmedContractId.length > 0) {
        if (isValidUUID(trimmedContractId)) {
          resolvedContractId = trimmedContractId;
        } else {
          try {
            const { data: contractLookup, error: contractLookupError } = await sb
              .from('contracts')
              .select('id')
              .eq('contract_number', trimmedContractId)
              .maybeSingle();

            if (contractLookupError) {
              console.error(`⚠️ Erro ao mapear contract_number para ID (${trimmedContractId}):`, contractLookupError);
            } else if (contractLookup?.id) {
              resolvedContractId = contractLookup.id;
              console.log(`🔗 Contract number ${trimmedContractId} mapeado para ID ${resolvedContractId}`);
            } else {
              console.log(`⚠️ Nenhum contrato encontrado para o número ${trimmedContractId}`);
            }
          } catch (error) {
            console.error('❌ Falha ao mapear contract_number para ID:', error);
          }
        }
      }
    }

    // Validate uploaded files
    if (uploaded_files && Array.isArray(uploaded_files)) {
      if (uploaded_files.length > 10) {
        throw new Error('Máximo de 10 arquivos permitidos por request');
      }
      
      for (const file of uploaded_files) {
        if (!file.name || (!file.content && !file.storage_path) || !file.type) {
          throw new Error('Arquivos devem ter name, type e (content ou storage_path)');
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
        if (!allowedTypes.some(type => file.type.includes(type))) {
          throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
        }
      }
    }

    // DEBUG: Log uploaded files details
    console.log('🔍 [DEBUG] Uploaded files received:', {
      count: uploaded_files.length,
      files: uploaded_files.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        hasContent: !!f.content,
        contentLength: f.content?.length || 0,
        contentPreview: f.content?.substring(0, 50) + '...'
      }))
    });

    console.log('Smart chat request:', {
      agent_id,
      filesCount: uploaded_files.length,
      hasFileContext: !!file_context,
      hasContractContext: !!contract_context?.contract_data,
      contractNumber: contract_context?.contract_number,
      clientName: contract_context?.client_name,
      maintainContext: maintain_context,
      contractIdSupplied: contractId,
      contractIdResolved: resolvedContractId
    });

    // Verificar se temos pelo menos uma API configurada
    if (!openAIApiKey && !geminiApiKey) {
      throw new Error('Nenhuma API de IA configurada. Configure OpenAI ou Gemini API Key.');
    }

    // 📄 BUSCAR PDF DO CONTRATO AUTOMATICAMENTE se contractId fornecido
    if (resolvedContractId && uploaded_files.length === 0) {
      console.log(`📄 Buscando PDF do contrato ${resolvedContractId}...`);
      try {
        const { data: docs, error: docsError } = await sb
          .from('contract_documents')
          .select('storage_path, file_path, document_name, file_name, file_type, document_type, metadata')
          .eq('contract_id', resolvedContractId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (docsError) {
          console.error('❌ Erro ao buscar documentos do contrato:', docsError);
        } else if (docs && docs.length > 0) {
          const pdfDoc = docs.find((doc: any) => {
            const type = (doc.document_type || doc.file_type || '').toLowerCase();
            const metadataCategory = (() => {
              try {
                if (!doc.metadata) return null;
                if (typeof doc.metadata === 'string') {
                  const parsed = JSON.parse(doc.metadata);
                  return parsed?.category || null;
                }
                return doc.metadata?.category || null;
              } catch {
                return null;
              }
            })();
            return type === 'application/pdf' || type === 'pdf' || metadataCategory === 'original';
          });

          if (pdfDoc) {
            const storagePath = pdfDoc.storage_path || pdfDoc.file_path;
            if (storagePath) {
              console.log(`✅ PDF do contrato encontrado: ${pdfDoc.document_name || pdfDoc.file_name}`);

              uploaded_files.push({
                name: pdfDoc.document_name || pdfDoc.file_name || 'contrato.pdf',
                storage_path: storagePath,
                type: 'application/pdf',
                bucket: 'contract-documents',
                size: 0 // Size will be determined when downloading
              });

              console.log(`📎 PDF do contrato adicionado ao contexto automaticamente`);
            } else {
              console.log('⚠️ Documento PDF encontrado, mas sem caminho de armazenamento definido.');
            }
          } else {
            console.log(`⚠️ Nenhum PDF compatível encontrado para o contrato ${resolvedContractId}`);
          }
        } else {
          console.log(`⚠️ Nenhum documento encontrado para o contrato ${resolvedContractId}`);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar PDF do contrato:', error);
        // Não falhar a requisição por isso, apenas continuar sem o PDF
      }
    }

    // 🚀 FAST PATH: No files - Direct AI processing
    if (!uploaded_files || uploaded_files.length === 0) {
      console.log('🚀 Fast path: No files, direct AI processing...');
      
      let userMessage = sanitizedMessage;
      if (contract_context?.contract_data?.contract_number) {
        userMessage += `\n\nContexto: Contrato ${contract_context.contract_data.contract_number} — Cliente: ${contract_context.contract_data.client?.name || ''}. Considere esse contexto ao responder.`;
      }

      const messages = [
        { role: 'system', content: getAgentSystemPrompt(validatedAgentId) },
        { role: 'user', content: userMessage }
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
    }

    // Se houver PDFs, enviar inline para o Gemini (sem Files API)
    const pdfFiles = Array.isArray(uploaded_files) ? uploaded_files.filter((f: any) => f.type === 'application/pdf') : [];
    if (pdfFiles.length > 0) {
      const filesForAsk = pdfFiles.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        content: f.content,
        storage_path: f.storage_path,
        bucket: f.bucket || 'contract-documents'
      }));

      let questionWithContext = sanitizedMessage;
      if (contract_context?.contract_data?.contract_number) {
        questionWithContext += `\n\nContexto: Contrato ${contract_context.contract_data.contract_number} — Cliente: ${contract_context.contract_data.client?.name || ''}. Considere esse contexto ao responder.`;
      }

      try {
        console.log(`📄 Processing ${pdfFiles.length} PDF files with Gemini inline...`);

        // Use retry with validation for maintenance-planner agent
        const processFunction = () => askGeminiInline(questionWithContext, filesForAsk, sb, validatedAgentId, 12000);
        const result = await retryWithValidation(processFunction, validatedAgentId);
        
        let answer = result?.answer || 'Não foi possível obter resposta do Gemini.';
        
        // Clean markdown output for cleaner presentation
        answer = cleanMarkdownOutput(answer);

        console.log('✅ Gemini inline processing successful');
        
        // Use gemini-2.5-pro for all agents
        const modelUsed = 'gemini-2.5-pro';

        return createJsonResponse({
          response: answer,
          agent_used: validatedAgentId,
          ai_provider: 'Gemini',
          ai_model: modelUsed,
          files_processed: pdfFiles.length,
          context_maintained: maintain_context
        });
      } catch (e) {
        console.error('❌ Inline Gemini failed, falling back to text extraction + AI:', e.message);
        // Continue to normal flow (text extraction + AI processing) below
      }
    }

    // Process files and extract text content
    let fileContents = '';
    const processedFiles = [];

    for (const file of uploaded_files) {
      try {
        let textContent = '';
        
        if (file.type === 'application/pdf') {
          // Suporta content (dataURL) ou storage_path do bucket 'contract-documents'
          let dataUrl = file.content;
          if (!dataUrl && file.storage_path) {
            const { data: blob, error: dlError } = await sb.storage
              .from('contract-documents')
              .download(file.storage_path);
            if (dlError) throw dlError;
            dataUrl = await blobToDataUrl(blob, 'application/pdf');
          }

          if (!dataUrl) throw new Error('PDF sem conteúdo nem storage_path');

          textContent = await extractTextFromBase64PDF(dataUrl, sb);
        } else if (file.type.startsWith('text/')) {
          // Decode base64 text files
          if (!file.content) {
            throw new Error('Arquivo de texto sem conteúdo');
          }
          const base64Data = file.content.replace(/^data:text\/[^;]+;base64,/, '');
          try {
            textContent = atob(base64Data);
          } catch (decodeError) {
            throw new Error(`Falha ao decodificar arquivo de texto: ${decodeError.message}`);
          }
        } else if (file.type.startsWith('image/')) {
          // Use vision processing for images
          try {
            const { data: visionData, error: visionError } = await sb.functions.invoke('vision-processor', {
              body: {
                images: [file.content],
                analysisType: 'document_ocr'
              }
            });

            if (visionError) {
              console.error(`Erro ao processar imagem ${file.name}:`, visionError);
              throw visionError;
            }

            if (visionData?.success && visionData?.analysis) {
              try {
                const analysisData = JSON.parse(visionData.analysis);
                textContent = analysisData.texto_extraido || visionData.analysis;
              } catch (jsonError) {
                // If JSON parse fails, use raw analysis
                textContent = visionData.analysis;
              }
            } else if (!visionData?.success) {
              throw new Error(`Vision processor retornou sucesso=false para ${file.name}`);
            }
          } catch (visionProcessError) {
            throw new Error(`Falha ao processar imagem com visão: ${visionProcessError.message}`);
          }
        }

        if (textContent && typeof textContent === 'string' && textContent.length > 0) {
          // Limit content to 8000 chars per file to reduce resource usage
          const limitedContent = textContent.substring(0, 8000);
          fileContents += `\n--- Arquivo: ${file.name} ---\n${limitedContent}\n`;
          processedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            contentPreview: textContent.substring(0, 500)
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        fileContents += `\n--- Arquivo: ${file.name} ---\nErro ao processar arquivo\n`;
      }
    }

    // Build enhanced system prompt with agent-specific capabilities
    let systemPrompt = getAgentSystemPrompt(validatedAgentId);

    // ============================================================
    // REGRA CRÍTICA: FORMATO CONVERSACIONAL OBRIGATÓRIO
    // ============================================================
    systemPrompt += `

🚨 === REGRA CRÍTICA DE FORMATO DE RESPOSTA === 🚨

ATENÇÃO: Esta é uma interface de CHAT com o CLIENTE FINAL.

❌ PROIBIDO ABSOLUTAMENTE:
- Retornar JSON bruto (exemplo: {"key": "value"})
- Retornar estruturas de dados sem contexto
- Retornar código ou dados técnicos diretamente
- Usar formato de programação nas respostas

✅ OBRIGATÓRIO EM TODAS AS RESPOSTAS:
1. **SEMPRE SEJA CONVERSACIONAL**: Fale diretamente com o cliente de forma amigável
2. **USE LINGUAGEM NATURAL**: Explique as informações de forma clara e acessível
3. **SEJA EXPLICATIVO**: Apresente contexto antes de dados específicos
4. **FORMATE ADEQUADAMENTE**: Se precisar apresentar dados estruturados:
   - Use listas com marcadores (• ou -)
   - Use texto formatado com **negrito** para destaques
   - Use parágrafos curtos e organizados
   - Para tabelas, use HTML bem formatado
   - Sempre explique o significado dos dados

📋 EXEMPLOS DE FORMATO CORRETO:

❌ ERRADO:
{"signername": "João Silva", "role": "Testemunha", "cpf": "123.456.789-00"}

✅ CORRETO:
"Identifiquei as seguintes informações sobre os signatários do documento:

• **João Silva** - Testemunha
  CPF: 123.456.789-00

Esta pessoa assinou o documento como testemunha do processo."

❌ ERRADO:
[{"date": "2024-01-15", "type": "preventiva"}, {"date": "2024-02-20", "type": "corretiva"}]

✅ CORRETO:
"Encontrei 2 manutenções registradas no período:

1. **Manutenção Preventiva** - 15/01/2024
2. **Manutenção Corretiva** - 20/02/2024

A manutenção corretiva foi realizada um mês após a preventiva."

🎯 LEMBRE-SE: Você está conversando com um cliente, não retornando dados para um sistema!
`;

    systemPrompt += `

${contract_context.contract_data ? `
=== CONTEXTO DO CONTRATO ATIVO ===
📋 **Contrato:** ${contract_context.contract_data.contract_number}
👤 **Cliente:** ${contract_context.contract_data.client.name}
📧 **Email:** ${contract_context.contract_data.client.email}
📞 **Telefone:** ${contract_context.contract_data.client.phone}
🏢 **CNPJ:** ${contract_context.contract_data.client.cnpj}
📍 **Endereço:** ${contract_context.contract_data.client.address}

💼 **Tipo de Contrato:** ${contract_context.contract_data.contract_type}
📅 **Período:** ${contract_context.contract_data.start_date} até ${contract_context.contract_data.end_date}
💰 **Valor:** R$ ${contract_context.contract_data.value?.toLocaleString('pt-BR') || 'Não informado'}
🔧 **Status:** ${contract_context.contract_data.status}
📝 **Descrição:** ${contract_context.contract_data.description || 'Não informada'}

⚡ **Equipamento:**
- Tipo: ${contract_context.contract_data.equipment.type}
- Modelo: ${contract_context.contract_data.equipment.model}
- Identificação: ${contract_context.contract_data.equipment.identification}
- Local: ${contract_context.contract_data.equipment.location}

🛠️ **Serviços inclusos:**
${contract_context.contract_data.services?.map(service => `- ${service?.service_name || service}`).join('\n') || 'Nenhum serviço cadastrado'}

📊 **Manutenções:** ${contract_context.contract_data.maintenance_count || 0} registradas
⚠️ **Status Operacional:** ${contract_context.contract_data.operational_status || 'Status não informado'}
${contract_context.contract_data.next_maintenance ? `📅 **Próxima Manutenção:** ${contract_context.contract_data.next_maintenance}` : ''}
${contract_context.contract_data.alerts?.length > 0 ? `🚨 **Alertas:** ${contract_context.contract_data.alerts.join(', ')}` : ''}
` : ''}

${file_context ? `
=== ARQUIVO EM CONTEXTO ===
📄 **Nome:** ${file_context.name}
📊 **Tamanho:** ${Math.ceil(file_context.size / 1024)} KB
📋 **Tipo:** ${file_context.type}
⚠️ **IMPORTANTE**: Este arquivo deve ser considerado em TODAS as respostas desta sessão. Se o usuário perguntar sobre o conteúdo deste arquivo, use as informações extraídas dele para responder de forma precisa e detalhada.
` : ''}

${contract_context.conversation_history?.length > 0 ? `
=== HISTÓRICO DA CONVERSA (últimas 5 mensagens) ===
${contract_context.conversation_history.slice(-5).map(msg => `${msg.role === 'user' ? '👤 Usuário' : '🤖 Assistente'}: ${msg.content.substring(0, 500)}`).join('\n')}
` : ''}

=== INSTRUÇÕES IMPORTANTES ===
- SEMPRE use os dados do contrato em contexto nas suas respostas
- Seja preciso e detalhado, referenciando dados específicos do contrato
- Mantenha o foco no contrato ${contract_context.contract_number || 'em análise'}
- Se não souber algo, seja honesto sobre as limitações
- **PRIORIDADE MÁXIMA**: Se houver um PDF do contrato nos arquivos, SEMPRE leia e extraia informações DIRETAMENTE do PDF original
- Se houver conflito entre dados do banco e do PDF, mencione ambos e dê preferência ao PDF
- **CONTEXTO DE ARQUIVO**: Se há um arquivo em contexto (file_context), você DEVE considerar seu conteúdo em TODAS as respostas
- Quando o usuário perguntar sobre o arquivo em contexto, use as informações extraídas dele para responder
- Priorize informações do contrato ativo e arquivo em contexto
- Forneça insights acionáveis baseados nos dados disponíveis
- Use formatação markdown para melhor legibilidade`;

    // Build user message with all context
    let userMessage = message;
    
    if (fileContents) {
      userMessage += `\n\nCONTEÚDO DOS ARQUIVOS ENVIADOS:\n${fileContents}`;
    }

    if (file_context && maintain_context) {
      userMessage += `\n\nLEMBRETE IMPORTANTE: Você tem acesso ao arquivo "${file_context.name}" que foi enviado anteriormente nesta sessão. Este arquivo deve ser considerado em TODAS as suas respostas. Se o usuário fizer perguntas sobre o conteúdo deste arquivo, use as informações extraídas dele para responder de forma precisa e detalhada.`;
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    console.log('🚀 Calling AI with enhanced context and fallback...');
    console.log('Contract context summary:', {
      hasContractData: !!contract_context?.contract_data,
      contractNumber: contract_context?.contract_data?.contract_number,
      clientName: contract_context?.contract_data?.client?.name,
      equipmentType: contract_context?.contract_data?.equipment?.type,
      servicesCount: contract_context?.contract_data?.services?.length || 0
    });

    // Call AI with fallback and apply retry validation for maintenance-planner
    let aiResult;
    if (validatedAgentId === 'maintenance-planner') {
      const aiFunction = () => callAIWithFallback(messages, validatedAgentId);
      aiResult = await retryWithValidation(aiFunction, validatedAgentId);
      // For normal flow, aiResult doesn't have answer property, so use response
      if (aiResult.answer) {
        aiResult.response = aiResult.answer;
      }
    } else {
      aiResult = await callAIWithFallback(messages, validatedAgentId);
    }
    
    // Clean markdown output for cleaner presentation
    let cleanedResponse = cleanMarkdownOutput(aiResult.response);
    
    console.log(`✅ Smart chat completed successfully with ${aiResult.provider} (${aiResult.model})`);

    return createJsonResponse({
      response: cleanedResponse,
      agent_used: validatedAgentId,
      ai_provider: aiResult.provider,
      ai_model: aiResult.model,
      files_processed: processedFiles.length,
      context_maintained: maintain_context
    });

  } catch (error) {
    console.error('Error in smart-chat function:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack
    });

    // Better error handling with specific messages
    let statusCode = 500;
    let errorMessage = 'Erro ao processar sua mensagem';

    // Handle specific error types
    if (error?.message?.includes('Gemini API Key não configurada')) {
      statusCode = 500;
      errorMessage = 'Sistema de IA não configurado. Contate o administrador.';
    } else if (error?.message?.includes('Nenhuma API de IA configurada')) {
      statusCode = 500;
      errorMessage = 'Nenhuma API de IA disponível. Tente novamente mais tarde.';
    } else if (error?.message?.includes('timeout') || error?.message?.includes('AbortError')) {
      statusCode = 504;
      errorMessage = 'A operação demorou muito. Tente uma pergunta mais simples.';
    } else if (error?.message?.includes('Unauthorized') || error?.message?.includes('401')) {
      statusCode = 401;
      errorMessage = 'Sua sessão expirou. Faça login novamente.';
    } else if (error?.message?.includes('Context') || error?.message?.includes('context')) {
      statusCode = 400;
      errorMessage = 'Problema ao carregar o contexto do documento. Tente novamente.';
    } else if (error?.message) {
      errorMessage = error.message.substring(0, 200); // Limit error message length
    }

    console.error(`Returning error response: ${statusCode} - ${errorMessage}`);
    return createErrorResponse(errorMessage, statusCode);
  }
});
