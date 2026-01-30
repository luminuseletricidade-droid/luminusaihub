
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Building2, 
  Wrench, 
  Calendar,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useOptimizedDashboardMetrics } from '@/hooks/useOptimizedDashboardMetrics';

export const IntelligentMetrics = React.memo(() => {
  const { metrics, isLoading } = useOptimizedDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="h-3 sm:h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-6 sm:h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getStatusColor = (value: number, threshold: number, reverse = false) => {
    const isGood = reverse ? value < threshold : value > threshold;
    return isGood ? "text-success" : "text-destructive";
  };

  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? (
      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
    ) : (
      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Contratos Totais</p>
                <p className="text-metric-medium">{metrics.totalContracts}</p>
                <div className="flex items-center mt-1 sm:mt-2 text-xs sm:text-sm">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success mr-1" />
                  <span className="text-success">{metrics.activeContracts} ativos</span>
                </div>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Mensal</p>
                <p className="text-metric-medium">{formatCurrency(metrics.monthlyRevenue)}</p>
                <div className="flex items-center mt-1 sm:mt-2 text-xs sm:text-sm">
                  {getGrowthIcon(metrics.revenueGrowth || 0)}
                  <span className={getStatusColor(metrics.revenueGrowth || 0, 0)}>
                    {(metrics.revenueGrowth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Manutenções</p>
                <p className="text-metric-medium">{metrics.totalMaintenances}</p>
                <div className="flex items-center mt-1 sm:mt-2 text-xs sm:text-sm">
                  {metrics.overdueMaintenances > 0 ? (
                    <>
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive mr-1" />
                      <span className="text-destructive">{metrics.overdueMaintenances} atrasadas</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success mr-1" />
                      <span className="text-success">Em dia</span>
                    </>
                  )}
                </div>
              </div>
              <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-metric-medium">{(metrics.completionRate || 0).toFixed(1)}%</p>
                <div className="mt-1 sm:mt-2">
                  <Progress 
                    value={metrics.completionRate} 
                    className="w-full h-1.5 sm:h-2"
                  />
                </div>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-card-border">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Status dos Contratos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Visão geral da carteira de contratos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Contratos Ativos</span>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="text-xs">{metrics.activeContracts}</Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {(metrics.totalContracts > 0 ? ((metrics.activeContracts / metrics.totalContracts) * 100) : 0).toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress value={(metrics.activeContracts / metrics.totalContracts) * 100} className="h-1.5 sm:h-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Vencendo em 30 dias</span>
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.expiringContracts > 0 ? "destructive" : "secondary"} className="text-xs">
                  {metrics.expiringContracts}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Contratos Expirados</span>
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.expiredContracts > 0 ? "destructive" : "secondary"} className="text-xs">
                  {metrics.expiredContracts}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Agenda de Manutenções</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Próximas atividades programadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Próximos 7 dias</span>
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.upcomingMaintenances > 5 ? "destructive" : "default"} className="text-xs">
                  {metrics.upcomingMaintenances}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Em atraso</span>
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.overdueMaintenances > 0 ? "destructive" : "secondary"} className="text-xs">
                  {metrics.overdueMaintenances}
                </Badge>
                {metrics.overdueMaintenances > 0 && (
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Tempo médio de resposta</span>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium">
                  {(metrics.averageResponseTime || 0).toFixed(1)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

IntelligentMetrics.displayName = 'IntelligentMetrics';

export default IntelligentMetrics;
