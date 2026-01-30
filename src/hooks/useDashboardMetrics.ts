
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  contracts: {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
  };
  maintenances: {
    total: number;
    pending: number;
    upcoming: number;
    overdue: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  performance: {
    completionRate: number;
    averageResponseTime: number;
    customerSatisfaction: number;
  };
}

interface ContractData {
  status: string | null;
  end_date: string | null;
  value: number | null;
}

interface MaintenanceData {
  status: string | null;
  scheduled_date: string | null;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const dayInMs = 1000 * 60 * 60 * 24;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parseDateOnly = (value: string | null | undefined): Date | null => {
        if (!value) return null;
        const [datePart] = value.split('T');
        const parts = datePart.split('-');
        if (parts.length !== 3) return null;
        const [year, month, day] = parts.map(Number);
        return new Date(year, month - 1, day);
      };

      // Fetch contract metrics with explicit typing
      const contractQuery = await supabase
        .from('contracts')
        .select('status, end_date, value')
        .eq('user_id', user.id);

      const contractData: ContractData[] = contractQuery.data || [];
      setContracts(contractData);

      // Fetch maintenance metrics with explicit typing
      const maintenanceQuery = await supabase
        .from('maintenances')
        .select('status, scheduled_date')
        .eq('user_id', user.id);

      const maintenanceData: MaintenanceData[] = maintenanceQuery.data || [];
      setMaintenances(maintenanceData);

      // Calculate contract metrics
      const contracts = contractData;
      const activeContracts = contracts.filter(c => c.status === 'active').length;
      const expiredContracts = contracts.filter(c => {
        const endDate = parseDateOnly(c.end_date);
        return !!endDate && endDate.getTime() < today.getTime();
      }).length;

      const expiringSoon = contracts.filter(c => {
        const endDate = parseDateOnly(c.end_date);
        if (!endDate) return false;
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / dayInMs);
        return diffDays <= 30 && diffDays > 0;
      }).length;

      // Calculate maintenance metrics
      const maintenances = maintenanceData;
      const pendingMaintenances = maintenances.filter(m => ['scheduled', 'pending'].includes(m.status || '')).length;
      const upcomingMaintenances = maintenances.filter(m => {
        const scheduledDate = parseDateOnly(m.scheduled_date);
        if (!scheduledDate) return false;
        const diffDays = Math.ceil((scheduledDate.getTime() - today.getTime()) / dayInMs);
        return diffDays >= 0 && diffDays <= 7;
      }).length;
      const overdueMaintenances = maintenances.filter(m => {
        if (!m.scheduled_date || ['completed', 'cancelled'].includes(m.status || '')) return false;
        const scheduledDate = parseDateOnly(m.scheduled_date);
        if (!scheduledDate) return false;
        return scheduledDate.getTime() < today.getTime();
      }).length;

      // Calculate revenue (mock calculation based on active contracts)
      const totalRevenue = contracts.reduce((sum, contract) => sum + (contract.value || 0), 0);
      const thisMonth = totalRevenue * 0.08; // Mock monthly revenue
      const lastMonth = totalRevenue * 0.075;
      const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

      setMetrics({
        contracts: {
          total: contracts.length,
          active: activeContracts,
          expired: expiredContracts,
          expiringSoon
        },
        maintenances: {
          total: maintenances.length,
          pending: pendingMaintenances,
          upcoming: upcomingMaintenances,
          overdue: overdueMaintenances
        },
        revenue: {
          thisMonth,
          lastMonth,
          growth
        },
        performance: {
          completionRate: maintenances.length > 0 ? 
            ((maintenances.filter(m => m.status === 'completed').length / maintenances.length) * 100) : 0,
          averageResponseTime: 2.4, // Mock data
          customerSatisfaction: 4.7 // Mock data
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const loadMetrics = async () => {
      if (isMounted) {
        await fetchMetrics();
      }
    };
    
    loadMetrics();
    
    // Refresh metrics every 5 minutes with cleanup check
    const interval = setInterval(() => {
      if (isMounted) {
        fetchMetrics();
      }
    }, 5 * 60 * 1000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  return { metrics, contracts, maintenances, loading, refresh: fetchMetrics };
};
