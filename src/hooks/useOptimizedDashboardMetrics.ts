import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface DashboardMetrics {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  totalMaintenances: number;
  pendingMaintenances: number;
  upcomingMaintenances: number;
  overdueMaintenances: number;
  monthlyRevenue: number;
  completionRate: number;
  averageResponseTime: number;
  contractsGrowth: number;
  revenueGrowth: number;
  maintenanceEfficiency: number;
}

export const useOptimizedDashboardMetrics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use single optimized dashboard metrics endpoint
  const {
    data: dashboardData,
    isLoading
  } = useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching dashboard metrics...');
        // Use the dashboard API metrics endpoint
        const metricsData = await dashboardApi.getMetrics();
        console.log('✅ Dashboard metrics received:', metricsData);
        return metricsData;
      } catch (error: unknown) {
        console.error('❌ Dashboard metrics error:', error);
        // Fallback to empty metrics on error
        return {
          totalContracts: 0,
          activeContracts: 0,
          expiringContracts: 0,
          expiredContracts: 0,
          totalMaintenances: 0,
          pendingMaintenances: 0,
          upcomingMaintenances: 0,
          overdueMaintenances: 0,
          monthlyRevenue: 0,
          completionRate: 0,
          averageResponseTime: 0,
          contractsGrowth: 0,
          revenueGrowth: 0,
          maintenanceEfficiency: 0
        };
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Return the optimized metrics directly from backend
  const metrics: DashboardMetrics = useMemo(() => {
    console.log('📊 Processing dashboard data:', dashboardData);

    // If we have data from backend, use it directly
    if (dashboardData && typeof dashboardData === 'object') {
      const processedMetrics = dashboardData as DashboardMetrics;
      console.log('✨ Processed metrics:', processedMetrics);
      return processedMetrics;
    }

    console.log('⚠️ No dashboard data, using fallback empty metrics');
    // Fallback to empty metrics
    return {
      totalContracts: 0,
      activeContracts: 0,
      expiringContracts: 0,
      expiredContracts: 0,
      totalMaintenances: 0,
      pendingMaintenances: 0,
      upcomingMaintenances: 0,
      overdueMaintenances: 0,
      monthlyRevenue: 0,
      completionRate: 0,
      averageResponseTime: 0,
      contractsGrowth: 0,
      revenueGrowth: 0,
      maintenanceEfficiency: 0
    };
  }, [dashboardData]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', user?.id] });
  };

  return {
    metrics,
    isLoading,
    refresh
  };
};