import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  FileText, 
  Calendar,
  CheckCircle,
  X,
  Bell
} from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useState } from 'react';
import { translatePriority } from '@/utils/translations';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export const SmartAlerts = () => {
  const { metrics } = useDashboardMetrics();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const generateAlerts = (): Alert[] => {
    if (!metrics) return [];

    const alerts: Alert[] = [];

    // Contratos expirados
    if (metrics.contracts.expired > 0) {
      alerts.push({
        id: 'expired-contracts',
        type: 'error',
        title: 'Contratos Expirados',
        message: `${metrics.contracts.expired} contrato(s) expiraram e precisam de renovação urgente.`,
        action: {
          label: 'Ver Contratos',
          href: '/app/contracts'
        },
        priority: 'high',
        timestamp: new Date()
      });
    }

    // Contratos vencendo em breve
    if (metrics.contracts.expiringSoon > 0) {
      alerts.push({
        id: 'expiring-contracts',
        type: 'warning',
        title: 'Contratos Vencendo',
        message: `${metrics.contracts.expiringSoon} contrato(s) vencem nos próximos 30 dias.`,
        action: {
          label: 'Planejar Renovações',
          href: '/app/contracts'
        },
        priority: 'high',
        timestamp: new Date()
      });
    }

    // Manutenções atrasadas
    if (metrics.maintenances.overdue > 0) {
      alerts.push({
        id: 'overdue-maintenances',
        type: 'error',
        title: 'Manutenções Atrasadas',
        message: `${metrics.maintenances.overdue} ${metrics.maintenances.overdue === 1 ? 'manutenção está' : 'manutenções estão'} em atraso e precisam ser reagendadas.`,
        action: {
          label: 'Ver Manutenções',
          href: '/app/maintenances'
        },
        priority: 'high',
        timestamp: new Date()
      });
    }

    // Manutenções próximas
    if (metrics.maintenances.upcoming > 5) {
      alerts.push({
        id: 'upcoming-maintenances',
        type: 'warning',
        title: 'Semana Movimentada',
        message: `${metrics.maintenances.upcoming} manutenções programadas para os próximos 7 dias.`,
        action: {
          label: 'Ver Agenda',
          href: '/app/calendar'
        },
        priority: 'medium',
        timestamp: new Date()
      });
    }

    // Crescimento da receita
    if (metrics.revenue.growth > 10) {
      alerts.push({
        id: 'revenue-growth',
        type: 'success',
        title: 'Crescimento Excepcional',
        message: `Receita cresceu ${metrics.revenue.growth.toFixed(1)}% este mês! Continue assim.`,
        action: {
          label: 'Ver Relatórios',
          href: '/app/reports'
        },
        priority: 'low',
        timestamp: new Date()
      });
    }

    // Taxa de conclusão baixa
    if (metrics.performance.completionRate < 80) {
      alerts.push({
        id: 'low-completion-rate',
        type: 'warning',
        title: 'Taxa de Conclusão Baixa',
        message: `Taxa de conclusão está em ${metrics.performance.completionRate.toFixed(1)}%. Considere revisar os processos.`,
        action: {
          label: 'Analisar Performance',
          href: '/app/reports'
        },
        priority: 'medium',
        timestamp: new Date()
      });
    }

    // Oportunidade de expansão
    if (metrics.contracts.active > 15 && metrics.performance.completionRate > 90) {
      alerts.push({
        id: 'expansion-opportunity',
        type: 'info',
        title: 'Oportunidade de Expansão',
        message: 'Com alta performance e boa carteira, considere expandir para novos mercados.',
        action: {
          label: 'Falar com IA',
          href: '/app/ai-agents'
        },
        priority: 'low',
        timestamp: new Date()
      });
    }

    return alerts.filter(alert => !dismissedAlerts.includes(alert.id));
  };

  const alerts = generateAlerts();

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />;
      case 'warning':
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
      default:
        return <Bell className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  const getAlertBadgeVariant = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-card-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            <span>Sistema em Ordem</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Nenhum alerta crítico no momento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-success opacity-50" />
            <p className="text-sm sm:text-base">Tudo funcionando perfeitamente!</p>
            <p className="text-xs sm:text-sm">Os alertas aparecerão aqui quando houver itens que precisam de atenção.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separar alertas por prioridade
  const highPriorityAlerts = alerts.filter(a => a.priority === 'high');
  const otherAlerts = alerts.filter(a => a.priority !== 'high');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Alertas de Alta Prioridade */}
      {highPriorityAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center space-x-2 text-destructive text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Atenção Urgente</span>
              <Badge variant="destructive" className="text-xs">{highPriorityAlerts.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Itens que precisam de ação imediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {highPriorityAlerts.map(alert => (
              <div key={alert.id} className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-background rounded-lg border">
                {getAlertIcon(alert.type)}
                <div className="flex-1 space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm sm:text-base">{alert.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{alert.message}</p>
                  {alert.action && (
                    <Button size="sm" variant="outline" asChild className="text-xs sm:text-sm">
                      <a href={alert.action.href}>{alert.action.label}</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Outros Alertas */}
      {otherAlerts.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Notificações</span>
              <Badge variant="secondary" className="text-xs">{otherAlerts.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Informações e recomendações do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {otherAlerts.map(alert => (
              <div key={alert.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors">
                {getAlertIcon(alert.type)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-xs sm:text-sm">{alert.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getAlertBadgeVariant(alert.priority)} className="text-xs">
                        {translatePriority(alert.priority)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="h-4 w-4 sm:h-5 sm:w-5 p-0"
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  {alert.action && (
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs" asChild>
                      <a href={alert.action.href}>{alert.action.label}</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
