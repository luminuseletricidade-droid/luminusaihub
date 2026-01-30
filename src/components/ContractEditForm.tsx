
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';

interface ContractEditFormProps {
  contract: unknown;
  onSave: (updatedContract: unknown) => void;
  onCancel: () => void;
}

const ContractEditForm = ({ contract, onSave, onCancel }: ContractEditFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    contract_number: contract.contract_number || '',
    status: contract.status || 'active',
    contract_type: contract.contract_type || 'maintenance',
    start_date: contract.start_date || '',
    end_date: contract.end_date || '',
    value: contract.value || 0,
    description: contract.description || '',
    client_name: contract.client?.name || '',
    client_cnpj: contract.client?.cnpj || '',
    client_email: contract.client?.email || '',
    client_phone: contract.client?.phone || '',
    client_address: contract.client?.address || '',
    client_city: contract.client?.city || '',
    client_state: contract.client?.state || '',
    client_zip_code: contract.client?.zip_code || '',
    equipment_type: contract.equipment?.type || '',
    equipment_model: contract.equipment?.model || '',
    equipment_location: contract.equipment?.location || ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Update contract
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          contract_number: formData.contract_number,
          status: formData.status,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          value: formData.value,
          description: formData.description
        })
        .eq('id', contract.id);

      if (contractError) throw contractError;

      // Update client if exists
      if (contract.client_id) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: formData.client_name,
            cnpj: formData.client_cnpj,
            email: formData.client_email,
            phone: formData.client_phone,
            address: formData.client_address
          })
          .eq('id', contract.client_id);

        if (clientError) throw clientError;
      }

      // Update equipment
      const { error: equipmentError } = await supabase
        .from('equipment')
        .update({
          type: formData.equipment_type,
          model: formData.equipment_model,
          location: formData.equipment_location
        })
        .eq('contract_id', contract.id);

      if (equipmentError) throw equipmentError;

      toast({
        title: "Contrato atualizado",
        description: "Os dados do contrato foram salvos com sucesso.",
      });

      // Return updated contract data
      const updatedContract = {
        ...contract,
        contract_number: formData.contract_number,
        status: formData.status,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        value: formData.value,
        description: formData.description,
        client: {
          ...contract.client,
          name: formData.client_name,
          cnpj: formData.client_cnpj,
          email: formData.client_email,
          phone: formData.client_phone,
          address: formData.client_address
        },
        equipment: {
          ...contract.equipment,
          type: formData.equipment_type,
          model: formData.equipment_model,
          location: formData.equipment_location
        }
      };

      onSave(updatedContract);

    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">✏️ Editar Contrato</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contract Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              📄 Informações do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contract_number">Número do Contrato</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => handleInputChange('contract_number', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                  <SelectItem value="renewal">Renovação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contract_type">Tipo de Contrato</Label>
              <Select value={formData.contract_type} onValueChange={(value) => handleInputChange('contract_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="rental">Locação</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data Início</Label>
                <DatePicker
                  id="start_date"
                  value={formData.start_date}
                  onChangeString={(date) => handleInputChange('start_date', date)}
                  allowWeekends={true}
                  placeholder="Selecione a data de início"
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data Fim</Label>
                <DatePicker
                  id="end_date"
                  value={formData.end_date}
                  onChangeString={(date) => handleInputChange('end_date', date)}
                  allowWeekends={true}
                  placeholder="Selecione a data de fim"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="value">Valor Anual (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              🏢 Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="client_name">Nome da Empresa</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="client_cnpj">CNPJ</Label>
              <Input
                id="client_cnpj"
                value={formData.client_cnpj}
                onChange={(e) => handleInputChange('client_cnpj', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="client_email">Email</Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => handleInputChange('client_email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="client_phone">Telefone</Label>
              <Input
                id="client_phone"
                value={formData.client_phone}
                onChange={(e) => handleInputChange('client_phone', e.target.value)}
              />
            </div>

            <div>
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
          </CardContent>
        </Card>

        {/* Equipment Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              🔧 Informações do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) => handleInputChange('equipment_type', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="equipment_model">Modelo</Label>
                <Input
                  id="equipment_model"
                  value={formData.equipment_model}
                  onChange={(e) => handleInputChange('equipment_model', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="equipment_location">Localização</Label>
                <Input
                  id="equipment_location"
                  value={formData.equipment_location}
                  onChange={(e) => handleInputChange('equipment_location', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractEditForm;
