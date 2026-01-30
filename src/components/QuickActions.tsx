
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar, 
  FileText, 
  Users, 
  Wrench,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useNavigate } from 'react-router-dom';

export const QuickActions = () => {
  const { metrics, refresh } = useDashboardMetrics();
  const navigate = useNavigate();

  if (!metrics) return null;

  // Ações contextuais baseadas no estado atual
  const getContextualActions = () => {
    const actions = [];

    // Ações urgentes
    if (metrics.contracts.expired > 0) {
      actions.push({
        id: 'renew-contracts',
        title: 'Renovar Contratos Expirados',
        description: `${metrics.contracts.expired} contratos precisam de renovação`,
        icon: <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />,
        variant: 'destructive' as const,
        urgency: 'high',
        action: () => navigate('/app/contracts?filter=expired')
      });
    }

    if (metrics.maintenances.overdue > 0) {
      actions.push({
        id: 'schedule-overdue',
        title: 'Resolver Manutenções Atrasadas',
        description: `${metrics.maintenances.overdue} manutenções em atraso`,
        icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />,
        variant: 'destructive' as const,
        urgency: 'high',
        action: () => navigate('/app/maintenances?filter=overdue')
      });
    }

    // Ações importantes
    if (metrics.contracts.expiringSoon > 0) {
      actions.push({
        id: 'plan-renewals',
        title: 'Planejar Renovações',
        description: `${metrics.contracts.expiringSoon} contratos vencem em 30 dias`,
        icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />,
        variant: 'default' as const,
        urgency: 'medium',
        action: () => navigate('/app/contracts?filter=expiring')
      });
    }

    if (metrics.maintenances.upcoming > 3) {
      actions.push({
        id: 'organize-schedule',
        title: 'Organizar Agenda',
        description: `${metrics.maintenances.upcoming} manutenções nos próximos 7 dias`,
        icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />,
        variant: 'default' as const,
        urgency: 'medium',
        action: () => navigate('/app/calendar')
      });
    }

    // Ações de rotina
    actions.push({
      id: 'new-contract',
      title: 'Novo Contrato',
      description: 'Adicionar novo contrato ao sistema',
      icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
      variant: 'outline' as const,
      urgency: 'low',
      action: () => navigate('/app/contracts')
    });

    actions.push({
      id: 'schedule-maintenance',
      title: 'Agendar Manutenção',
      description: 'Programar nova manutenção',
      icon: <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />,
      variant: 'outline' as const,
      urgency: 'low',
      action: () => navigate('/app/maintenances')
    });

    actions.push({
      id: 'add-client',
      title: 'Novo Cliente',
      description: 'Cadastrar novo cliente',
      icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
      variant: 'outline' as const,
      urgency: 'low',
      action: () => navigate('/app/clients')
    });

    // Ações de análise
    if (metrics.contracts.total > 5) {
      actions.push({
        id: 'generate-report',
        title: 'Gerar Relatório',
        description: 'Relatório mensal de performance',
        icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />,
        variant: 'outline' as const,
        urgency: 'low',
        action: () => navigate('/app/reports')
      });
    }

    actions.push({
      id: 'ai-consultation',
      title: 'Consultar IA',
      description: 'Obter análises e recomendações',
      icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />,
      variant: 'outline' as const,
      urgency: 'low',
      action: () => navigate('/app/ai-agents')
    });

    return actions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  };

  const actions = getContextualActions();
  const urgentActions = actions.filter(a => a.urgency === 'high');
  const regularActions = actions.filter(a => a.urgency !== 'high');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Ações Urgentes */}
      {urgentActions.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center space-x-2 text-destructive text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Ações Urgentes</span>
              <Badge variant="destructive" className="text-xs">{urgentActions.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Tarefas que precisam de atenção imediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {urgentActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant}
                className="w-full justify-start h-auto p-3 sm:p-4 flex-wrap sm:flex-nowrap"
                onClick={action.action}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 w-full min-w-0">
                  {action.icon}
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">{action.title}</div>
                    <div className="text-xs sm:text-sm opacity-90">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ações Regulares */}
      <Card className="border-card-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Ações Rápidas</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {regularActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant}
                className="justify-start h-auto p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground transition-colors flex-wrap sm:flex-nowrap"
                onClick={action.action}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 w-full min-w-0">
                  {action.icon}
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">{action.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Ação de Refresh */}
          <div className="pt-2 sm:pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="w-full text-xs sm:text-sm"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Atualizar Dados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
