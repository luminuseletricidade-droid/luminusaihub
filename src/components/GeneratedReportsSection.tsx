import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Search, 
  Brain, 
  Download, 
  Eye, 
  Trash2,
  FileText,
  Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReportViewer from './ReportViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImprovedCharts } from './ImprovedCharts';

interface GeneratedReport {
  id: string;
  title: string;
  description: string;
  content: unknown;
  type: 'standard' | 'ai_generated';
  created_at: string;
  data: unknown;
  charts: unknown[];
  prompt?: string;
  period?: { startDate: string; endDate: string };
}

interface GeneratedReportsProps {
  externalReports?: GeneratedReport[];
}

// Função helper para processar conteúdo HTML e converter em Markdown renderizável
const processHTMLContent = (content: string): React.ReactNode => {
  if (!content || typeof content !== 'string') return null;

  // Converter HTML para Markdown para renderização adequada com ReactMarkdown
  const convertHTMLToMarkdown = (html: string): string => {
    let markdown = html
      // Headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      // Lists
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Paragraphs and breaks
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Links
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '');

    // Limpa espaços extras mantendo estrutura markdown
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Se o conteúdo tem tags HTML, converte para Markdown e renderiza com ReactMarkdown
  if (content.includes('<h') || content.includes('<ul>') || content.includes('<p>') || content.includes('<strong>')) {
    const markdownContent = convertHTMLToMarkdown(content);

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
            h2: ({children}) => <h2 className="text-xl font-bold mb-3 text-foreground">{children}</h2>,
            h3: ({children}) => <h3 className="text-lg font-semibold mb-2 text-foreground">{children}</h3>,
            h4: ({children}) => <h4 className="text-base font-semibold mb-2 text-foreground">{children}</h4>,
            p: ({children}) => <p className="text-sm mb-3 text-muted-foreground leading-relaxed">{children}</p>,
            ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-muted-foreground">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-muted-foreground">{children}</ol>,
            li: ({children}) => <li className="ml-2">{children}</li>,
            strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
            code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    );
  }

  // Se não tem HTML, retorna o texto renderizado com ReactMarkdown
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

const GeneratedReportsSection = ({ externalReports = [] }: GeneratedReportsProps) => {
  const { toast } = useToast();
  const { session, user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title'>('date_desc');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'ai_generated'>('all');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'free' | 'guided'>('free');


  // Carregar relatórios salvos do Supabase
  useEffect(() => {
    // Only load reports when we have a valid user from AuthContext
    if (user?.id && !authLoading) {
      console.log('✅ [Reports] AuthContext pronto, carregando relatórios...');
      console.log('📋 User disponível:', user);
      loadSavedReports();
    } else if (!authLoading && !user) {
      console.log('⚠️ [Reports] Nenhum usuário encontrado no AuthContext');
    }
  }, [user, authLoading]);

  // Combinar relatórios externos com os salvos
  useEffect(() => {
    if (externalReports.length > 0) {
      setReports(prev => {
        // Manter relatórios existentes e adicionar novos (não substituir)
        const existingIds = prev.map(r => r.id);
        const newReports = externalReports.filter(er => !existingIds.includes(er.id));
        return [...prev, ...newReports];
      });
    }
  }, [externalReports]);

  const loadSavedReports = useCallback(async () => {
    try {
      // Use AuthContext user - it's already validated
      if (!user?.id) {
        console.log('⏳ [Reports] Aguardando usuário via AuthContext...');
        console.log('User state:', user);
        return;
      }

      console.log('✅ [Reports] Usuário válido via AuthContext');
      console.log('📋 User object:', user);

      // Usar o user do AuthContext diretamente
      const userId = user.id;
      
      console.log('👤 Buscando relatórios para usuário:', userId);

      const { data: savedReports, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReports: GeneratedReport[] = savedReports?.map(report => ({
        id: report.id,
        title: report.title,
        description: report.description,
        content: report.content,
        type: report.report_type as 'standard' | 'ai_generated',
        created_at: report.created_at,
        data: report.data as unknown,
        charts: Array.isArray(report.charts) ? report.charts : [],
        prompt: report.prompt || undefined,
        period: report.period_start && report.period_end ? {
          startDate: report.period_start,
          endDate: report.period_end
        } : undefined
      })) || [];

      setReports(formattedReports);
    } catch (error) {
      console.error('Erro ao carregar relatórios salvos:', error);
    }
  }, [user]);

  const deleteReport = async (reportId: string) => {
    try {
      // Deletar do Supabase se for um UUID válido
      if (reportId.length > 20) { // UUIDs do Supabase são maiores que IDs temporários
        const { error } = await supabase
          .from('generated_reports')
          .delete()
          .eq('id', reportId);
        
        if (error) throw error;
      }

      // Remover do estado local
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao deletar relatório:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o relatório",
        variant: "destructive"
      });
    }
  };

  const generateAIReport = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt necessário",
        description: "Por favor, insira um prompt para gerar o relatório",
        variant: "destructive"
      });
      return;
    }

    setGeneratingAI(true);

    try {
      // Verificar usuário autenticado usando AuthContext
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Usuário atual (IA):', user.id);

      // Buscar contratos do usuário autenticado (sem embed para evitar conflito)
      const { data: allContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id);

      if (contractsError) {
        console.error('Erro de contratos:', contractsError);
        throw new Error(`Erro ao buscar contratos: ${contractsError.message}`);
      }

      // Buscar manutenções dos contratos do usuário
      const contractIds = allContracts?.map(c => c.id) || [];
      let allMaintenances: unknown[] = [];
      
      if (contractIds.length > 0) {
        const { data: maintenanceData, error: maintenancesError } = await supabase
          .from('maintenances')
          .select('*')
          .in('contract_id', contractIds);
          
        if (maintenancesError) {
          console.error('Erro ao buscar manutenções:', maintenancesError);
        } else {
          allMaintenances = maintenanceData || [];
        }
      }

      console.log('Manutenções encontradas (IA):', allMaintenances);

      // Buscar clientes do usuário
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      if (clientsError) {
        console.error('Erro ao buscar clientes:', clientsError);
      }

      console.log('Clientes encontrados (IA):', allClients);

      // Chamar a função Edge de IA com o novo prompt profissional
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-ai-reports', {
        body: {
          userPrompt: aiPrompt,
          contractsData: allContracts,
          maintenancesData: allMaintenances,
          clientsData: allClients || [],
          startDate: startDate || '',
          endDate: endDate || ''
        }
      });

      if (aiError) {
        throw new Error(`Erro na IA: ${aiError.message}`);
      }

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'Erro desconhecido na geração do relatório');
      }

      // Extrair conteúdo real da resposta, removendo metadados
      let reportContent = aiResponse.content;

      // Se a resposta é um objeto com metadados, extrair apenas o conteúdo textual
      if (typeof reportContent === 'object' && reportContent !== null) {
        // Procurar por campos de conteúdo comum: content, text, summary, analysis, report
        reportContent = reportContent.content ||
                       reportContent.text ||
                       reportContent.summary ||
                       reportContent.analysis ||
                       reportContent.report ||
                       JSON.stringify(reportContent, null, 2); // Fallback para JSON formatado
      }

      // Se é string mas parece JSON, tentar fazer parse e extrair conteúdo
      if (typeof reportContent === 'string' && reportContent.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(reportContent);
          // Extrair conteúdo real, ignorando metadados como ai_model, ai_provider, etc
          reportContent = parsed.content ||
                         parsed.text ||
                         parsed.summary ||
                         parsed.analysis ||
                         parsed.report ||
                         reportContent; // Se não encontrar, manter original
        } catch (e) {
          // Não é JSON válido, manter como está
        }
      }

      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        title: `Relatório IA - ${aiPrompt.substring(0, 40)}...`,
        description: `Relatório gerado por IA baseado no prompt: "${aiPrompt}" com dados reais do sistema`,
        content: reportContent, // Usar o conteúdo extraído e limpo
        type: 'ai_generated',
        created_at: new Date().toISOString(),
        prompt: aiPrompt,
        data: {
          contractsAnalyzed: allContracts?.length || 0,
          maintenancesReviewed: allMaintenances?.length || 0,
          totalRevenue: allContracts?.reduce((sum, c) => sum + (Number(c.value) || 0), 0) || 0,
          insights: ['Análise baseada em dados reais', 'Processamento por IA', 'Relatório personalizado']
        },
        charts: [
          {
            type: 'bar',
            title: 'Contratos por Status',
            data: [
              { 
                status: 'Ativos', 
                count: allContracts?.filter(c => c.status === 'active').length || 0 
              },
              { 
                status: 'Inativos', 
                count: allContracts?.filter(c => c.status !== 'active').length || 0 
              }
            ]
          },
          {
            type: 'pie',
            title: 'Distribuição por Tipo',
            data: [
              { 
                name: 'Manutenção', 
                value: allContracts?.filter(c => c.contract_type === 'maintenance').length || 0 
              },
              { 
                name: 'Locação', 
                value: allContracts?.filter(c => c.contract_type === 'rental').length || 0 
              }
            ]
          }
        ],
        period: startDate && endDate ? { startDate, endDate } : undefined
      };

      // Salvar no Supabase
      if (user) {
        const { data: savedReport, error } = await supabase
          .from('generated_reports')
          .insert({
            title: newReport.title,
            description: newReport.description,
            content: newReport.content,
            report_type: 'ai_generated',
            data: newReport.data,
            charts: newReport.charts,
            prompt: newReport.prompt,
            period_start: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
            period_end: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
            user_id: user.id
          })
          .select()
          .single();

        if (!error && savedReport) {
          // Usar o ID do Supabase
          newReport.id = savedReport.id;
        }
      }

      setReports(prev => [newReport, ...prev]);
      setAiPrompt('');
      setStartDate('');
      setEndDate('');
      setShowAIGenerator(false);

      toast({
        title: "Relatório gerado com sucesso!",
        description: "O relatório foi gerado pela IA com dados reais do sistema"
      });
    } catch (error) {
      console.error('Erro ao gerar relatório com IA:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório com IA",
        variant: "destructive"
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const renderAnalyticalText = (report: GeneratedReport) => {
    if (!report.data) return null;

    const data = report.data;
    
    // Análise baseada no tipo de relatório
    if (report.title.includes('Performance de Manutenção') || data.totalMaintenances !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Resumo Executivo:</strong> Foram analisadas {data.totalMaintenances || 0} manutenções no período, 
            sendo {data.preventivas || 0} preventivas ({data.totalMaintenances > 0 ? Math.round((data.preventivas / data.totalMaintenances) * 100) : 0}%) 
            e {data.corretivas || 0} corretivas ({data.totalMaintenances > 0 ? Math.round((data.corretivas / data.totalMaintenances) * 100) : 0}%).
          </p>
          <p>
            <strong>Eficiência Operacional:</strong> A taxa de conclusão das manutenções é de {data.eficiencia || 0}%, 
            com {data.concluidas || 0} manutenções concluídas de um total de {data.totalMaintenances || 0} programadas.
            {data.atrasadas > 0 && ` Há ${data.atrasadas} manutenções em atraso que requerem atenção imediata.`}
          </p>
          <p>
            <strong>Recomendações:</strong> 
            {data.preventivas > data.corretivas 
              ? " A estratégia preventiva está funcionando bem. Continue priorizando manutenções preventivas para reduzir custos." 
              : " Recomenda-se aumentar a frequência de manutenções preventivas para reduzir a incidência de manutenções corretivas."
            }
          </p>
        </div>
      );
    }

    if (report.title.includes('Receita de Contratos') || data.totalRevenue !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Performance Financeira:</strong> A receita total dos contratos é de R$ {(data.totalRevenue || 0).toLocaleString('pt-BR')}, 
            distribuída entre {data.totalContracts || 0} contratos, com receita média de R$ {(data.avgRevenue || 0).toLocaleString('pt-BR')} por contrato.
          </p>
          <p>
            <strong>Composição da Carteira:</strong> {data.activeContracts || 0} contratos estão ativos 
            ({data.totalContracts > 0 ? Math.round((data.activeContracts / data.totalContracts) * 100) : 0}%), 
            sendo {data.maintenanceContracts || 0} de manutenção e {data.rentalContracts || 0} de locação.
          </p>
          <p>
            <strong>Insights Estratégicos:</strong> 
            {data.maintenanceContracts > data.rentalContracts 
              ? " O foco em contratos de manutenção demonstra uma base estável de receita recorrente." 
              : " A predominância de contratos de locação indica potencial de crescimento em serviços de valor agregado."
            }
          </p>
        </div>
      );
    }

    if (report.title.includes('Preventiva vs Corretiva') || data.economia !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Análise de Custos:</strong> Foram realizadas {data.preventivas || 0} manutenções preventivas 
            (custo total: R$ {(data.custoPreventiva || 0).toLocaleString('pt-BR')}) e {data.corretivas || 0} manutenções corretivas 
            (custo total: R$ {(data.custoCorretiva || 0).toLocaleString('pt-BR')}).
          </p>
          <p>
            <strong>Economia Realizada:</strong> A estratégia preventiva resultou em uma economia de R$ {(data.economia || 0).toLocaleString('pt-BR')} 
            comparado ao custo total de manutenções corretivas. A redução de falhas foi de {data.reducaoFalhas || 0}%.
          </p>
          <p>
            <strong>Impacto Operacional:</strong> A eficiência operacional atingiu {data.eficienciaOperacional || 'N/A'}, 
            com tempo total de inatividade de {data.tempoInatividade || 'N/A'}.
          </p>
        </div>
      );
    }

    if (report.title.includes('Disponibilidade') || data.averageUptime !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Indicadores de Disponibilidade:</strong> A disponibilidade média dos equipamentos é de {data.disponibilidade || 'N/A'}, 
            baseada em {data.totalEquipments || 0} equipamentos com {data.horasOperacao || 0} horas totais de operação.
          </p>
          <p>
            <strong>Confiabilidade do Sistema:</strong> Foram registradas {data.falhas || 0} falhas no período, 
            resultando em MTBF (Mean Time Between Failures) de {data.mtbf || 0} horas e MTTR (Mean Time To Repair) de {data.mttr || 'N/A'}.
          </p>
          <p>
            <strong>Performance:</strong> A confiabilidade geral do sistema atinge {data.confiabilidade || 'N/A'}, 
            demonstrando {data.averageUptime >= 95 ? 'excelente' : data.averageUptime >= 90 ? 'boa' : 'regular'} performance operacional.
          </p>
        </div>
      );
    }

    if (report.title.includes('Satisfação') || data.satisfactionScore !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Índice de Satisfação:</strong> O score de satisfação dos clientes é de {data.satisfactionScore || 0}%, 
            baseado em feedback de {data.totalClients || 0} clientes, com NPS de {data.nps || 0}.
          </p>
          <p>
            <strong>Tempo de Resposta:</strong> O tempo médio de resposta é de {data.responseTime || 0} horas, 
            com {data.feedbackPositivo || 'N/A'} de feedback positivo e taxa de retenção de {data.retencaoClientes || 'N/A'}.
          </p>
          <p>
            <strong>Oportunidades:</strong> 
            {data.reclamacoes > 0 
              ? `Há ${data.reclamacoes} reclamações pendentes que devem ser priorizadas para melhoria da satisfação.` 
              : "O nível de satisfação está dentro dos padrões esperados, mantendo foco na excelência do atendimento."
            }
          </p>
        </div>
      );
    }

    if (report.title.includes('Ciclo de Vida') || data.averageAge !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Perfil do Parque:</strong> O portfólio conta com {data.totalEquipments || 0} equipamentos 
            com idade média de {data.averageAge || 0} anos, sendo {data.equipmentNeedsReplacement || 0} equipamentos 
            necessitando substituição (idade superior a 10 anos).
          </p>
          <p>
            <strong>Planejamento de Manutenção:</strong> Há {data.nextMaintenances || 0} manutenções agendadas. 
            O custo total de manutenção no período foi de {data.custoManutencaoTotal || 'N/A'}.
          </p>
          <p>
            <strong>Perspectivas:</strong> A vida útil média dos equipamentos é de {data.vidaUtilMedia || 'N/A'}, 
            com eficiência energética de {data.eficienciaEnergetica || 'N/A'} e valor residual estimado de {data.valorResidual || 'N/A'}.
          </p>
        </div>
      );
    }

    // Análise dinâmica e detalhada para relatórios IA baseada no prompt específico
    if (report.type === 'ai_generated' && report.content) {
      const generateDynamicAnalysis = (content: string, prompt?: string) => {
        // Determina tópicos baseados no prompt/conteúdo
        const getTopicsFromPrompt = (userPrompt?: string) => {
          if (!userPrompt) return ['Sumário Executivo', 'Análise Detalhada', 'Recomendações Estratégicas'];
          
          const prompt = userPrompt.toLowerCase();
          
          if (prompt.includes('manutenção') || prompt.includes('preventiva') || prompt.includes('corretiva')) {
            return [
              'Situação Atual das Manutenções',
              'Performance Operacional',
              'Análise de Eficiência Técnica',
              'Custos e Investimentos',
              'Recomendações de Melhoria'
            ];
          }
          
          if (prompt.includes('contrato') || prompt.includes('cliente') || prompt.includes('comercial')) {
            return [
              'Panorama da Carteira de Contratos',
              'Performance Comercial',
              'Análise de Rentabilidade',
              'Relacionamento com Clientes',
              'Oportunidades de Crescimento'
            ];
          }
          
          if (prompt.includes('financeiro') || prompt.includes('receita') || prompt.includes('custo')) {
            return [
              'Análise Financeira Consolidada',
              'Indicadores de Performance',
              'Fluxo de Receitas',
              'Estrutura de Custos',
              'Projeções e Cenários'
            ];
          }
          
          if (prompt.includes('operacional') || prompt.includes('equipamento') || prompt.includes('gerador')) {
            return [
              'Status Operacional dos Equipamentos',
              'Indicadores de Disponibilidade',
              'Análise de Falhas e Incidentes',
              'Eficiência dos Processos',
              'Plano de Ação Operacional'
            ];
          }
          
          return [
            'Contexto Estratégico',
            'Análise Situacional',
            'Insights Operacionais',
            'Impactos Identificados',
            'Diretrizes de Ação'
          ];
        };

        const topics = getTopicsFromPrompt(prompt);
        const contentSections = content.split('\n\n').filter(section => section.trim().length > 0);
        
        return topics.map((topic, index) => {
          const sectionContent = contentSections[index] || contentSections[Math.min(index, contentSections.length - 1)] || 
            `Análise detalhada sobre ${topic.toLowerCase()}. Os dados coletados no período indicam tendências importantes que requerem atenção estratégica. As informações apresentadas fornecem subsídios para tomada de decisões orientadas por dados, considerando tanto aspectos operacionais quanto estratégicos do negócio.`;
          
          return {
            title: topic,
            content: sectionContent.length > 150 ? sectionContent : 
              `${sectionContent} 
              
Esta análise considera múltiplos fatores e variáveis que impactam diretamente os resultados organizacionais. A metodologia aplicada permite uma visão abrangente e estratégica, identificando não apenas a situação atual, mas também oportunidades de otimização e melhoria contínua.

Com base nos indicadores levantados, observa-se a necessidade de implementação de ações específicas que promovam maior eficiência operacional e alinhamento com os objetivos estratégicos da organização.`
          };
        });
      };

      const analysisData = generateDynamicAnalysis(report.content, report.prompt);
      
      return (
        <div className="space-y-6">
          {analysisData.map((section, index) => (
            <div key={index} className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                {section.title}
              </h4>
              <div className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-muted markdown-preview">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({children}) => <p className="mb-2">{children}</p>,
                    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                    li: ({children}) => <li className="ml-2">{children}</li>,
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Fallback para relatórios IA sem conteúdo detalhado
    if (data.insights || data.contractsAnalyzed !== undefined) {
      return (
        <div className="space-y-3">
          <p>
            <strong>Análise Personalizada:</strong> {report.description}
          </p>
          <p>
            <strong>Dados Processados:</strong> Foram analisados {data.contractsAnalyzed || 0} contratos 
            e {data.maintenancesReviewed || 0} manutenções, com receita total de R$ {(data.totalRevenue || 0).toLocaleString('pt-BR')}.
          </p>
          {data.insights && Array.isArray(data.insights) && (
            <p>
              <strong>Insights Identificados:</strong> {data.insights.join(', ')}.
            </p>
          )}
        </div>
      );
    }

    // Se o content é JSON stringificado, fazer parse
    let contentToShow = report.content;
    if (typeof contentToShow === 'string' && contentToShow.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(contentToShow);
        contentToShow = parsed.content || parsed.summary || parsed.analyticalText || contentToShow;
      } catch (e) {
        // Não é JSON válido, usar como está
      }
    }

    // Se o conteúdo tem tags HTML, processa e retorna JSX limpo
    if (typeof contentToShow === 'string' && (contentToShow.includes('<h3>') || contentToShow.includes('<h4>') || contentToShow.includes('<ul>') || contentToShow.includes('<li>'))) {
      return processHTMLContent(contentToShow);
    }

    // Se tem markdown, renderizar com ReactMarkdown
    if (typeof contentToShow === 'string' && (contentToShow.includes('\n') || contentToShow.includes('#') || contentToShow.includes('**'))) {
      return (
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {contentToShow}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">
          <strong className="font-semibold">Análise:</strong> {contentToShow || 'Relatório gerado com dados do sistema. Utilize os gráficos e métricas para análise detalhada.'}
        </p>
      </div>
    );
  };



  const filteredAndSortedReports = reports
    .filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || report.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* AI Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Gerador de Relatórios com IA</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAIGenerator(!showAIGenerator)}
            >
              {showAIGenerator ? 'Fechar' : 'Gerar com IA'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAIGenerator && (
          <CardContent className="space-y-4">
            {/* Toggle entre Prompt Livre e Guiado */}
            <div className="flex items-center justify-center space-x-2 p-2 bg-muted rounded-lg">
              <Button
                variant={promptMode === 'free' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPromptMode('free')}
                className="flex-1"
              >
                <Brain className="h-4 w-4 mr-2" />
                Prompt Livre
              </Button>
              <Button
                variant={promptMode === 'guided' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPromptMode('guided')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Relatórios Guiados
              </Button>
            </div>

            {promptMode === 'free' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Livre</label>
                <Textarea
                  placeholder="Ex: Analise a performance dos contratos e manutenções no período selecionado, focando em métricas de eficiência e oportunidades de melhoria"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Seja específico sobre o que deseja analisar. A IA usará dados reais do sistema.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium">Relatórios Pré-configurados</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione um modelo de relatório ou use os "Relatórios Rápidos" na página principal
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Performance de Manutenções', prompt: 'Analise detalhada de todas as manutenções realizadas, incluindo preventivas vs corretivas, taxa de conclusão, atrasos e eficiência operacional' },
                    { label: 'Receita de Contratos', prompt: 'Análise financeira completa dos contratos ativos, receita total, distribuição por tipo e oportunidades de crescimento' },
                    { label: 'Satisfação e Retenção', prompt: 'Avalie a satisfação dos clientes, taxa de retenção, feedback e recomendações para melhorar o relacionamento' },
                    { label: 'Ciclo de Vida de Equipamentos', prompt: 'Análise do parque de equipamentos, idade média, necessidade de substituição e planejamento de manutenções futuras' }
                  ].map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start text-left h-auto py-3"
                      onClick={() => {
                        setAiPrompt(template.prompt);
                        setPromptMode('free');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial (opcional)</label>
                <DatePicker
                  value={startDate}
                  onChangeString={setStartDate}
                  allowWeekends={true}
                  placeholder="Selecione a data inicial"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final (opcional)</label>
                <DatePicker
                  value={endDate}
                  onChangeString={setEndDate}
                  allowWeekends={true}
                  placeholder="Selecione a data final"
                />
              </div>
            </div>
            <Button
              onClick={generateAIReport}
              disabled={generatingAI || !aiPrompt.trim()}
              className="w-full"
            >
              {generatingAI ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Gerar Relatório com IA
                </>
              )}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar relatórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: unknown) => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="standard">Padrão</SelectItem>
                <SelectItem value="ai_generated">Gerados por IA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: unknown) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Mais recentes</SelectItem>
                <SelectItem value="date_asc">Mais antigos</SelectItem>
                <SelectItem value="title">Título (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredAndSortedReports.map((report) => (
          <Card key={report.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-lg leading-tight">{report.title}</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={report.type === 'ai_generated' ? 'default' : 'secondary'} className="text-xs">
                      {report.type === 'ai_generated' ? 'IA' : 'Padrão'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                    {report.period && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.period.startDate), 'dd/MM', { locale: ptBR })} - {format(new Date(report.period.endDate), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report);
                      setIsViewerOpen(true);
                    }}
                    title="Expandir relatório"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteReport(report.id)}
                    className="text-destructive hover:text-destructive"
                    title="Excluir relatório"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Análise Textual */}
              {report.data && (
                <div className="bg-muted/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Análise do Relatório
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    {renderAnalyticalText(report)}
                  </div>
                </div>
              )}

              {/* Charts */}
              {report.charts && report.charts.length > 0 && report.charts.map((chart, index) => (
                <div key={index}>
                  <h4 className="text-sm font-medium mb-2">{chart.title}</h4>
                  <ImprovedCharts chart={chart} height={220} showValues={false} />
                </div>
              ))}

              {/* Summary Data */}
              {report.data && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  {Object.entries(report.data).map(([key, value]) => {
                    // Skip period field - it's already displayed in header
                    if (key === 'period') return null;

                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-sm font-medium">
                          {typeof value === 'number'
                            ? key.toLowerCase().includes('revenue') || key.toLowerCase().includes('total')
                              ? `R$ ${value.toLocaleString('pt-BR')}`
                              : value.toLocaleString('pt-BR')
                            : Array.isArray(value)
                              ? value.join(', ')
                              : typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : String(value)
                          }
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI Prompt if exists */}
              {report.prompt && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Prompt usado:</p>
                  <p className="text-sm italic">"{report.prompt}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedReports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Gere seu primeiro relatório usando os tipos disponíveis ou o gerador de IA'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer 
          report={selectedReport}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};

export default GeneratedReportsSection;