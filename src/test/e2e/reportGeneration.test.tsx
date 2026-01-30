import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dos hooks de relatório
const mockUseReportGeneration = vi.fn(() => ({
  generateReport: vi.fn().mockResolvedValue({
    id: 'report-1',
    title: 'Relatório Mensal',
    content: 'Conteúdo do relatório',
    aiAnalysis: {
      summary: 'Resumo gerado por IA',
      insights: ['Insight 1', 'Insight 2'],
      recommendations: ['Recomendação 1', 'Recomendação 2'],
    },
  }),
  isGenerating: false,
  error: null,
}));

const mockUseAIAnalysis = vi.fn(() => ({
  analyzeData: vi.fn().mockResolvedValue({
    summary: 'Análise completa dos dados',
    patterns: ['Padrão identificado 1', 'Padrão identificado 2'],
    predictions: ['Previsão 1', 'Previsão 2'],
    confidence: 0.95,
  }),
  isAnalyzing: false,
  analysisResult: null,
}));

const mockUseDocumentIntelligence = vi.fn(() => ({
  analyzeDocumentWithAI: vi.fn().mockResolvedValue({
    success: true,
    extractedText: 'Texto extraído do documento',
    analysis: {
      summary: 'Resumo do documento',
      keyPoints: ['Ponto 1', 'Ponto 2'],
      entities: ['Entidade 1', 'Entidade 2'],
    },
  }),
  extractTextFromPDF: vi.fn().mockResolvedValue({
    success: true,
    text: 'Conteúdo do PDF extraído',
    metadata: {
      pages: 10,
      author: 'Autor Teste',
      title: 'Documento Teste',
    },
  }),
  isAnalyzing: false,
  retryCount: 0,
}));

vi.mock('@/hooks/useReportGeneration', () => ({
  useReportGeneration: mockUseReportGeneration,
}));

vi.mock('@/hooks/useAIAnalysis', () => ({
  useAIAnalysis: mockUseAIAnalysis,
}));

vi.mock('@/hooks/useDocumentIntelligence', () => ({
  useDocumentIntelligence: mockUseDocumentIntelligence,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Report Generation and AI Analysis E2E Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a monthly report with AI insights', async () => {
    const ReportGenerator = () => {
      const { generateReport } = mockUseReportGeneration();
      const [report, setReport] = React.useState<unknown>(null);

      const handleGenerateReport = async () => {
        const result = await generateReport({
          type: 'monthly',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          includeAI: true,
        });
        setReport(result);
      };

      return (
        <div>
          <button onClick={handleGenerateReport}>
            Gerar Relatório Mensal
          </button>
          {report && (
            <div data-testid="report-content">
              <h2>{report.title}</h2>
              <div data-testid="ai-summary">{report.aiAnalysis?.summary}</div>
              <div data-testid="ai-insights">
                {report.aiAnalysis?.insights.map((insight: string, idx: number) => (
                  <p key={idx}>{insight}</p>
                ))}
              </div>
              <div data-testid="ai-recommendations">
                {report.aiAnalysis?.recommendations.map((rec: string, idx: number) => (
                  <p key={idx}>{rec}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<ReportGenerator />);

    const generateButton = screen.getByRole('button', { name: /gerar relatório mensal/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByTestId('report-content')).toBeInTheDocument();
      expect(screen.getByText('Relatório Mensal')).toBeInTheDocument();
    });

    // Verificar análise de IA
    expect(screen.getByTestId('ai-summary')).toHaveTextContent('Resumo gerado por IA');
    expect(screen.getByTestId('ai-insights')).toHaveTextContent('Insight 1');
    expect(screen.getByTestId('ai-recommendations')).toHaveTextContent('Recomendação 1');
  });

  it('should analyze maintenance data with AI', async () => {
    const AIDataAnalyzer = () => {
      const { analyzeData } = mockUseAIAnalysis();
      const [analysis, setAnalysis] = React.useState<unknown>(null);

      const maintenanceData = [
        { id: '1', type: 'preventive', status: 'completed', duration: 2 },
        { id: '2', type: 'corrective', status: 'pending', duration: 4 },
        { id: '3', type: 'preventive', status: 'completed', duration: 3 },
      ];

      const handleAnalyze = async () => {
        const result = await analyzeData(maintenanceData, {
          analysisType: 'maintenance_patterns',
          depth: 'detailed',
        });
        setAnalysis(result);
      };

      return (
        <div>
          <button onClick={handleAnalyze}>
            Analisar Dados de Manutenção
          </button>
          {analysis && (
            <div data-testid="analysis-result">
              <h3>Análise Completa</h3>
              <p data-testid="analysis-summary">{analysis.summary}</p>
              <div data-testid="patterns">
                {analysis.patterns.map((pattern: string, idx: number) => (
                  <p key={idx}>{pattern}</p>
                ))}
              </div>
              <div data-testid="confidence">
                Confiança: {(analysis.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<AIDataAnalyzer />);

    const analyzeButton = screen.getByRole('button', { name: /analisar dados de manutenção/i });
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByTestId('analysis-result')).toBeInTheDocument();
    });

    expect(screen.getByTestId('analysis-summary')).toHaveTextContent('Análise completa dos dados');
    expect(screen.getByTestId('patterns')).toHaveTextContent('Padrão identificado 1');
    expect(screen.getByTestId('confidence')).toHaveTextContent('95%');
  });

  it('should extract and analyze PDF documents with AI', async () => {
    const PDFAnalyzer = () => {
      const { analyzeDocumentWithAI, extractTextFromPDF } = mockUseDocumentIntelligence();
      const [analysis, setAnalysis] = React.useState<unknown>(null);
      const [extractedText, setExtractedText] = React.useState<string>('');

      const handlePDFAnalysis = async (file: File) => {
        // Primeiro extrair texto
        const extractionResult = await extractTextFromPDF(file);

        if (extractionResult.success) {
          setExtractedText(extractionResult.text);

          // Depois analisar com IA
          const analysisResult = await analyzeDocumentWithAI(
            extractionResult.text,
            'Analise este contrato e identifique cláusulas importantes'
          );

          setAnalysis(analysisResult);
        }
      };

      return (
        <div>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePDFAnalysis(file);
            }}
            data-testid="pdf-input"
          />
          {extractedText && (
            <div data-testid="extracted-text">
              Texto extraído: {extractedText.substring(0, 100)}...
            </div>
          )}
          {analysis?.success && (
            <div data-testid="pdf-analysis">
              <h3>Análise do Documento</h3>
              <p data-testid="doc-summary">{analysis.analysis.summary}</p>
              <div data-testid="key-points">
                {analysis.analysis.keyPoints.map((point: string, idx: number) => (
                  <li key={idx}>{point}</li>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<PDFAnalyzer />);

    // Simular upload de arquivo
    const file = new File(['conteúdo do PDF'], 'contrato.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('pdf-input');

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('extracted-text')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-analysis')).toBeInTheDocument();
    });

    expect(screen.getByTestId('doc-summary')).toHaveTextContent('Resumo do documento');
    expect(screen.getByTestId('key-points')).toHaveTextContent('Ponto 1');
  });

  it('should generate comparative analysis report', async () => {
    const ComparativeAnalysis = () => {
      const { generateReport } = mockUseReportGeneration();
      const { analyzeData } = mockUseAIAnalysis();
      const [comparison, setComparison] = React.useState<unknown>(null);

      const handleComparativeAnalysis = async () => {
        // Dados de dois períodos
        const period1Data = {
          period: '2024-Q1',
          maintenances: 45,
          avgDuration: 2.5,
          completionRate: 0.92,
        };

        const period2Data = {
          period: '2024-Q2',
          maintenances: 52,
          avgDuration: 2.2,
          completionRate: 0.95,
        };

        // Analisar comparativamente
        const analysis = await analyzeData([period1Data, period2Data], {
          analysisType: 'comparative',
          metrics: ['efficiency', 'performance', 'trends'],
        });

        // Gerar relatório com a análise
        const report = await generateReport({
          type: 'comparative',
          data: [period1Data, period2Data],
          aiAnalysis: analysis,
        });

        setComparison(report);
      };

      return (
        <div>
          <button onClick={handleComparativeAnalysis}>
            Gerar Análise Comparativa
          </button>
          {comparison && (
            <div data-testid="comparative-report">
              <h3>Análise Comparativa Q1 vs Q2</h3>
              <div data-testid="metrics-comparison">
                <p>Manutenções: Q1 (45) → Q2 (52)</p>
                <p>Melhoria na eficiência: +15.6%</p>
                <p>Taxa de conclusão: +3.3%</p>
              </div>
              <div data-testid="ai-insights">
                {comparison.aiAnalysis?.summary}
              </div>
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<ComparativeAnalysis />);

    const button = screen.getByRole('button', { name: /gerar análise comparativa/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('comparative-report')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metrics-comparison')).toHaveTextContent('Melhoria na eficiência');
    expect(screen.getByTestId('ai-insights')).toHaveTextContent('Análise completa dos dados');
  });

  it('should handle AI analysis errors gracefully', async () => {
    const AIAnalysisWithError = () => {
      const [error, setError] = React.useState<string>('');

      const handleAnalysisWithError = async () => {
        try {
          // Simular erro na análise
          throw new Error('Erro na API de IA');
        } catch (err) {
          setError('Não foi possível completar a análise. Tente novamente.');
        }
      };

      return (
        <div>
          <button onClick={handleAnalysisWithError}>
            Tentar Análise com Erro
          </button>
          {error && (
            <div role="alert" data-testid="error-message">
              {error}
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<AIAnalysisWithError />);

    const button = screen.getByRole('button', { name: /tentar análise com erro/i });
    await user.click(button);

    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Não foi possível completar a análise'
    );
  });

  it('should export AI-generated reports in multiple formats', async () => {
    const ReportExporter = () => {
      const { generateReport } = mockUseReportGeneration();
      const [exportStatus, setExportStatus] = React.useState<string>('');

      const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
        const report = await generateReport({
          type: 'monthly',
          includeAI: true,
        });

        // Simular exportação
        const exportData = {
          pdf: () => new Blob([report.content], { type: 'application/pdf' }),
          csv: () => new Blob([report.content], { type: 'text/csv' }),
          json: () => new Blob([JSON.stringify(report)], { type: 'application/json' }),
        };

        const blob = exportData[format]();
        const url = URL.createObjectURL(blob);

        // Simular download
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio.${format}`;

        setExportStatus(`Relatório exportado em ${format.toUpperCase()}`);
        URL.revokeObjectURL(url);
      };

      return (
        <div>
          <button onClick={() => handleExport('pdf')}>
            Exportar PDF
          </button>
          <button onClick={() => handleExport('csv')}>
            Exportar CSV
          </button>
          <button onClick={() => handleExport('json')}>
            Exportar JSON
          </button>
          {exportStatus && (
            <div data-testid="export-status">{exportStatus}</div>
          )}
        </div>
      );
    };

    renderWithProviders(<ReportExporter />);

    // Testar exportação PDF
    const pdfButton = screen.getByRole('button', { name: /exportar pdf/i });
    await user.click(pdfButton);

    await waitFor(() => {
      expect(screen.getByTestId('export-status')).toHaveTextContent('Relatório exportado em PDF');
    });

    // Testar exportação CSV
    const csvButton = screen.getByRole('button', { name: /exportar csv/i });
    await user.click(csvButton);

    await waitFor(() => {
      expect(screen.getByTestId('export-status')).toHaveTextContent('Relatório exportado em CSV');
    });
  });
});