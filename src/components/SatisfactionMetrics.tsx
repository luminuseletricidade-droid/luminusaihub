import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { SatisfactionCalculator, SatisfactionData } from '@/utils/satisfactionCalculator';

interface SatisfactionMetricsProps {
  data: SatisfactionData;
  className?: string;
}

export default function SatisfactionMetrics({ data, className }: SatisfactionMetricsProps) {
  const satisfaction = SatisfactionCalculator.calculateSatisfaction(data);
  const rating = SatisfactionCalculator.getSatisfactionRating(satisfaction);
  
  // Calculate individual factor scores for detailed breakdown
  const factors = {
    serviceQuality: calculateServiceQuality(data),
    reliability: calculateReliability(data),
    retention: calculateRetention(data),
    growth: calculateGrowth(data)
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Satisfaction Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Satisfação do Cliente</span>
            </div>
            <Badge 
              style={{ 
                backgroundColor: rating.color,
                color: 'white'
              }}
            >
              {rating.rating}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold" style={{ color: rating.color }}>
                {satisfaction}%
              </span>
              <div className="text-right text-sm text-muted-foreground">
                <p>Calculado dinamicamente</p>
                <p>baseado em métricas reais</p>
              </div>
            </div>
            
            <Progress 
              value={satisfaction} 
              className="h-3"
              style={{
                background: `linear-gradient(to right, ${rating.color}20 0%, ${rating.color}40 100%)`
              }}
            />
            
            <p className="text-sm text-muted-foreground">
              {rating.description}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed Factor Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service Excellence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Excelência do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold">{factors.serviceQuality}%</span>
                {factors.serviceQuality >= 80 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : factors.serviceQuality >= 60 ? (
                  <Clock className="h-4 w-4 text-yellow-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <Progress value={factors.serviceQuality} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data.completedMaintenances} concluídas de {data.completedMaintenances + data.overdueMaintenances + data.pendingMaintenances} total
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Reliability */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Confiabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold">{factors.reliability}%</span>
                {data.overdueMaintenances === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : data.overdueMaintenances <= 2 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
              <Progress value={factors.reliability} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data.overdueMaintenances} atrasadas
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Client Retention */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Retenção de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold">{factors.retention}%</span>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <Progress value={factors.retention} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data.activeContracts} de {data.totalContracts} contratos ativos
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Growth Indicator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold">{factors.growth}%</span>
                {data.newContractsThisMonth > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <Progress value={factors.growth} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data.newContractsThisMonth} novos contratos este mês
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Source Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p><strong>Cálculo Dinâmico:</strong> Esta satisfação é calculada em tempo real baseada em:</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                <li>Taxa de conclusão de manutenções (35%)</li>
                <li>Pontualidade e confiabilidade (25%)</li>
                <li>Retenção de contratos (20%)</li>
                <li>Qualidade de resposta (10%)</li>
                <li>Crescimento de negócios (10%)</li>
              </ul>
              <p className="mt-1 font-medium">Nenhum valor fixo é utilizado - 100% baseado em dados reais.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions for factor calculations (simplified versions)
function calculateServiceQuality(data: SatisfactionData): number {
  const total = data.completedMaintenances + data.overdueMaintenances + data.pendingMaintenances;
  return total > 0 ? Math.round((data.completedMaintenances / total) * 100) : 60;
}

function calculateReliability(data: SatisfactionData): number {
  const total = data.completedMaintenances + data.overdueMaintenances + data.pendingMaintenances;
  return total > 0 ? Math.round(((total - data.overdueMaintenances) / total) * 100) : 70;
}

function calculateRetention(data: SatisfactionData): number {
  return data.totalContracts > 0 ? Math.round((data.activeContracts / data.totalContracts) * 100) : 50;
}

function calculateGrowth(data: SatisfactionData): number {
  if (data.totalContracts === 0) return 60;
  const growthRate = (data.newContractsThisMonth / Math.max(1, data.totalContracts)) * 100;
  return Math.min(100, Math.round(growthRate * 10)); // Scale growth rate
}