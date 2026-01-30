import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Wrench,
  FileText,
  Camera,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate as formatDateUtil } from '@/utils/formatters';
import MaintenanceDetailsView from './MaintenanceDetailsView';

interface MaintenanceKanbanCardProps {
  maintenance: unknown;
  onUpdate: (updatedMaintenance: unknown) => void;
  children: React.ReactNode;
}

const statusSteps = [
  { key: 'scheduled', label: 'Agendada', icon: Calendar, color: 'text-blue-600' },
  { key: 'in_progress', label: 'Iniciada', icon: PlayCircle, color: 'text-orange-600' },
  { key: 'executing', label: 'Em Execução', icon: Wrench, color: 'text-yellow-600' },
  { key: 'reviewing', label: 'Checklist', icon: CheckCircle, color: 'text-purple-600' },
  { key: 'completed', label: 'Finalizada', icon: CheckCircle, color: 'text-green-600' }
];

const checklistItems = [
  { id: 'tools', label: 'Ferramentas preparadas', required: true },
  { id: 'safety', label: 'Equipamentos de segurança verificados', required: true },
  { id: 'equipment_status', label: 'Status do equipamento verificado', required: true },
  { id: 'maintenance_performed', label: 'Manutenção executada conforme procedimento', required: true },
  { id: 'tests', label: 'Testes de funcionamento realizados', required: true },
  { id: 'cleanup', label: 'Limpeza e organização do local', required: false },
  { id: 'documentation', label: 'Documentação atualizada', required: false }
];

export const MaintenanceKanbanCard = ({ maintenance, onUpdate, children }: MaintenanceKanbanCardProps) => {
  const [open, setOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(maintenance.status || 'scheduled');
  const [notes, setNotes] = useState(maintenance.notes || '');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize checklist state
    const initialChecklist: Record<string, boolean> = {};
    checklistItems.forEach(item => {
      initialChecklist[item.id] = false;
    });
    setChecklist(initialChecklist);
  }, []);

  const getCurrentStatusIndex = () => {
    return statusSteps.findIndex(step => step.key === currentStatus);
  };

  const getProgress = () => {
    const currentIndex = getCurrentStatusIndex();
    return ((currentIndex + 1) / statusSteps.length) * 100;
  };

  const getCompletedChecklist = () => {
    const completedItems = Object.values(checklist).filter(Boolean).length;
    return completedItems;
  };

  const getChecklistProgress = () => {
    const completed = getCompletedChecklist();
    return (completed / checklistItems.length) * 100;
  };

  const canAdvanceStatus = () => {
    if (currentStatus === 'reviewing') {
      const requiredItems = checklistItems.filter(item => item.required);
      const completedRequired = requiredItems.filter(item => checklist[item.id]);
      return completedRequired.length === requiredItems.length;
    }
    return true;
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
  };

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        status: currentStatus,
        notes: notes,
        updated_at: new Date().toISOString(),
        ...(currentStatus === 'completed' && { completed_date: new Date().toISOString().split('T')[0] })
      };

      const { data, error } = await supabase
        .from('maintenances')
        .update(updateData)
        .eq('id', maintenance.id)
        .select()
        .single();

      if (error) throw error;

      // Garantir atualização imediata no componente pai
      if (data && onUpdate) {
        onUpdate({
          ...maintenance,
          ...data,
          status: data.status || currentStatus
        });
      }

      setOpen(false);
      toast({
        title: "Sucesso",
        description: "Manutenção atualizada com sucesso",
      });

      // Forçar refresh da lista após um pequeno delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('maintenanceUpdated', { detail: data }));
      }, 100);
    } catch (error) {
      console.error('Error updating maintenance:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar manutenção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const step = statusSteps.find(s => s.key === status);
    if (!step) return Clock;
    return step.icon;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não definida';
    return formatDateUtil(dateString) || 'Data inválida';
  };

  const StatusIcon = getStatusIcon(currentStatus);

  // Crie um objeto de manutenção completo com todos os dados
  const [maintenanceData, setMaintenanceData] = useState(maintenance);

  useEffect(() => {
    // Atualiza quando a manutenção mudar
    setMaintenanceData(maintenance);
    setCurrentStatus(maintenance.status || 'scheduled');
    setNotes(maintenance.notes || '');
  }, [maintenance]);

  const handleMaintenanceUpdate = (updatedMaintenance: unknown) => {
    setMaintenanceData(updatedMaintenance);
    onUpdate(updatedMaintenance);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes da Manutenção</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <MaintenanceDetailsView
            maintenance={maintenanceData}
            onUpdate={handleMaintenanceUpdate}
            onClose={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};