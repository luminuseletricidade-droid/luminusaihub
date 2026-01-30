import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest, createJsonResponse, createErrorResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import pdf from 'https://esm.sh/pdf-parse@1.1.1'


const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

class DocumentProcessor {
  private supabase: any;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async processDocument(file: File): Promise<any> {
    console.log('🔄 Processando documento:', file.name);
    
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    
    // Usa pdf-parse para extrair texto
    const pdfData = await pdf(fileBytes, {
      max: 0,
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    });

    console.log(`📄 Documento processado: ${pdfData.numpages} páginas`);

    // Extrai informações estruturadas
    const structuredData = {
      text: pdfData.text,
      numPages: pdfData.numpages,
      metadata: pdfData.metadata,
      analysis: this.analyzeDocumentContent(pdfData.text)
    };

    return structuredData;
  }

  private analyzeDocumentContent(text: string): any {
    console.log('🔍 Analisando conteúdo do documento...');
    
    return {
      // Detecta tipo de documento
      documentType: this.detectDocumentType(text),
      
      // Extrai dados estruturados
      extractedData: {
        dates: this.extractDates(text),
        values: this.extractValues(text),
        contacts: this.extractContacts(text),
        companies: this.extractCompanies(text),
        contracts: this.extractContractInfo(text),
        equipment: this.extractEquipment(text)
      },
      
      // Análise de qualidade
      quality: this.assessDocumentQuality(text),
      
      // Resumo automático
      summary: this.generateSummary(text),
      
      // Palavras-chave
      keywords: this.extractKeywords(text)
    };
  }

  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('contrato') && lowerText.includes('manutenção')) {
      return 'contrato_manutencao';
    } else if (lowerText.includes('contrato') && lowerText.includes('locação')) {
      return 'contrato_locacao';
    } else if (lowerText.includes('orçamento') || lowerText.includes('proposta')) {
      return 'orcamento';
    } else if (lowerText.includes('relatório') || lowerText.includes('relatorio')) {
      return 'relatorio';
    } else if (lowerText.includes('manual') || lowerText.includes('instrução')) {
      return 'manual';
    } else {
      return 'documento_generico';
    }
  }

  private extractDates(text: string): string[] {
    const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b/gi;
    return [...new Set(text.match(dateRegex) || [])];
  }

  private extractValues(text: string): string[] {
    const valueRegex = /R\$\s*[\d\.,]+|\$\s*[\d\.,]+|[\d\.,]+\s*reais/gi;
    return [...new Set(text.match(valueRegex) || [])];
  }

  private extractContacts(text: string): any {
    return {
      emails: [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])],
      phones: [...new Set(text.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g) || [])],
      cnpjs: [...new Set(text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [])]
    };
  }

  private extractCompanies(text: string): string[] {
    // Procura por padrões de nomes de empresas
    const companyPatterns = [
      /\b[A-Z][a-zA-Z\s]+(?:LTDA|S\.A\.|S\/A|EIRELI|ME|EPP)\b/gi,
      /\b[A-Z][a-zA-Z\s]+(?:Ltda|S.A.|S\/A|Eireli|ME|EPP)\b/gi
    ];
    
    const companies = [];
    for (const pattern of companyPatterns) {
      const matches = text.match(pattern) || [];
      companies.push(...matches);
    }
    
    return [...new Set(companies)];
  }

  private extractContractInfo(text: string): any {
    const lowerText = text.toLowerCase();
    
    return {
      hasContractNumber: /contrato\s*n[oº°]?\s*[\d\-\/]+/i.test(text),
      hasValidityPeriod: /validade|vigência|prazo/i.test(text),
      hasPaymentTerms: /pagamento|parcela|mensal|anual/i.test(text),
      hasServices: /serviços|manutenção|instalação|reparo/i.test(text),
      hasEquipment: /gerador|equipamento|máquina|motor/i.test(text)
    };
  }

  private extractEquipment(text: string): string[] {
    const equipmentKeywords = [
      'gerador', 'generator', 'motor', 'engine', 'equipamento', 'máquina',
      'transformador', 'painel', 'controlador', 'sistema', 'unidade'
    ];
    
    const equipment = [];
    const sentences = text.split(/[.!?]/);
    
    for (const sentence of sentences) {
      for (const keyword of equipmentKeywords) {
        if (sentence.toLowerCase().includes(keyword)) {
          equipment.push(sentence.trim());
          break;
        }
      }
    }
    
    return equipment.slice(0, 10);
  }

  private assessDocumentQuality(text: string): any {
    const textLength = text.length;
    const wordCount = text.split(/\s+/).length;
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
    
    return {
      score: this.calculateQualityScore(textLength, wordCount, uniqueWords),
      textLength,
      wordCount,
      uniqueWords,
      readability: textLength > 1000 ? 'boa' : 'limitada',
      completeness: wordCount > 200 ? 'completo' : 'parcial'
    };
  }

  private calculateQualityScore(textLength: number, wordCount: number, uniqueWords: number): number {
    let score = 0;
    
    // Pontuação por comprimento
    if (textLength > 5000) score += 30;
    else if (textLength > 1000) score += 20;
    else if (textLength > 500) score += 10;
    
    // Pontuação por diversidade de palavras
    const diversity = uniqueWords / wordCount;
    if (diversity > 0.7) score += 25;
    else if (diversity > 0.5) score += 15;
    else if (diversity > 0.3) score += 10;
    
    // Pontuação por estrutura
    if (wordCount > 500) score += 20;
    else if (wordCount > 200) score += 15;
    else if (wordCount > 100) score += 10;
    
    // Pontuação adicional por conteúdo relevante
    score += 25; // Base score
    
    return Math.min(score, 100);
  }

  private generateSummary(text: string): string {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);
    
    // Pega as 3 primeiras sentenças significativas
    const summary = sentences.slice(0, 3).join('. ').trim();
    
    return summary || 'Documento sem resumo disponível';
  }

  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'por',
      'que', 'se', 'não', 'na', 'no', 'são', 'dos', 'das', 'ao', 'aos', 'à',
      'às', 'pelo', 'pela', 'pelos', 'pelas', 'este', 'esta', 'estes', 'estas',
      'seu', 'sua', 'seus', 'suas', 'como', 'mais', 'mas', 'muito', 'bem',
      'foi', 'ser', 'tem', 'ter', 'ou', 'também', 'já', 'ainda', 'quando',
      'onde', 'porque', 'assim', 'até', 'sobre', 'após', 'antes', 'durante'
    ]);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }

    console.log('🚀 Processando arquivo:', file.name);

    const processor = new DocumentProcessor();
    const result = await processor.processDocument(file);

    console.log('✅ Processamento concluído');

    return new Response(JSON.stringify({
      success: true,
      message: 'Documento processado com sucesso',
      data: result,
      fileName: file.name,
      fileSize: file.size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
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