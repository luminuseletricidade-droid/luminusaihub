
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Clock, Edit2, Save, X } from 'lucide-react';
import { ServiceFrequencySelector } from './ServiceFrequencySelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContractService {
  id: string;
  service_name: string;
  description: string | null;
  frequency: string;
  duration: number;
  created_at: string;
}

interface EditableServiceCardProps {
  service: ContractService;
  onUpdate: () => void;
  onDelete: (serviceId: string) => void;
}

const frequencyLabels: Record<string, string> = {
  'diaria': 'Diária',
  'semanal': 'Semanal',
  'quinzenal': 'Quinzenal',
  'mensal': 'Mensal',
  'bimestral': 'Bimestral',
  'trimestral': 'Trimestral',
  'semestral': 'Semestral',
  'anual': 'Anual'
};

export const EditableServiceCard = ({ service, onUpdate, onDelete }: EditableServiceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    service_name: service.service_name,
    description: service.description || '',
    frequency: service.frequency,
    duration: service.duration
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!editData.service_name.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Nome do serviço é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('contract_services')
        .update({
          service_name: editData.service_name,
          description: editData.description || null,
          frequency: editData.frequency,
          duration: editData.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Serviço Atualizado",
        description: `Serviço "${editData.service_name}" foi atualizado com sucesso`
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar serviço",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      service_name: service.service_name,
      description: service.description || '',
      frequency: service.frequency,
      duration: service.duration
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-3">
              <Input
                value={editData.service_name}
                onChange={(e) => setEditData({ ...editData, service_name: e.target.value })}
                placeholder="Nome do serviço"
                className="font-semibold"
              />
            </div>
            <div className="flex gap-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="text-green-600 hover:text-green-700"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Descrição do serviço..."
            rows={2}
          />
          
          <ServiceFrequencySelector
            value={editData.frequency}
            onChange={(value) => setEditData({ ...editData, frequency: value })}
            disabled={isLoading}
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Duração Estimada (minutos)</label>
            <Input
              type="number"
              value={editData.duration}
              onChange={(e) => setEditData({ ...editData, duration: Number(e.target.value) })}
              min={15}
              max={480}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{service.service_name}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(service.id)}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {service.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {service.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {frequencyLabels[service.frequency] || service.frequency}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {service.duration}min
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
