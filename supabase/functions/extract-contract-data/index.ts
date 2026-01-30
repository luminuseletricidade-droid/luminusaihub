import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

class ContractExtractor {
  private supabase: any;
  private openaiApiKey: string;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openaiApiKey = openaiApiKey || '';
  }

  async extractTextFromPDF(pdfBytes: Uint8Array): Promise<{
    text: string;
    numPages: number;
    metadata: any;
    structuredData: any;
  }> {
    console.log('🔄 Iniciando extração de texto do PDF...');
    
    try {
      // Usar API PDF.co para extração
      const base64Data = this.arrayBufferToBase64(pdfBytes);
      
      console.log('📡 Chamando API PDF.co...');
      const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
        method: 'POST',
        headers: {
          'x-api-key': 'demo',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: `data:application/pdf;base64,${base64Data}`,
          async: false,
          pages: '',
          name: 'contract_extraction'
        })
      });

      if (!response.ok) {
        console.error('❌ Erro na resposta da API PDF.co:', response.status, response.statusText);
        throw new Error(`PDF.co API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📄 Resposta da API PDF.co recebida');
      
      if (data.error) {
        console.error('❌ Erro retornado pela API PDF.co:', data.message);
        throw new Error(`PDF.co error: ${data.message || 'Unknown error'}`);
      }

      const extractedText = data.body || '';
      console.log(`✅ Texto extraído: ${extractedText.length} caracteres`);
      
      if (extractedText.length < 50) {
        console.log('⚠️ Texto extraído muito curto, tentando fallback...');
        const fallbackText = this.extractTextFromBytes(pdfBytes);
        if (fallbackText.length > 50) {
          console.log('✅ Fallback bem-sucedido');
          const structuredData = await this.processStructuredData(fallbackText);
          return {
            text: fallbackText,
            numPages: 1,
            metadata: { extraction_method: 'fallback_bytes' },
            structuredData
          };
        }
        throw new Error('Texto extraído insuficiente de todas as fontes');
      }

      const structuredData = await this.processStructuredData(extractedText);
      
      return {
        text: extractedText,
        numPages: this.estimatePageCount(extractedText),
        metadata: { 
          extraction_method: 'pdf_co_api',
          api_response_size: extractedText.length
        },
        structuredData
      };
      
    } catch (error) {
      console.error('❌ Erro na extração via PDF.co:', error);
      
      // Fallback final
      try {
        console.log('🔄 Tentando fallback final...');
        const fallbackText = this.extractTextFromBytes(pdfBytes);
        if (fallbackText.length > 50) {
          console.log('✅ Fallback final bem-sucedido');
          const structuredData = await this.processStructuredData(fallbackText);
          return {
            text: fallbackText,
            numPages: 1,
            metadata: { extraction_method: 'fallback_final' },
            structuredData
          };
        }
      } catch (fallbackError) {
        console.error('❌ Erro no fallback final:', fallbackError);
      }
      
      throw new Error(`Não foi possível extrair texto do PDF: ${error.message}`);
    }
  }

  private extractTextFromBytes(pdfBytes: Uint8Array): string {
    try {
      console.log('🔍 Extraindo texto diretamente dos bytes...');
      const text = new TextDecoder('utf-8', { fatal: false }).decode(pdfBytes);
      
      // Procurar por padrões de texto em PDFs
      const textMatches = text.match(/\(([^)]+)\)/g) || [];
      const extractedTexts = textMatches
        .map(match => match.slice(1, -1))
        .filter(text => text.length > 2 && /[a-zA-Z0-9]/.test(text))
        .join(' ');
      
      if (extractedTexts.length > 100) {
        console.log(`✅ Texto extraído dos bytes: ${extractedTexts.length} caracteres`);
        return extractedTexts;
      }
      
      // Fallback: procurar strings legíveis
      const readableText = text.replace(/[^\x20-\x7E\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
        .join(' ');
        
      console.log(`✅ Texto legível extraído: ${readableText.length} caracteres`);
      return readableText;
    } catch (error) {
      console.error('❌ Erro na extração de bytes:', error);
      return '';
    }
  }

  private estimatePageCount(text: string): number {
    // Estima número de páginas baseado no tamanho do texto
    const avgCharsPerPage = 2000;
    return Math.max(1, Math.ceil(text.length / avgCharsPerPage));
  }

  private async processStructuredData(text: string): Promise<any> {
    console.log('🔍 Processando dados estruturados...');
    
    const structuredData = {
      dates: this.extractDates(text),
      values: this.extractValues(text),
      contacts: this.extractContacts(text),
      sections: this.extractSections(text),
      keyPhrases: this.extractKeyPhrases(text)
    };

    console.log('✅ Dados estruturados processados');
    return structuredData;
  }

  private extractDates(text: string): string[] {
    const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b/gi;
    return [...new Set(text.match(dateRegex) || [])].slice(0, 10);
  }

  private extractValues(text: string): string[] {
    const valueRegex = /R\$\s*[\d\.,]+|\$\s*[\d\.,]+|[\d\.,]+\s*reais/gi;
    return [...new Set(text.match(valueRegex) || [])].slice(0, 10);
  }

  private extractContacts(text: string): any {
    return {
      emails: [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].slice(0, 10),
      phones: [...new Set(text.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g) || [])].slice(0, 10),
      cnpjs: [...new Set(text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [])].slice(0, 10)
    };
  }

  private extractSections(text: string): any[] {
    const sections = [];
    const lines = text.split('\n').slice(0, 50);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      
      if (line.length > 10 && line.length < 200) {
        sections.push({
          title: line,
          content: '',
          startLine: i,
          endLine: i
        });
      }
      
      if (sections.length > 20) break;
    }
    
    return sections;
  }

  private extractKeyPhrases(text: string): string[] {
    const keywords = [
      'manutenção', 'gerador', 'equipamento', 'contrato', 'serviço',
      'preventiva', 'corretiva', 'emergência', 'valor', 'prazo',
      'responsabilidade', 'garantia', 'instalação', 'reparo'
    ];
    
    const phrases = [];
    const sentences = text.split(/[.!?]/).slice(0, 50);
    
    for (const sentence of sentences) {
      for (const keyword of keywords) {
        if (sentence.toLowerCase().includes(keyword)) {
          phrases.push(sentence.trim());
          break;
        }
      }
    }
    
    return phrases.slice(0, 15);
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  async analyzeWithAI(text: string, structuredData: any = null): Promise<any> {
    console.log('🤖 Iniciando análise com IA...');
    
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API Key não configurada');
    }

    const maxChars = 12000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;

    const structuredInfo = structuredData ? `
DADOS ESTRUTURADOS ENCONTRADOS:
- Datas detectadas: ${structuredData.dates?.join(', ') || 'nenhuma'}
- Valores detectados: ${structuredData.values?.join(', ') || 'nenhum'}
- Emails encontrados: ${structuredData.contacts?.emails?.join(', ') || 'nenhum'}
- Telefones encontrados: ${structuredData.contacts?.phones?.join(', ') || 'nenhum'}
- CNPJs encontrados: ${structuredData.contacts?.cnpjs?.join(', ') || 'nenhum'}
` : '';

    const prompt = `Analise este documento de contrato da Luminos e extraia as informações estruturadas com precisão.

IMPORTANTE: Responda APENAS com um JSON válido, sem texto adicional.

INSTRUÇÕES:
- Extraia apenas dados reais presentes no documento
- Para campos não encontrados, use string vazia "" para texto e 0 para números
- Datas devem estar no formato YYYY-MM-DD ou string vazia
- Valores devem ser números (sem símbolos)
- Para confiabilidade, avalie a clareza dos dados extraídos

TEXTO DO DOCUMENTO:
${truncatedText}

${structuredInfo}

Retorne APENAS um JSON com esta estrutura exata:
{
  "cliente": {
    "nome": "string",
    "cnpj": "string", 
    "contato": "string",
    "endereco": "string",
    "telefone": "string",
    "email": "string"
  },
  "contrato": {
    "numero": "string",
    "tipo": "manutencao|locacao|hibrido",
    "valor_mensal": number,
    "valor_total": number,
    "data_inicio": "YYYY-MM-DD",
    "data_fim": "YYYY-MM-DD",
    "status": "string"
  },
  "equipamentos": [
    {
      "tipo": "string",
      "modelo": "string", 
      "quantidade": number,
      "localizacao": "string"
    }
  ],
  "servicos": [
    {
      "tipo": "string",
      "frequencia": "string",
      "descricao": "string"
    }
  ],
  "observacoes": "string",
  "confiabilidade": "alta|media|baixa"
}`;

    try {
      console.log('🔄 Enviando para OpenAI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { 
              role: 'system', 
              content: 'Você é um especialista em análise de documentos. JAMAIS invente dados. Extraia APENAS informações presentes no documento. Use "não informado" para campos não encontrados, EXCETO para o campo "resumo" que deve sempre conter uma descrição do documento analisado. Retorne apenas JSON válido.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro da API OpenAI:', error);
        throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('✅ Análise da IA concluída');
      
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/) || [cleanContent];
      
      if (jsonMatch[0]) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Garantir que o resumo sempre tenha conteúdo descritivo
        if (!parsedData.resumo || parsedData.resumo === "não informado" || parsedData.resumo.trim() === "") {
          const documentType = this.detectDocumentType(text);
          const extractedLength = text.length;
          const fieldsFound = this.countFoundFields(parsedData);
          
          parsedData.resumo = `Documento ${documentType} analisado com ${extractedLength} caracteres extraídos. Foram identificados ${fieldsFound} campos com informações válidas. ${this.getContentSummary(text, structuredData)}`;
        }
        
        parsedData.extraction_metadata = {
          text_length: text.length,
          structured_data_available: !!structuredData,
          extraction_date: new Date().toISOString(),
          extraction_method: 'pdf_co_with_ai'
        };
        
        return parsedData;
      } else {
        throw new Error('IA não retornou JSON válido');
      }
    } catch (error) {
      console.error('❌ Erro na análise IA:', error);
      throw error;
    }
  }

  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('contrato') || lowerText.includes('acordo')) {
      return 'contratual';
    } else if (lowerText.includes('especificação') || lowerText.includes('requisitos')) {
      return 'de especificação técnica';
    } else if (lowerText.includes('manual') || lowerText.includes('instruções')) {
      return 'manual ou instrucional';
    } else if (lowerText.includes('relatório') || lowerText.includes('análise')) {
      return 'de relatório';
    } else {
      return 'técnico';
    }
  }

  private countFoundFields(data: any): number {
    let count = 0;
    const fieldsToCheck = ['empresa', 'cnpj', 'contato', 'email', 'telefone', 'endereco', 'tipo_contrato', 'valor_mensal', 'valor_total', 'inicio_contrato', 'fim_contrato', 'frequencia_manutencao'];
    
    fieldsToCheck.forEach(field => {
      if (data[field] && data[field] !== "não informado" && data[field] !== "") {
        count++;
      }
    });
    
    if (data.servicos && Array.isArray(data.servicos) && data.servicos.length > 0) count++;
    if (data.equipamentos && Array.isArray(data.equipamentos) && data.equipamentos.length > 0) count++;
    
    return count;
  }

  private getContentSummary(text: string, structuredData: any): string {
    let summary = "";
    
    if (structuredData?.dates?.length > 0) {
      summary += `Foram encontradas ${structuredData.dates.length} datas relevantes. `;
    }
    
    if (structuredData?.values?.length > 0) {
      summary += `Identificados ${structuredData.values.length} valores monetários. `;
    }
    
    if (structuredData?.contacts?.emails?.length > 0 || structuredData?.contacts?.phones?.length > 0) {
      summary += "Informações de contato detectadas. ";
    }
    
    if (summary === "") {
      summary = "Conteúdo textual processado, mas informações estruturadas específicas não foram claramente identificadas.";
    }
    
    return summary.trim();
  }

  async saveAnalysis(contractId: string, analysis: any): Promise<void> {
    console.log('💾 Salvando análise no banco...');
    
    try {
      const { data, error } = await this.supabase
        .from('contract_analyses')
        .insert([
          {
            contract_id: contractId,
            extracted_data: analysis,
            analysis_type: 'contract_extraction',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('❌ Erro ao salvar análise:', error);
        throw error;
      }

      console.log('✅ Análise salva com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar análise:', error);
      // Não falha o processo se não conseguir salvar
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const requestBody = await req.json();
    
    // Input validation and sanitization
    const { contractId, filePath, fileName, fileType } = requestBody;
    
    // Validate required fields
    if (!contractId || typeof contractId !== 'string') {
      throw new Error('contractId é obrigatório e deve ser uma string');
    }
    
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath é obrigatório e deve ser uma string');
    }
    
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('fileName é obrigatório e deve ser uma string');
    }

    // Sanitize inputs
    const sanitizedContractId = contractId.replace(/[^a-zA-Z0-9\-_]/g, '');
    const sanitizedFilePath = filePath.replace(/[^a-zA-Z0-9\-_\/\.]/g, '');
    const sanitizedFileName = fileName.slice(0, 255);
    
    // Validate file type
    if (fileType && !fileType.includes('pdf')) {
      throw new Error('Apenas arquivos PDF são suportados');
    }

    // Validate path format
    if (!sanitizedFilePath.includes('/') || sanitizedFilePath.includes('..')) {
      throw new Error('Formato de caminho de arquivo inválido');
    }
    
    console.log('🚀 Iniciando extração de contrato:', { 
      contractId: sanitizedContractId, 
      fileName: sanitizedFileName, 
      fileType, 
      filePath: sanitizedFilePath 
    });

    const extractor = new ContractExtractor();
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📥 Baixando arquivo do storage:', filePath);
    const { data: fileData, error: fileError } = await supabase.storage
      .from('contract-documents')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('❌ Erro ao baixar arquivo:', fileError);
      throw new Error(`Erro ao baixar arquivo: ${fileError?.message || 'Arquivo não encontrado'}`);
    }

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    console.log(`📄 Arquivo carregado: ${pdfBytes.length} bytes`);

    const extractedResult = await extractor.extractTextFromPDF(pdfBytes);
    
    if (!extractedResult.text || extractedResult.text.length < 50) {
      throw new Error('Texto extraído insuficiente. Verifique se o PDF contém texto legível.');
    }

    const analysis = await extractor.analyzeWithAI(extractedResult.text, extractedResult.structuredData);

    await extractor.saveAnalysis(contractId, {
      ...analysis,
      pdfMetadata: {
        numPages: extractedResult.numPages,
        metadata: extractedResult.metadata,
        structuredData: extractedResult.structuredData
      }
    });

    console.log('✅ Extração concluída com sucesso');

    return new Response(JSON.stringify({
      success: true,
      message: 'Dados extraídos com sucesso',
      data: analysis,
      extractedTextLength: extractedResult.text.length,
      numPages: extractedResult.numPages,
      structuredData: extractedResult.structuredData,
      fileName: fileName,
      extractionMethod: extractedResult.metadata.extraction_method
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na extração:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
