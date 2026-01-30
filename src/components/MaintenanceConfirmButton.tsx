import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getMaintenanceStatusInfo, canTransitionStatus } from '@/config/maintenanceStatus';

interface MaintenanceConfirmButtonProps {
  maintenanceId: string;
  currentStatus: string;
  scheduledDate?: string;
  clientName?: string;
  onConfirm?: (maintenanceId: string) => void;
  className?: string;
}

export function MaintenanceConfirmButton({
  maintenanceId,
  currentStatus,
  scheduledDate,
  clientName,
  onConfirm,
  className = ''
}: MaintenanceConfirmButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Verificar se pode confirmar
  const statusInfo = getMaintenanceStatusInfo(currentStatus);
  const canConfirm = canTransitionStatus(currentStatus, 'confirmed');

  if (!canConfirm) {
    return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Chamar a função RPC para confirmar manutenção
      const { data, error } = await supabase.rpc('confirm_maintenance', {
        p_maintenance_id: maintenanceId,
        p_confirmation_method: 'manual'
      });

      if (error) throw error;

      if (data === true) {
        toast({
          title: "Manutenção Confirmada",
          description: `A manutenção foi confirmada com sucesso.`,
        });

        // Callback para atualizar a interface
        if (onConfirm) {
          onConfirm(maintenanceId);
        }

        // Disparar evento para atualizar listas
        window.dispatchEvent(new CustomEvent('maintenanceUpdated', {
          detail: { id: maintenanceId, status: 'confirmed' }
        }));
      } else {
        toast({
          title: "Não foi possível confirmar",
          description: "A manutenção não está em status agendado.",
          variant: "destructive"
        });
      }

      setOpen(false);
    } catch (error) {
      console.error('Erro ao confirmar manutenção:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar manutenção. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('pt-BR')
    : 'data não definida';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={`bg-green-600 hover:bg-green-700 ${className}`}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CalendarCheck className="h-4 w-4 mr-2" />
          )}
          Confirmar Manutenção
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Manutenção</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a confirmar a seguinte manutenção:
            <div className="mt-4 space-y-2 text-sm">
              {clientName && (
                <div>
                  <span className="font-semibold">Cliente:</span> {clientName}
                </div>
              )}
              <div>
                <span className="font-semibold">Data agendada:</span> {formattedDate}
              </div>
              <div>
                <span className="font-semibold">Status atual:</span> {statusInfo.label}
              </div>
            </div>
            <div className="mt-4">
              Após a confirmação, o cliente será notificado e a manutenção será
              marcada como "Confirmada". No dia agendado, o status mudará
              automaticamente para "Em Andamento".
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? 'Confirmando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}