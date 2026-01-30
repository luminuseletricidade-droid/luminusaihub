import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  X, 
  FileText, 
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Building2,
  Wrench,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImprovedCharts } from './ImprovedCharts';

interface ReportViewerProps {
  report: unknown;
  isOpen: boolean;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, isOpen, onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getReportIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('manutenção') || titleLower.includes('preventiva')) return <Wrench className="h-5 w-5" />;
    if (titleLower.includes('contrato')) return <FileText className="h-5 w-5" />;
    if (titleLower.includes('financ') || titleLower.includes('receita')) return <DollarSign className="h-5 w-5" />;
    if (titleLower.includes('cliente') || titleLower.includes('satisfação')) return <Users className="h-5 w-5" />;
    if (titleLower.includes('equipamento') || titleLower.includes('disponibilidade')) return <Building2 className="h-5 w-5" />;
    return <BarChart3 className="h-5 w-5" />;
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto o relatório é preparado",
      });

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `relatorio_${report.id}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF baixado com sucesso!",
        description: `Arquivo salvo como ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    }
  };


  const renderMetricCard = (label: string, value: any, icon: React.ReactNode, color: string = "blue") => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-green-50 text-green-700 border-green-200",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
      red: "bg-red-50 text-red-700 border-red-200",
    };

    return (
      <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold mt-1">
              {typeof value === 'number' && label.toLowerCase().includes('valor') 
                ? `R$ ${value.toLocaleString('pt-BR')}`
                : value
              }
            </p>
          </div>
          <div className="opacity-60">{icon}</div>
        </div>
      </div>
    );
  };

  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getReportIcon(report.title)}
              <div>
                <DialogTitle className="text-xl">{report.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Gerado em {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(95vh-80px)]">
          <div ref={reportRef} className="p-6 space-y-6 bg-white">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{report.title}</h2>
                  <p className="text-gray-600">{report.description}</p>
                  <div className="flex items-center gap-3 mt-4">
                    <Badge variant={report.type === 'ai_generated' ? 'default' : 'secondary'}>
                      {report.type === 'ai_generated' ? 'Gerado por IA' : 'Relatório Padrão'}
                    </Badge>
                    {report.period && (
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(report.period.startDate), 'dd/MM/yy')} - {format(new Date(report.period.endDate), 'dd/MM/yy')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            {report.data && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Métricas Principais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {report.data.totalContracts !== undefined && (
                    renderMetricCard("Total de Contratos", report.data.totalContracts, <FileText className="h-5 w-5" />, "blue")
                  )}
                  {report.data.totalMaintenances !== undefined && (
                    renderMetricCard("Total de Manutenções", report.data.totalMaintenances, <Wrench className="h-5 w-5" />, "green")
                  )}
                  {report.data.totalRevenue !== undefined && (
                    renderMetricCard("Receita Total", report.data.totalRevenue, <DollarSign className="h-5 w-5" />, "amber")
                  )}
                  {report.data.eficiencia !== undefined && (
                    renderMetricCard("Eficiência", `${report.data.eficiencia}%`, <CheckCircle className="h-5 w-5" />, "green")
                  )}
                </div>
              </div>
            )}

            {/* Analytical Content */}
            {(report.content || report.data?.analyticalText) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Análise Detalhada
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      {(() => {
                        // Prioridade: analyticalText > content
                        let textToRender = report.data?.analyticalText || report.content;
                        
                        if (!textToRender) return null;
                        
                        // Se o conteúdo parece ser JSON stringificado, fazer parse
                        if (typeof textToRender === 'string' && textToRender.trim().startsWith('{') && textToRender.trim().endsWith('}')) {
                          try {
                            const parsed = JSON.parse(textToRender);
                            // Se o parse funcionou e tem a propriedade 'content', usar ela
                            if (parsed && parsed.content) {
                              textToRender = parsed.content;
                            }
                          } catch (e) {
                            // Não é JSON válido, continuar com o texto original
                          }
                        }
                        
                        // Se o texto tem tags HTML, processa e renderiza como texto limpo
                        if (typeof textToRender === 'string' && (textToRender.includes('<h3>') || textToRender.includes('<h4>') || textToRender.includes('<ul>') || textToRender.trim().startsWith('<'))) {
                          // Remove tags HTML e converte para texto formatado
                          const cleanText = textToRender
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<\/p>/gi, '\n\n')
                            .replace(/<\/h[1-6]>/gi, '\n\n')
                            .replace(/<h[1-6]>/gi, '\n')
                            .replace(/<\/li>/gi, '\n')
                            .replace(/<\/ul>/gi, '\n')
                            .replace(/<li>/gi, '• ')
                            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                            .replace(/<[^>]*>/g, '')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();

                          // Renderiza como Markdown para melhor formatação
                          return (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h3: ({children}) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                                h4: ({children}) => <h4 className="text-base font-medium mb-2 mt-3">{children}</h4>,
                                p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                li: ({children}) => <li className="ml-2">{children}</li>,
                                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                              }}
                            >
                              {cleanText}
                            </ReactMarkdown>
                          );
                        }
                        
                        // Se não é string, mostrar JSON formatado
                        if (typeof textToRender !== 'string') {
                          return <pre className="whitespace-pre-wrap">{JSON.stringify(textToRender, null, 2)}</pre>;
                        }
                        
                        // Caso contrário, trata como Markdown
                        return (
                          <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
                            h2: ({children}) => <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>,
                            h3: ({children}) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                            p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="ml-4">{children}</li>,
                            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            blockquote: ({children}) => (
                              <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600">
                                {children}
                              </blockquote>
                            ),
                            code: ({children}) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ),
                            pre: ({children}) => (
                              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                                {children}
                              </pre>
                            ),
                            table: ({children}) => (
                              <table className="min-w-full divide-y divide-gray-200 mb-4">
                                {children}
                              </table>
                            ),
                            th: ({children}) => (
                              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {children}
                              </th>
                            ),
                            td: ({children}) => (
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {children}
                              </td>
                            ),
                          }}
                          >
                            {textToRender}
                          </ReactMarkdown>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Section */}
            {report.charts && report.charts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Visualizações Gráficas
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {report.charts.map((chart: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-4 text-center">{chart.title}</h4>
                        <ImprovedCharts chart={chart} height={350} showValues={true} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Insights */}
            {report.data?.insights && Array.isArray(report.data.insights) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Insights e Recomendações
                  </h3>
                  <ul className="space-y-2">
                    {report.data.insights.map((insight: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="border-t pt-6 mt-8">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Relatório gerado em {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  <span>Luminus Contract AI Hub - Relatório #{report.id}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ReportViewer;