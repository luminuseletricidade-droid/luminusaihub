
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ServiceFrequencySelector } from './ServiceFrequencySelector';
import { useSupabaseOperations } from '@/hooks/useSupabaseOperations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContractServiceFormProps {
  contractId: string;
  onServiceAdded?: () => void;
}

export const ContractServiceForm = ({ contractId, onServiceAdded }: ContractServiceFormProps) => {
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('mensal');
  const [duration, setDuration] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de Autenticação",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    if (!serviceName.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Nome do serviço é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contract_services')
        .insert({
          contract_id: contractId,
          service_name: serviceName,
          description: description || null,
          frequency,
          duration,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Serviço Adicionado",
        description: `Serviço "${serviceName}" adicionado com frequência ${frequency}. Manutenções foram geradas automaticamente.`
      });

      // Reset form
      setServiceName('');
      setDescription('');
      setFrequency('mensal');
      setDuration(120);
      
      if (onServiceAdded) {
        onServiceAdded();
      }
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar serviço",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Adicionar Serviço de Manutenção</h3>
      
      <div className="space-y-2">
        <Label htmlFor="serviceName">Nome do Serviço *</Label>
        <Input
          id="serviceName"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="Ex: Troca de óleo, Inspeção elétrica..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição detalhada do serviço..."
          rows={3}
        />
      </div>

      <ServiceFrequencySelector
        value={frequency}
        onChange={setFrequency}
        disabled={isSubmitting}
      />

      <div className="space-y-2">
        <Label htmlFor="duration">Duração Estimada (minutos)</Label>
        <Input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min={15}
          max={480}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Adicionando...' : 'Adicionar Serviço'}
      </Button>
    </form>
  );
};
