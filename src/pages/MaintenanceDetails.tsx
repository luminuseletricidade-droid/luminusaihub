import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MaintenanceDetailsView from '@/components/MaintenanceDetailsView';

export default function MaintenanceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMaintenance = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenances')
        .select(`
          *,
          contracts!maintenances_contract_id_fkey (
            id,
            contract_number,
            clients!contracts_client_id_fkey (
              name
            )
          ),
          maintenance_status!maintenances_status_id_fkey (
            id,
            name,
            color,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Flatten the client name for easier access
      if (data.contracts?.clients) {
        data.client_name = data.contracts.clients.name;
      }

      // Flatten the status for easier access
      if (data.maintenance_status) {
        data.status_name = data.maintenance_status.name;
        data.status_color = data.maintenance_status.color;
      }

      setMaintenance(data);
    } catch (error) {
      console.error('Error loading maintenance:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da manutenção",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      loadMaintenance();
    }
  }, [id, loadMaintenance]);

  const handleUpdate = (updatedMaintenance: unknown) => {
    setMaintenance(updatedMaintenance);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando detalhes...</span>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg text-muted-foreground">Manutenção não encontrada</p>
        <Button onClick={() => navigate('/maintenances')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Manutenções
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/maintenances')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Detalhes da Manutenção</h1>
          <p className="text-muted-foreground">
            #{maintenance.id} - {maintenance.type}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <MaintenanceDetailsView 
        maintenance={maintenance} 
        onUpdate={handleUpdate}
      />
    </div>
  );
}