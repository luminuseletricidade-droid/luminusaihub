import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

interface OverdueMaintenance {
  id: string;
  client_name: string;
  type: string;
  scheduled_date: string;
  description: string;
  technician: string;
}

interface OverdueMaintenanceAlertProps {
  onNavigateToMaintenances?: () => void;
}

const OverdueMaintenanceAlert: React.FC<OverdueMaintenanceAlertProps> = ({
  onNavigateToMaintenances
}) => {
  const [overdueMaintenances, setOverdueMaintenances] = useState<OverdueMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth();

  const fetchOverdueMaintenances = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('maintenances')
        .select(`
          id,
          contract_id,
          type,
          scheduled_date,
          description,
          technician,
          status
        `)
        .eq('status', 'overdue') // Buscar apenas manutenções atrasadas
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true })
        .limit(5); // Mostrar apenas as 5 mais atrasadas

      if (error) {
        console.error('Erro ao buscar manutenções atrasadas:', error);
        return;
      }

      // Buscar nomes dos clientes para cada manutenção
      const formattedData = await Promise.all((data || []).map(async (item) => {
        let clientName = 'Cliente não informado';
        
        if (item.contract_id) {
          const { data: contractData } = await supabase
            .from('contracts')
            .select('client_name')
            .eq('id', item.contract_id)
            .eq('user_id', user.id)
            .single();
          
          if (contractData) {
            clientName = contractData.client_name;
          }
        }
        
        return {
          ...item,
          client_name: clientName
        };
      }));
      
      setOverdueMaintenances(formattedData);
    } catch (error) {
      console.error('Erro ao carregar manutenções atrasadas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOverdueMaintenances();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchOverdueMaintenances, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchOverdueMaintenances]);

  const getDaysOverdue = (scheduledDate: string): number => {
    const today = new Date();
    const scheduled = new Date(scheduledDate);
    const diffTime = today.getTime() - scheduled.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (daysOverdue: number): string => {
    if (daysOverdue >= 7) return 'bg-red-600'; // Muito atrasado
    if (daysOverdue >= 3) return 'bg-red-500'; // Atrasado
    return 'bg-orange-500'; // Pouco atrasado
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-orange-300 h-6 w-6"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-orange-300 rounded w-3/4"></div>
              <div className="h-4 bg-orange-300 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isVisible || overdueMaintenances.length === 0) {
    return null;
  }

  return (
    <Alert className="border-red-200 bg-red-50 mb-6">
      <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
      <AlertTitle className="text-red-800 font-semibold">
        ⚠️ Manutenções Atrasadas ({overdueMaintenances.length})
      </AlertTitle>
      <AlertDescription className="text-red-700 mt-2">
        <div className="space-y-3">
          <p className="text-sm">
            Você tem <strong>{overdueMaintenances.length}</strong> manutenção(ões) com data vencida que precisam de atenção imediata.
          </p>
          
          <div className="space-y-2">
            {overdueMaintenances.map((maintenance) => {
              const daysOverdue = getDaysOverdue(maintenance.scheduled_date);
              
              return (
                <div 
                  key={maintenance.id}
                  className="bg-white rounded-lg p-3 border border-red-200 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          className={`${getUrgencyColor(daysOverdue)} text-white text-xs`}
                        >
                          {daysOverdue} dia{daysOverdue !== 1 ? 's' : ''} atrasado{daysOverdue !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {maintenance.type}
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {maintenance.client_name}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Prev: {formatDate(maintenance.scheduled_date)}</span>
                        </div>
                        
                        {maintenance.technician && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{maintenance.technician}</span>
                          </div>
                        )}
                      </div>
                      
                      {maintenance.description && (
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {maintenance.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-3 pt-2 border-t border-red-200">
            <Button 
              size="sm" 
              onClick={onNavigateToMaintenances}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ver Todas as Manutenções
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsVisible(false)}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Dispensar
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OverdueMaintenanceAlert;