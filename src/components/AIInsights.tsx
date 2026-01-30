import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useNavigate } from 'react-router-dom';

interface AIInsight {
  id: string;
  type: 'recommendation' | 'prediction' | 'optimization' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export const AIInsights = () => {
  const { metrics, contracts, maintenances } = useDashboardMetrics();
  const navigate = useNavigate();

  if (!metrics) return null;

  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Análise de padrões de contrato
    if (metrics.contracts.total > 0) {
      const activeRate = (metrics.contracts.active / metrics.contracts.total) * 100;
      
      if (activeRate > 80) {
        insights.push({
          id: 'high-retention',
          type: 'recommendation',
          title: 'Alta Taxa de Retenção Detectada',
          description: `Com ${activeRate.toFixed(0)}% de contratos ativos, considere expandir a operação ou aumentar preços gradualmente.`,
          impact: 'high',
          confidence: 92,
          action: {
            label: 'Analisar Oportunidades',
            onClick: () => {
              const prompt = `Analisar oportunidades de crescimento: Temos ${activeRate.toFixed(0)}% de contratos ativos, o que indica alta taxa de retenção. Sugira estratégias para: 1) Expandir a operação mantendo a qualidade, 2) Otimizar precificação considerando a alta demanda, 3) Identificar serviços adicionais que podemos oferecer aos clientes existentes.`;
              navigate('/app/ai-agents', {
                state: {
                  initialPrompt: prompt,
                  agentId: 'general-conversation',
                  source: 'dashboard-insight',
                  insightId: 'high-retention',
                  contextData: {
                    contracts: contracts || [],
                    maintenances: maintenances || [],
                    metrics: metrics
                  }
                }
              });
            }
          }
        });
      }

      if (metrics.contracts.expiringSoon > metrics.contracts.total * 0.3) {
        insights.push({
          id: 'renewal-wave',
          type: 'prediction',
          title: 'Onda de Renovações Prevista',
          description: 'Muitos contratos vencem simultaneamente. Prepare uma campanha de renovação antecipada.',
          impact: 'high',
          confidence: 88,
          action: {
            label: 'Criar Campanha',
            onClick: () => navigate('/app/contracts')
          }
        });
      }
    }

    // Análise de manutenções
    if (metrics.maintenances.total > 0) {
      if (metrics.maintenances.overdue > 0) {
        insights.push({
          id: 'maintenance-bottleneck',
          type: 'optimization',
          title: 'Gargalo Operacional Identificado',
          description: `${metrics.maintenances.overdue} manutenções atrasadas indicam necessidade de mais recursos ou melhor planejamento.`,
          impact: 'high',
          confidence: 95,
          action: {
            label: 'Otimizar Agenda',
            onClick: () => navigate('/app/calendar')
          }
        });
      }

      if (metrics.performance.completionRate > 95) {
        insights.push({
          id: 'operational-excellence',
          type: 'recommendation',
          title: 'Excelência Operacional Alcançada',
          description: 'Performance excepcional! Considere expandir a capacidade ou oferecer serviços premium.',
          impact: 'medium',
          confidence: 87,
          action: {
            label: 'Explorar Expansão',
            onClick: () => {
              const prompt = `Análise de expansão operacional: Com taxa de conclusão de ${metrics.performance.completionRate}%, alcançamos excelência operacional. Sugira: 1) Como expandir capacidade mantendo qualidade, 2) Serviços premium que podemos oferecer, 3) Métricas para monitorar durante a expansão, 4) Investamentos necessários.`;
              navigate('/app/ai-agents', {
                state: {
                  initialPrompt: prompt,
                  agentId: 'general-conversation',
                  source: 'dashboard-insight',
                  insightId: 'operational-excellence',
                  contextData: {
                    contracts: contracts || [],
                    maintenances: maintenances || [],
                    metrics: metrics
                  }
                }
              });
            }
          }
        });
      }
    }

    // Análise de receita
    if (metrics.revenue.growth > 15) {
      insights.push({
        id: 'revenue-acceleration',
        type: 'prediction',
        title: 'Aceleração de Crescimento',
        description: `Crescimento de ${metrics.revenue.growth.toFixed(1)}% indica tendência forte. Projeção: +40% nos próximos 6 meses.`,
        impact: 'high',
        confidence: 84,
        action: {
          label: 'Ver Projeções',
          onClick: () => navigate('/app/reports')
        }
      });
    } else if (metrics.revenue.growth < 0) {
      insights.push({
        id: 'revenue-decline',
        type: 'alert',
        title: 'Declínio de Receita Detectado',
        description: 'Receita em queda requer ação imediata. Analise a satisfação dos clientes e revise preços.',
        impact: 'high',
        confidence: 91,
        action: {
          label: 'Análise Detalhada',
          onClick: () => navigate('/app/reports')
        }
      });
    }

    // Insights de otimização
    if (metrics.contracts.total > 10 && metrics.maintenances.upcoming > 10) {
      insights.push({
        id: 'route-optimization',
        type: 'optimization',
        title: 'Oportunidade de Otimização de Rotas',
        description: 'Com muitas manutenções programadas, otimizar rotas pode reduzir custos em até 25%.',
        impact: 'medium',
        confidence: 78,
        action: {
          label: 'Consultar IA',
          onClick: () => {
            const prompt = `Otimização de rotas de manutenção: Temos ${metrics.maintenances.upcoming} manutenções programadas. Analise como: 1) Agrupar manutenções por região/proximidade, 2) Reduzir tempo de deslocamento, 3) Otimizar sequência de atendimentos, 4) Estimar economia de até 25% em custos operacionais.`;
            navigate('/app/ai-agents', {
              state: {
                initialPrompt: prompt,
                agentId: 'general-conversation',
                source: 'dashboard-insight',
                insightId: 'route-optimization',
                contextData: {
                  contracts: contracts || [],
                  maintenances: maintenances || [],
                  metrics: metrics
                }
              }
            });
          }
        }
      });
    }

    // Insight de satisfação do cliente
    if (metrics.performance.completionRate > 90 && metrics.contracts.expired === 0) {
      insights.push({
        id: 'customer-satisfaction',
        type: 'recommendation',
        title: 'Momento Ideal para Feedback',
        description: 'Alta performance é o momento perfeito para coletar depoimentos e expandir por indicações.',
        impact: 'medium',
        confidence: 82,
        action: {
          label: 'Estratégia de Marketing',
          onClick: () => {
            const prompt = `Estratégia de marketing e indicações: Com ${metrics.performance.completionRate}% de taxa de conclusão e zero contratos expirados, é momento ideal para: 1) Criar campanha de coleta de depoimentos, 2) Programa de indicações com benefícios, 3) Cases de sucesso para divulgação, 4) Estratégia de upsell para clientes satisfeitos.`;
            navigate('/app/ai-agents', {
              state: {
                initialPrompt: prompt,
                agentId: 'general-conversation',
                source: 'dashboard-insight',
                insightId: 'customer-satisfaction',
                contextData: {
                  contracts: contracts || [],
                  maintenances: maintenances || [],
                  metrics: metrics
                }
              }
            });
          }
        }
      });
    }

    return insights.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  };

  const insights = generateInsights();

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'recommendation':
        return <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />;
      case 'prediction':
        return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
      case 'optimization':
        return <Target className="h-4 w-4 sm:h-5 sm:w-5 text-success" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />;
      default:
        return <Brain className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  const getImpactBadgeVariant = (impact: AIInsight['impact']) => {
    switch (impact) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 75) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span>Insights da IA</span>
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Análises automáticas e recomendações baseadas nos seus dados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Brain className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">Coletando dados para análise...</p>
            <p className="text-xs sm:text-sm">Os insights aparecerão conforme mais dados forem processados.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {insights.map(insight => (
              <div key={insight.id} className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm sm:text-base">{insight.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getImpactBadgeVariant(insight.impact)} className="text-xs">
                          {insight.impact}
                        </Badge>
                        <span className={`text-xs ${getConfidenceColor(insight.confidence)}`}>
                          {insight.confidence}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
                    {insight.action && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={insight.action.onClick}
                        className="mt-1 sm:mt-2 text-xs sm:text-sm"
                      >
                        {insight.action.label}
                        <ArrowRight className="h-2 w-2 sm:h-3 sm:w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-3 sm:pt-4 border-t">
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm"
                onClick={() => navigate('/app/ai-agents', {
                  state: {
                    agentId: 'general-conversation',
                    source: 'dashboard-insight',
                    contextData: {
                      contracts: contracts || [],
                      maintenances: maintenances || [],
                      metrics: metrics
                    }
                  }
                })}
              >
                <Brain className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Consultar Agentes IA Especializados
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
