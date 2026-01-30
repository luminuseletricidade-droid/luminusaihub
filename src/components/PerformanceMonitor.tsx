import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Database, Clock, TrendingUp } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'error';
  threshold: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  isVisible = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const collectMetrics = () => {
    const newMetrics: PerformanceMetric[] = [];

    // Page load performance
    if (performance && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      newMetrics.push({
        name: 'Tempo de Carregamento',
        value: loadTime,
        unit: 'ms',
        status: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'warning' : 'error',
        threshold: 3000
      });
    }

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as unknown).memory;
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      newMetrics.push({
        name: 'Uso de Memória',
        value: memoryUsage,
        unit: 'MB',
        status: memoryUsage < 50 ? 'good' : memoryUsage < 100 ? 'warning' : 'error',
        threshold: 50
      });
    }

    // Component render count (simulation)
    const renderCount = document.querySelectorAll('[data-component]').length;
    newMetrics.push({
      name: 'Componentes Renderizados',
      value: renderCount,
      unit: 'componentes',
      status: renderCount < 100 ? 'good' : renderCount < 200 ? 'warning' : 'error',
      threshold: 100
    });

    // DOM nodes count
    const domNodes = document.getElementsByTagName('*').length;
    newMetrics.push({
      name: 'Nós do DOM',
      value: domNodes,
      unit: 'nós',
      status: domNodes < 1000 ? 'good' : domNodes < 2000 ? 'warning' : 'error',
      threshold: 1000
    });

    setMetrics(newMetrics);
  };

  useEffect(() => {
    let isMounted = true;
    
    if (isVisible && isMonitoring && isMounted) {
      collectMetrics(); // Initial collection
      
      const interval = setInterval(() => {
        if (isMounted) {
          collectMetrics();
        }
      }, 2000);
      
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [isVisible, isMonitoring]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'good': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const calculateScore = () => {
    if (metrics.length === 0) return 0;
    const goodMetrics = metrics.filter(m => m.status === 'good').length;
    return Math.round((goodMetrics / metrics.length) * 100);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitor de Performance
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Pausar' : 'Iniciar'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Score Geral</span>
          <div className="flex items-center gap-2">
            <Progress value={calculateScore()} className="w-16" />
            <span className="text-sm font-bold">{calculateScore()}%</span>
          </div>
        </div>

        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`} />
              <span className="truncate">{metric.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">
                {metric.value.toFixed(0)} {metric.unit}
              </span>
              <Badge variant={getStatusVariant(metric.status)} className="text-xs">
                {metric.status === 'good' ? '✓' : metric.status === 'warning' ? '⚠' : '✗'}
              </Badge>
            </div>
          </div>
        ))}

        {metrics.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-4">
            Clique em "Iniciar" para monitorar performance
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Atualizado a cada 2 segundos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Hook para usar o monitor de performance
export const usePerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible(!isVisible);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return {
    isVisible,
    toggle,
    show,
    hide,
    PerformanceMonitor: () => <PerformanceMonitor isVisible={isVisible} />
  };
};

export default PerformanceMonitor;