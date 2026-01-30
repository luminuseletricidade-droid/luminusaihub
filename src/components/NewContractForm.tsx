import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Building2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateContractNumber } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';

interface NewContractFormProps {
  onContractCreated: (contract: unknown) => void;
  onClose: () => void;
}

const NewContractForm = ({ onContractCreated, onClose }: NewContractFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Cliente
    client_name: '',
    client_cnpj: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_city: '',
    client_state: '',
    client_zip_code: '',
    
    // Contrato
    contract_type: 'maintenance' as 'maintenance' | 'rental' | 'hybrid',
    status: 'active' as 'active' | 'inactive' | 'draft',
    value: '',
    start_date: '',
    end_date: '',
    description: '',
    
    // Equipamento
    equipment_type: '',
    equipment_model: '',
    equipment_location: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para gerar cronograma de manutenções automático
  const generateMaintenanceSchedule = async (contractId: string, contractType: string, startDate: string, endDate: string) => {
    try {
      console.log('Gerando cronograma de manutenções para contrato:', contractId);
      
      // Criar manutenções básicas baseadas no tipo de contrato
      const maintenances = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (contractType === 'maintenance' || contractType === 'hybrid') {
        // Manutenção preventiva mensal
        const currentDate = new Date(start);
        let monthCount = 1;
        
        while (currentDate <= end) {
          // Manutenção preventiva no dia 15 de cada mês
          const maintenanceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
          
          if (maintenanceDate >= start && maintenanceDate <= end) {
            maintenances.push({
              contract_id: contractId,
              user_id: user?.id,
              type: 'preventiva',
              description: `Manutenção preventiva mensal ${monthCount}`,
              scheduled_date: maintenanceDate.toISOString().split('T')[0],
              scheduled_time: '09:00:00',
              status: 'scheduled',
              priority: 'medium',
              estimated_duration: 120,
              technician: 'Técnico da Luminus'
            });
          }
          
          currentDate.setMonth(currentDate.getMonth() + 1);
          monthCount++;
        }
        
        // Manutenção corretiva trimestral
        const quarterlyDate = new Date(start);
        let quarterCount = 1;
        
        while (quarterlyDate <= end) {
          // Manutenção corretiva no primeiro dia do trimestre
          const maintenanceDate = new Date(quarterlyDate.getFullYear(), quarterlyDate.getMonth(), 1);
          
          if (maintenanceDate >= start && maintenanceDate <= end && quarterCount > 1) {
            maintenances.push({
              contract_id: contractId,
              user_id: user?.id,
              type: 'corretiva',
              description: `Manutenção corretiva trimestral ${quarterCount}`,
              scheduled_date: maintenanceDate.toISOString().split('T')[0],
              scheduled_time: '08:00:00',
              status: 'scheduled',
              priority: 'high',
              estimated_duration: 240,
              technician: 'Especialista Luminus'
            });
          }
          
          quarterlyDate.setMonth(quarterlyDate.getMonth() + 3);
          quarterCount++;
        }
      }
      
      // Inserir manutenções no banco de dados
      if (maintenances.length > 0) {
        const { error } = await supabase
          .from('maintenances')
          .insert(maintenances);
          
        if (error) {
          console.error('Erro ao criar manutenções automáticas:', error);
        } else {
          console.log(`${maintenances.length} manutenções criadas automaticamente`);
        }
      }
      
    } catch (error) {
      console.error('Erro ao gerar cronograma de manutenções:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Criar cliente primeiro
      let clientId = null;
      if (formData.client_name.trim()) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .insert([{
            name: formData.client_name,
            cnpj: formData.client_cnpj,
            email: formData.client_email,
            phone: formData.client_phone,
            address: formData.client_address,
            city: formData.client_city,
            state: formData.client_state,
            zip_code: formData.client_zip_code,
            user_id: user?.id
          }])
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = clientData.id;
      }

      // 2. Criar contrato
      const contractNumber = generateContractNumber();
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          contract_number: contractNumber,
          client_id: clientId,
          contract_type: formData.contract_type,
          status: formData.status,
          value: formData.value ? parseFloat(formData.value) : 0,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          description: formData.description,
          user_id: user?.id
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      // 3. Criar equipamento se informado
      if (formData.equipment_type.trim()) {
        const { error: equipmentError } = await supabase
          .from('equipment')
          .insert([{
            contract_id: contractData.id,
            type: formData.equipment_type,
            model: formData.equipment_model,
            location: formData.equipment_location,
            quantity: 1,
            user_id: user?.id
          }]);

        if (equipmentError) {
          console.error('Error creating equipment:', equipmentError);
        }
      }

      // 4. Gerar manutenções automáticas baseadas no tipo de contrato
      if (formData.contract_type === 'maintenance' || formData.contract_type === 'hybrid') {
        await generateMaintenanceSchedule(contractData.id, formData.contract_type, formData.start_date, formData.end_date);
      }

      // Notificar sucesso
      toast({
        title: "Contrato criado!",
        description: `Contrato ${contractNumber} foi criado com sucesso${formData.contract_type === 'maintenance' || formData.contract_type === 'hybrid' ? ' e manutenções foram agendadas automaticamente' : ''}.`,
      });

      // Retornar dados do contrato criado
      onContractCreated({
        ...contractData,
        client: {
          name: formData.client_name || 'Cliente não informado',
          cnpj: formData.client_cnpj,
          email: formData.client_email,
          phone: formData.client_phone,
          address: formData.client_address
        },
        equipment: {
          type: formData.equipment_type || null,
          model: formData.equipment_model,
          identification: contractData.id.slice(-6),
          location: formData.equipment_location
        }
      });

      onClose();

    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Erro ao criar contrato",
        description: "Não foi possível criar o contrato. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Plus className="h-5 w-5 mr-2 text-primary" />
            Novo Contrato
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-primary" />
              Informações do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Nome da Empresa *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Ex: Empresa ABC Ltda"
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_cnpj">CNPJ</Label>
                <Input
                  id="client_cnpj"
                  value={formData.client_cnpj}
                  onChange={(e) => handleInputChange('client_cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="client_phone">Telefone</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => handleInputChange('client_phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="md:col-span-2">
                <AddressFormWithCep
                  cep={formData.client_zip_code}
                  address={formData.client_address}
                  city={formData.client_city}
                  state={formData.client_state}
                  onCepChange={(value) => handleInputChange('client_zip_code', value)}
                  onAddressChange={(value) => handleInputChange('client_address', value)}
                  onCityChange={(value) => handleInputChange('client_city', value)}
                  onStateChange={(value) => handleInputChange('client_state', value)}
                  showLabels={true}
                  required={false}
                />
              </div>
            </div>
          </div>

          {/* Informações do Contrato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Informações do Contrato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contract_type">Tipo de Contrato *</Label>
                <Select value={formData.contract_type} onValueChange={(value: 'maintenance' | 'rental' | 'hybrid') => handleInputChange('contract_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">
                      <div className="flex items-center gap-2">
                        <span>Manutenção</span>
                        <Badge variant="secondary" className="text-xs">Auto-cronograma</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="rental">Locação</SelectItem>
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2">
                        <span>Híbrido</span>
                        <Badge variant="secondary" className="text-xs">Auto-cronograma</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {(formData.contract_type === 'maintenance' || formData.contract_type === 'hybrid') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ Manutenções preventivas e corretivas serão agendadas automaticamente
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'draft') => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">Valor Anual (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="start_date">Data de Início</Label>
                <DatePicker
                  id="start_date"
                  value={formData.start_date}
                  onChangeString={(date) => handleInputChange('start_date', date)}
                  allowWeekends={true}
                  placeholder="Selecione a data de início"
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data de Término</Label>
                <DatePicker
                  id="end_date"
                  value={formData.end_date}
                  onChangeString={(date) => handleInputChange('end_date', date)}
                  allowWeekends={true}
                  placeholder="Selecione a data de término"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição detalhada do contrato..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Informações do Equipamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Equipamento (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) => handleInputChange('equipment_type', e.target.value)}
                  placeholder="Ex: Gerador Caterpillar 200kVA"
                />
              </div>
              <div>
                <Label htmlFor="equipment_model">Modelo</Label>
                <Input
                  id="equipment_model"
                  value={formData.equipment_model}
                  onChange={(e) => handleInputChange('equipment_model', e.target.value)}
                  placeholder="Ex: CAT DE200E0"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="equipment_location">Localização</Label>
                <Input
                  id="equipment_location"
                  value={formData.equipment_location}
                  onChange={(e) => handleInputChange('equipment_location', e.target.value)}
                  placeholder="Local onde o equipamento está instalado"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Contrato'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewContractForm;