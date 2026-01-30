
import { IntelligentMetrics } from '@/components/IntelligentMetrics';
import { SmartAlerts } from '@/components/SmartAlerts';
import { QuickActions } from '@/components/QuickActions';
import { AIInsights } from '@/components/AIInsights';
import DebugPanel from '@/components/DebugPanel';
import { useOptimizedRealtimeSync } from '@/hooks/useOptimizedRealtimeSync';
import { useMaintenanceStatusSync } from '@/hooks/useMaintenanceStatusSync';
import { memo } from 'react';

const Dashboard = memo(() => {

  // Optimized real-time sync for dashboard
  useOptimizedRealtimeSync({
    tables: ['contracts', 'maintenances', 'clients'],
    showNotifications: false,
    debounceMs: 1000
  });

  // Auto-sync de status atrasados globalmente
  useMaintenanceStatusSync();


  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Métricas Principais */}
      <section>
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Visão Geral do Sistema</h2>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">
            Acompanhe as principais métricas e indicadores em tempo real
          </p>
        </div>
        <IntelligentMetrics />
      </section>

      {/* Alertas e Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <section>
          <div className="mb-2 sm:mb-3 lg:mb-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold">Alertas Inteligentes</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Notificações automáticas baseadas na análise dos dados
            </p>
          </div>
          <SmartAlerts />
        </section>

        <section>
          <div className="mb-2 sm:mb-3 lg:mb-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold">Ações Contextuais</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Acesso rápido às tarefas mais importantes no momento
            </p>
          </div>
          <QuickActions />
        </section>
      </div>

      {/* Insights da IA */}
      <section>
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold">Análise Inteligente</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Análises e recomendações personalizadas baseadas nos padrões dos seus dados
          </p>
        </div>
        <AIInsights />
      </section>

      {/* Debug Panel - Only visible in development */}
      <section>
        <DebugPanel />
      </section>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
