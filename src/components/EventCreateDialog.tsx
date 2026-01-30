import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Clock, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'maintenance' | 'meeting' | 'deadline';
  status: 'pending' | 'in_progress' | 'completed';
  technician?: string;
  client?: string;
  contractType?: 'Manutenção' | 'Híbrido' | 'Locação';
}

interface EventCreateDialogProps {
  onEventCreated?: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonText?: string;
  editingEvent?: CalendarEvent | null;
}

const EventCreateDialog: React.FC<EventCreateDialogProps> = ({
  onEventCreated,
  defaultDate,
  defaultTime,
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  buttonText = "Nova Atividade",
  editingEvent
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: editingEvent?.title.split(' - ')[1] || '',
    description: '',
    type: 'maintenance',
    date: editingEvent ? new Date(editingEvent.date) : (defaultDate || new Date()),
    time: editingEvent?.time || defaultTime || '09:00',
    technician: editingEvent?.technician || '',
    priority: 'medium',
    estimatedDuration: 120
  });

  // Atualizar formData quando editingEvent mudar
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title.split(' - ')[1] || editingEvent.title,
        description: '',
        type: 'maintenance',
        date: new Date(editingEvent.date),
        time: editingEvent.time,
        technician: editingEvent.technician || '',
        priority: 'medium',
        estimatedDuration: 120
      });
    } else if (!editingEvent) {
      setFormData({
        title: '',
        description: '',
        type: 'maintenance',
        date: defaultDate || new Date(),
        time: defaultTime || '09:00',
        technician: '',
        priority: 'medium',
        estimatedDuration: 120
      });
    }
  }, [editingEvent, defaultDate, defaultTime]);

  const handleCreateEvent = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editingEvent) {
        // Atualizar evento existente
        const { error } = await supabase
          .from('maintenances')
          .update({
            type: formData.title,
            description: formData.description,
            scheduled_date: format(formData.date, 'yyyy-MM-dd'),
            scheduled_time: formData.time,
            technician: formData.technician || null,
            priority: formData.priority,
            estimated_duration: formData.estimatedDuration
          })
          .eq('id', editingEvent.id);

        if (error) {
          throw error;
        }

        toast({
          title: "Sucesso",
          description: "Evento atualizado com sucesso"
        });
      } else {
        // Criar novo evento
        const { error } = await supabase
          .from('maintenances')
          .insert({
            type: formData.title,
            description: formData.description,
            scheduled_date: format(formData.date, 'yyyy-MM-dd'),
            scheduled_time: formData.time,
            technician: formData.technician || null,
            priority: formData.priority,
            estimated_duration: formData.estimatedDuration,
            status: 'scheduled',
            user_id: user.id
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Sucesso",
          description: "Evento criado com sucesso"
        });
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'maintenance',
        date: defaultDate || new Date(),
        time: defaultTime || '09:00',
        technician: '',
        priority: 'medium',
        estimatedDuration: 120
      });

      setOpen(false);
      onEventCreated?.();
    } catch (error) {
      console.error('Erro ao criar/atualizar evento:', error);
      toast({
        title: "Erro",
        description: `Falha ao ${editingEvent ? 'atualizar' : 'criar'} evento`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>{buttonText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Editar Atividade' : 'Criar Nova Atividade'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Manutenção preventiva gerador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva detalhes da atividade..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician">Técnico Responsável</Label>
            <Input
              id="technician"
              value={formData.technician}
              onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
              placeholder="Nome do técnico"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min)</Label>
              <Input
                id="duration"
                type="number"
                min="30"
                max="480"
                step="30"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 120 }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={loading}
            >
              {loading ? 
                (editingEvent ? "Atualizando..." : "Criando...") : 
                (editingEvent ? "Atualizar Atividade" : "Criar Atividade")
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventCreateDialog;