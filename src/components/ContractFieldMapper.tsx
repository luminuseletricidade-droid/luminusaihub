import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, Sparkles, Save, RefreshCw, Lightbulb, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';

interface ExtractedData {
  cliente?: {
    nome?: string;
    cnpj?: string;
    contato?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
  };
  contrato?: {
    numero?: string;
    tipo?: 'manutencao' | 'locacao' | 'hibrido';
    valor_mensal?: number;
    valor_total?: number;
    data_inicio?: string;
    data_fim?: string;
    status?: string;
  };
  equipamentos?: Array<{
    tipo?: string;
    modelo?: string;
    quantidade?: number;
    localizacao?: string;
  }>;
  servicos?: Array<{
    tipo?: string;
    frequencia?: string;
    descricao?: string;
  }>;
  observacoes?: string;
  confiabilidade?: 'alta' | 'media' | 'baixa';
}

interface ContractFieldMapperProps {
  contractId: string;
  extractedData: ExtractedData;
  fullText?: string;
  onSaveSuccess: (contractData: unknown) => void;
  onCancel: () => void;
}

const ContractFieldMapper = ({ 
  contractId, 
  extractedData, 
  fullText = '',
  onSaveSuccess, 
  onCancel 
}: ContractFieldMapperProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'warning' | 'error'>>({});
  
  // Mapeamento dos campos do formulário
  const [formData, setFormData] = useState({
    // Dados do cliente
    client_name: extractedData.cliente?.nome || '',
    client_cnpj: extractedData.cliente?.cnpj || '',
    client_email: extractedData.cliente?.email || '',
    client_phone: extractedData.cliente?.telefone || '',
    client_address: extractedData.cliente?.endereco || '',
    client_city: '',
    client_state: '',
    client_zip_code: '',
    client_emergency_contact: extractedData.cliente?.contato || '',
    
    // Dados do contrato
    contract_number: extractedData.contrato?.numero || '',
    contract_type: extractedData.contrato?.tipo || 'manutencao',
    value: extractedData.contrato?.valor_total || extractedData.contrato?.valor_mensal || 0,
    start_date: extractedData.contrato?.data_inicio || '',
    end_date: extractedData.contrato?.data_fim || '',
    status: extractedData.contrato?.status || 'active',
    description: extractedData.observacoes || '',
    
    // Equipamentos
    equipment_type: extractedData.equipamentos?.[0]?.tipo || '',
    equipment_model: extractedData.equipamentos?.[0]?.modelo || '',
    equipment_quantity: extractedData.equipamentos?.[0]?.quantidade || 1,
    equipment_location: extractedData.equipamentos?.[0]?.localizacao || '',
    
    // Serviços
    services: extractedData.servicos || []
  });

  // Validação automática
  const validateFields = useCallback(() => {
    const newValidation: Record<string, 'valid' | 'warning' | 'error'> = {};
    
    // Validar CNPJ
    if (formData.client_cnpj) {
      const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
      newValidation.client_cnpj = cnpjPattern.test(formData.client_cnpj) ? 'valid' : 'warning';
    }
    
    // Validar email
    if (formData.client_email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      newValidation.client_email = emailPattern.test(formData.client_email) ? 'valid' : 'warning';
    }
    
    // Validar datas
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      newValidation.dates = endDate > startDate ? 'valid' : 'error';
    }
    
    // Validar valor
    newValidation.value = formData.value > 0 ? 'valid' : 'warning';
    
    // Campos obrigatórios
    newValidation.client_name = formData.client_name ? 'valid' : 'error';
    newValidation.contract_number = formData.contract_number ? 'valid' : 'error';
    
    setValidationStatus(newValidation);
  }, [formData]);

  useEffect(() => {
    validateFields();
  }, [validateFields]);

  const getFieldStatus = (field: string) => {
    return validationStatus[field] || 'valid';
  };

  const getFieldIcon = (field: string) => {
    const status = getFieldStatus(field);
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const reprocessWithAI = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-contract-data', {
        body: {
          contractId,
          reprocess: true,
          currentFields: formData
        }
      });

      if (error) throw error;

      if (data.extractedData) {
        // Atualizar formData com novos dados extraídos
        const newData = data.extractedData;
        setFormData(prev => ({
          ...prev,
          // Mesclar dados preservando edições manuais
          client_name: newData.cliente?.nome || prev.client_name,
          client_cnpj: newData.cliente?.cnpj || prev.client_cnpj,
          client_email: newData.cliente?.email || prev.client_email,
          // ... outros campos
        }));

        toast({
          title: "Reprocessamento concluído",
          description: "Dados atualizados com nova análise da IA",
        });
      }
    } catch (error) {
      console.error('Erro no reprocessamento:', error);
      toast({
        title: "Erro no reprocessamento",
        description: "Não foi possível reprocessar os dados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Buscar o status "Ativo" para associar ao cliente
      const { data: activeStatus } = await supabase
        .from('client_status')
        .select('id')
        .eq('name', 'Ativo')
        .eq('is_active', true)
        .single();

      // 1. Criar/atualizar cliente
      const clientData = {
        name: formData.client_name,
        cnpj: formData.client_cnpj,
        email: formData.client_email,
        phone: formData.client_phone,
        address: formData.client_address,
        city: formData.client_city,
        state: formData.client_state,
        zip_code: formData.client_zip_code,
        emergency_contact: formData.client_emergency_contact,
        status_id: activeStatus?.id || null
      };

      // Primeiro verificar se cliente já existe
      let clientResult;
      if (formData.client_cnpj) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select()
          .eq('cnpj', formData.client_cnpj)
          .single();

        if (existingClient) {
          // Atualizar cliente existente
          const { data: updatedClient, error: updateError } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', existingClient.id)
            .select()
            .single();
          if (updateError) throw updateError;
          clientResult = updatedClient;
        } else {
          // Criar novo cliente
          const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert(clientData)
            .select()
            .single();
          if (insertError) throw insertError;
          clientResult = newClient;
        }
      } else {
        // Criar cliente sem CNPJ
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();
        if (insertError) throw insertError;
        clientResult = newClient;
      }

      

      // 2. Atualizar contrato
      const contractData = {
        contract_number: formData.contract_number,
        contract_type: formData.contract_type,
        value: formData.value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        description: formData.description,
        client_id: clientResult.id,
        services: formData.services
      };

      const { data: contractResult, error: contractError } = await supabase
        .from('contracts')
        .update(contractData)
        .eq('id', contractId)
        .select(`
          *,
          clients(*)
        `)
        .single();

      if (contractError) throw contractError;

      // 3. Criar/atualizar equipamento
      if (formData.equipment_type) {
        // Verificar se equipamento já existe para este contrato
        const { data: existingEquipment } = await supabase
          .from('equipment')
          .select()
          .eq('contract_id', contractId)
          .single();

        const equipmentData = {
          contract_id: contractId,
          type: formData.equipment_type,
          model: formData.equipment_model,
          quantity: formData.equipment_quantity,
          location: formData.equipment_location
        };

        if (existingEquipment) {
          await supabase
            .from('equipment')
            .update(equipmentData)
            .eq('contract_id', contractId);
        } else {
          await supabase
            .from('equipment')
            .insert(equipmentData);
        }
      }

      toast({
        title: "Contrato salvo com sucesso!",
        description: "Todos os dados foram mapeados e salvos no sistema",
      });

      onSaveSuccess(contractResult);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados do contrato",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceLevel = extractedData.confiabilidade || 'media';
  const confidenceColor = {
    alta: 'text-green-600',
    media: 'text-yellow-600',
    baixa: 'text-red-600'
  }[confidenceLevel];

  return (
    <div className="space-y-6">
      {/* Header com confiança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Mapeamento de Campos - IA</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={confidenceColor}>
                Confiança: {confidenceLevel.toUpperCase()}
              </Badge>
              <Button variant="outline" size="sm" onClick={reprocessWithAI} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reprocessar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Os campos foram preenchidos automaticamente pela IA. Revise e corrija conforme necessário.
              Campos com ícones verdes estão validados, amarelos precisam de atenção e vermelhos são obrigatórios.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs para campos mapeados e texto completo */}
      <Tabs defaultValue="fields" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fields" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Campos Mapeados</span>
          </TabsTrigger>
          <TabsTrigger value="fulltext" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Texto Completo</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fields" className="space-y-6">

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="flex items-center space-x-2">
                <span>Nome/Razão Social *</span>
                {getFieldIcon('client_name')}
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleFieldChange('client_name', e.target.value)}
                className={getFieldStatus('client_name') === 'error' ? 'border-red-500' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_cnpj" className="flex items-center space-x-2">
                <span>CNPJ/CPF</span>
                {getFieldIcon('client_cnpj')}
              </Label>
              <Input
                id="client_cnpj"
                value={formData.client_cnpj}
                onChange={(e) => handleFieldChange('client_cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_email" className="flex items-center space-x-2">
                <span>Email</span>
                {getFieldIcon('client_email')}
              </Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => handleFieldChange('client_email', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_phone">Telefone</Label>
              <Input
                id="client_phone"
                value={formData.client_phone}
                onChange={(e) => handleFieldChange('client_phone', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <AddressFormWithCep
              cep={formData.client_zip_code}
              address={formData.client_address}
              city={formData.client_city}
              state={formData.client_state}
              onCepChange={(value) => handleFieldChange('client_zip_code', value)}
              onAddressChange={(value) => handleFieldChange('client_address', value)}
              onCityChange={(value) => handleFieldChange('client_city', value)}
              onStateChange={(value) => handleFieldChange('client_state', value)}
              showLabels={true}
              required={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados do Contrato */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number" className="flex items-center space-x-2">
                <span>Número do Contrato *</span>
                {getFieldIcon('contract_number')}
              </Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => handleFieldChange('contract_number', e.target.value)}
                className={getFieldStatus('contract_number') === 'error' ? 'border-red-500' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contract_type">Tipo do Contrato</Label>
              <Select value={formData.contract_type} onValueChange={(value) => handleFieldChange('contract_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value" className="flex items-center space-x-2">
                <span>Valor (R$)</span>
                {getFieldIcon('value')}
              </Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => handleFieldChange('value', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFieldChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center space-x-2">
                <span>Data de Início</span>
                {getFieldStatus('dates') === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </Label>
              <DatePicker
                id="start_date"
                value={formData.start_date}
                onChangeString={(date) => handleFieldChange('start_date', date)}
                allowWeekends={true}
                placeholder="Selecione a data de início"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Término</Label>
              <DatePicker
                id="end_date"
                value={formData.end_date}
                onChangeString={(date) => handleFieldChange('end_date', date)}
                allowWeekends={true}
                placeholder="Selecione a data de término"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição/Observações</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Equipamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
              <Input
                id="equipment_type"
                value={formData.equipment_type}
                onChange={(e) => handleFieldChange('equipment_type', e.target.value)}
                placeholder="Ex: Gerador"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment_model">Modelo</Label>
              <Input
                id="equipment_model"
                value={formData.equipment_model}
                onChange={(e) => handleFieldChange('equipment_model', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment_quantity">Quantidade</Label>
              <Input
                id="equipment_quantity"
                type="number"
                value={formData.equipment_quantity}
                onChange={(e) => handleFieldChange('equipment_quantity', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment_location">Localização</Label>
              <Input
                id="equipment_location"
                value={formData.equipment_location}
                onChange={(e) => handleFieldChange('equipment_location', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={reprocessWithAI} disabled={isLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Reprocessar com IA
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Contrato'}
          </Button>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="fulltext" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Texto Completo Extraído</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full border rounded-md p-4">
                <div className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                  {fullText || 'Nenhum texto extraído disponível.'}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractFieldMapper;