import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { AddressFormWithCep } from '@/components/AddressFormWithCep';
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Hash,
  Mail,
  MapPin,
  Phone,
  Settings,
  User,
  Wrench,
  AlertCircle,
  CheckCircle,
  Edit2,
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: unknown) => void;
  extractedData: unknown;
  isProcessing?: boolean;
}

export function ContractReviewDialog({
  isOpen,
  onClose,
  onConfirm,
  extractedData,
  isProcessing = false
}: ContractReviewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(extractedData);

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue || 0);
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return 'Não informado';
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return `${clean.substr(0,2)}.${clean.substr(2,3)}.${clean.substr(5,3)}/${clean.substr(8,4)}-${clean.substr(12,2)}`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'Não informado';
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedData({ ...extractedData });
    }
  };

  const handleSave = () => {
    onConfirm(editedData);
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setEditedData((prev: unknown) => ({
      ...prev,
      [field]: value
    }));
  };

  const data = isEditing ? editedData : extractedData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dados Extraídos do Contrato
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={handleEdit}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? 'Salvar Edições' : 'Editar Dados'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)]">
          <Tabs defaultValue="contract" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="contract">Contrato</TabsTrigger>
              <TabsTrigger value="client">Cliente</TabsTrigger>
              <TabsTrigger value="equipment">Equipamento</TabsTrigger>
              <TabsTrigger value="observations">Observações</TabsTrigger>
            </TabsList>

            <TabsContent value="contract" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Número do Contrato
                  </Label>
                  {isEditing ? (
                    <Input
                      value={data?.contract_number || ''}
                      onChange={(e) => handleFieldChange('contract_number', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {data?.contract_number || 'Não informado'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor
                  </Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={data?.contract_value || data?.value || ''}
                      onChange={(e) => handleFieldChange('contract_value', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded font-semibold text-green-600">
                      {formatCurrency(data?.contract_value || data?.value || data?.monthly_value)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Início
                  </Label>
                  {isEditing ? (
                    <DatePicker
                      value={data?.start_date || ''}
                      onChangeString={(date) => handleFieldChange('start_date', date)}
                      allowWeekends={true}
                      placeholder="Selecione a data de início"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {formatDate(data?.start_date)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Término
                  </Label>
                  {isEditing ? (
                    <DatePicker
                      value={data?.end_date || ''}
                      onChangeString={(date) => handleFieldChange('end_date', date)}
                      allowWeekends={true}
                      placeholder="Selecione a data de término"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {formatDate(data?.end_date)}
                    </div>
                  )}
                </div>

                {data?.monthly_value && (
                  <div className="space-y-2">
                    <Label>Valor Mensal</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data?.monthly_value || ''}
                        onChange={(e) => handleFieldChange('monthly_value', parseFloat(e.target.value))}
                      />
                    ) : (
                      <div className="p-2 bg-muted rounded">
                        {formatCurrency(data?.monthly_value)}
                      </div>
                    )}
                  </div>
                )}

                {data?.duration_months && (
                  <div className="space-y-2">
                    <Label>Duração (meses)</Label>
                    <div className="p-2 bg-muted rounded">
                      {data?.duration_months} meses
                    </div>
                  </div>
                )}
              </div>

              {data?.services && data.services.length > 0 && (
                <div className="space-y-2">
                  <Label>Serviços Incluídos</Label>
                  <div className="flex flex-wrap gap-2">
                    {data.services.map((service: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {data?.payment_terms && (
                <div className="space-y-2">
                  <Label>Condições de Pagamento</Label>
                  <div className="p-2 bg-muted rounded">
                    {data.payment_terms}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="client" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      {isEditing ? (
                        <Input
                          value={data?.client_name || ''}
                          onChange={(e) => handleFieldChange('client_name', e.target.value)}
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded">
                          {data?.client_name || 'Não informado'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Razão Social</Label>
                      {isEditing ? (
                        <Input
                          value={data?.client_legal_name || ''}
                          onChange={(e) => handleFieldChange('client_legal_name', e.target.value)}
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded">
                          {data?.client_legal_name || data?.client_name || 'Não informado'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      {isEditing ? (
                        <Input
                          value={data?.client_cnpj || ''}
                          onChange={(e) => handleFieldChange('client_cnpj', e.target.value)}
                          placeholder="00.000.000/0000-00"
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded font-mono">
                          {formatCNPJ(data?.client_cnpj)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={data?.client_email || ''}
                          onChange={(e) => handleFieldChange('client_email', e.target.value)}
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded">
                          {data?.client_email || 'Não informado'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone
                      </Label>
                      {isEditing ? (
                        <Input
                          value={data?.client_phone || ''}
                          onChange={(e) => handleFieldChange('client_phone', e.target.value)}
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded">
                          {data?.client_phone || 'Não informado'}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </Label>

                    {isEditing ? (
                      <AddressFormWithCep
                        cep={data?.client_zip_code || ''}
                        address={data?.client_address || ''}
                        city={data?.client_city || ''}
                        state={data?.client_state || ''}
                        onCepChange={(value) => handleFieldChange('client_zip_code', value)}
                        onAddressChange={(value) => handleFieldChange('client_address', value)}
                        onCityChange={(value) => handleFieldChange('client_city', value)}
                        onStateChange={(value) => handleFieldChange('client_state', value)}
                        showLabels={true}
                        required={false}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-sm font-medium text-gray-600">Endereço:</div>
                          <div className="font-medium">{data?.client_address || 'Não informado'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-muted rounded">
                            <div className="text-sm font-medium text-gray-600">Cidade:</div>
                            <div className="font-medium">{data?.client_city || 'Não informado'}</div>
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <div className="text-sm font-medium text-gray-600">Estado:</div>
                            <div className="font-medium">{data?.client_state || 'Não informado'}</div>
                          </div>
                        </div>
                        {data?.client_zip_code && (
                          <div className="p-2 bg-muted rounded">
                            <div className="text-sm font-medium text-gray-600">CEP:</div>
                            <div className="font-medium">{data.client_zip_code}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Pessoa de Contato</Label>
                      {isEditing ? (
                        <Input
                          value={data?.client_contact_person || ''}
                          onChange={(e) => handleFieldChange('client_contact_person', e.target.value)}
                        />
                      ) : (
                        <div className="p-2 bg-muted rounded">
                          {data?.client_contact_person || 'Não informado'}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="equipment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Informações do Equipamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.equipment ? (
                    typeof data.equipment === 'object' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Equipamento</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.type || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.model || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Marca</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.manufacturer || data.equipment.brand || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Número de Série</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.serial_number || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Potência</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.power || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tensão</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.voltage || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Ano</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.year || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Condição</Label>
                          <div className="p-2 bg-muted rounded font-medium">
                            {data.equipment.condition || 'Não informado'}
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Localização
                          </Label>
                          <div className="p-2 bg-muted rounded font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {data.equipment.location || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded">
                        {JSON.stringify(data.equipment, null, 2)}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma informação de equipamento encontrada
                    </div>
                  )}
                </CardContent>
              </Card>

              {data?.supplier_name && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Fornecedor</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <div className="p-2 bg-muted rounded">
                        {data.supplier_name}
                      </div>
                    </div>
                    {data?.supplier_cnpj && (
                      <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <div className="p-2 bg-muted rounded">
                          {formatCNPJ(data.supplier_cnpj)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="observations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Observações e Detalhes Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.observations && (
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <div className="p-3 bg-muted rounded whitespace-pre-wrap">
                        {data.observations}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {data?.is_renewal !== undefined && (
                      <div className="space-y-2">
                        <Label>É Renovação?</Label>
                        <div className="p-2 bg-muted rounded">
                          {data.is_renewal ? 'Sim' : 'Não'}
                        </div>
                      </div>
                    )}

                    {data?.automatic_renewal !== undefined && (
                      <div className="space-y-2">
                        <Label>Renovação Automática?</Label>
                        <div className="p-2 bg-muted rounded">
                          {data.automatic_renewal ? 'Sim' : 'Não'}
                        </div>
                      </div>
                    )}

                    {data?.reajustment_index && (
                      <div className="space-y-2">
                        <Label>Índice de Reajuste</Label>
                        <div className="p-2 bg-muted rounded">
                          {data.reajustment_index}
                        </div>
                      </div>
                    )}

                    {data?.payment_due_day && (
                      <div className="space-y-2">
                        <Label>Dia de Vencimento</Label>
                        <div className="p-2 bg-muted rounded">
                          Dia {data.payment_due_day}
                        </div>
                      </div>
                    )}

                    {data?.fines_late_payment_percentage && (
                      <div className="space-y-2">
                        <Label>Multa por Atraso</Label>
                        <div className="p-2 bg-muted rounded">
                          {data.fines_late_payment_percentage}%
                        </div>
                      </div>
                    )}

                    {data?.cancellation_fine_percentage && (
                      <div className="space-y-2">
                        <Label>Multa por Cancelamento</Label>
                        <div className="p-2 bg-muted rounded">
                          {data.cancellation_fine_percentage}%
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data?.client_cnpj ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                CNPJ Válido
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                CNPJ Pendente
              </Badge>
            )}
            {data?.client_name && (
              <Badge variant="secondary">
                Cliente Identificado
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || !data?.client_name}
            >
              {isProcessing ? 'Salvando...' : 'Confirmar e Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}