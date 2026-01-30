import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';
import { Check, Plus, Trash2 } from 'lucide-react';

export type ContractEditorMode = 'create' | 'edit';

export interface ContractEditorValue {
  // Contract
  contract_number?: string;
  value?: number | string | null;
  monthly_value?: number | string | null;
  duration_months?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  contract_type?: string | null;

  // Client
  client_name?: string | null;
  client_legal_name?: string | null;
  client_cnpj?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_neighborhood?: string | null;
  client_number?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  client_zip_code?: string | null;
  client_contact_person?: string | null;

  // Equipment
  equipment_type?: string | null;
  equipment_model?: string | null;
  equipment_brand?: string | null;
  equipment_serial?: string | null;
  equipment_power?: string | null;
  equipment_voltage?: string | null;
  equipment_year?: string | null;
  equipment_condition?: string | null;
  equipment_location?: string | null;

  // Notes/Commercial
  observations?: string | null;
  payment_terms?: string | null;
  technical_notes?: string | null;
  special_conditions?: string | null;
  warranty_terms?: string | null;

  // Services
  services?: string[];
}

interface Props {
  mode: ContractEditorMode;
  value: ContractEditorValue;
  onChange: (value: Partial<ContractEditorValue>) => void;
  servicesInput?: string;
  onServicesInputChange?: (value: string) => void;
  onAddService?: (text: string) => void;
  onRemoveService?: (index: number) => void;
}

const toNumberInput = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '';
  // Se já é string, verifica se é um número válido
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? '' : v;
  }
  // Se é number, converte para string
  if (typeof v === 'number') {
    return String(v);
  }
  return '';
};

export const ContractEditor: React.FC<Props> = ({
  mode,
  value,
  onChange,
  servicesInput = '',
  onServicesInputChange,
  onAddService,
  onRemoveService
}) => {
  const services = Array.isArray(value.services) ? value.services : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar Dados do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">Informações do Contrato</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número do Contrato</Label>
                  <Input value={value.contract_number || ''} onChange={(e) => onChange({ contract_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Contrato</Label>
                  <Select
                    value={value.contract_type || 'maintenance'}
                    onValueChange={(val) => onChange({ contract_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="rental">Locação</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={toNumberInput(value.value)}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Permite campo vazio ou valores numéricos válidos
                      onChange({ value: val === '' ? null : val });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Mensal</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={toNumberInput(value.monthly_value)}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ monthly_value: val === '' ? null : val });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (meses)</Label>
                  <Input type="number" value={toNumberInput(value.duration_months)} onChange={(e) => onChange({ duration_months: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <DatePicker value={value.start_date || ''} onChangeString={(date) => onChange({ start_date: date })} allowWeekends={true} placeholder="Selecione a data de início" />
                </div>
                <div className="space-y-2">
                  <Label>Data Término</Label>
                  <DatePicker value={value.end_date || ''} onChangeString={(date) => onChange({ end_date: date })} allowWeekends={true} placeholder="Selecione a data de término" />
                </div>
              </div>
            </div>

            <div className="border-t" />

            <div>
              <h3 className="font-medium mb-3">Informações do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome/Razão Social</Label>
                  <Input value={value.client_name || ''} onChange={(e) => onChange({ client_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={value.client_cnpj || ''} onChange={(e) => onChange({ client_cnpj: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={value.client_email || ''} onChange={(e) => onChange({ client_email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={value.client_phone || ''} onChange={(e) => onChange({ client_phone: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Endereço Completo</Label>
                  <AddressFormWithCep
                    cep={value.client_zip_code || ''}
                    address={value.client_address || ''}
                    neighborhood={value.client_neighborhood || ''}
                    number={value.client_number || ''}
                    city={value.client_city || ''}
                    state={value.client_state || ''}
                    onCepChange={(v) => onChange({ client_zip_code: v })}
                    onAddressChange={(v) => onChange({ client_address: v })}
                    onNeighborhoodChange={(v) => onChange({ client_neighborhood: v })}
                    onNumberChange={(v) => onChange({ client_number: v })}
                    onCityChange={(v) => onChange({ client_city: v })}
                    onStateChange={(v) => onChange({ client_state: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input value={value.client_contact_person || ''} onChange={(e) => onChange({ client_contact_person: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t" />

            <div>
              <h3 className="font-medium mb-3">Informações do Equipamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={value.equipment_type || ''} onChange={(e) => onChange({ equipment_type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input value={value.equipment_model || ''} onChange={(e) => onChange({ equipment_model: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={value.equipment_brand || ''} onChange={(e) => onChange({ equipment_brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Número de Série</Label>
                  <Input value={value.equipment_serial || ''} onChange={(e) => onChange({ equipment_serial: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Potência</Label>
                  <Input value={value.equipment_power || ''} onChange={(e) => onChange({ equipment_power: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tensão</Label>
                  <Input value={value.equipment_voltage || ''} onChange={(e) => onChange({ equipment_voltage: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ano de Fabricação</Label>
                  <Input value={value.equipment_year || ''} onChange={(e) => onChange({ equipment_year: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Input value={value.equipment_condition || ''} onChange={(e) => onChange({ equipment_condition: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Localização</Label>
                  <Input value={value.equipment_location || ''} onChange={(e) => onChange({ equipment_location: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t" />

            <div>
              <h3 className="font-medium mb-3">Observações</h3>
              <Textarea rows={3} value={value.observations || ''} onChange={(e) => onChange({ observations: e.target.value })} />
            </div>

            <div className="border-t" />

            <div>
              <h3 className="font-medium mb-3">Serviços Inclusos</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  {services.length > 0 ? (
                    services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="flex-1">{service}</span>
                        {onRemoveService && (
                          <Button variant="ghost" size="sm" onClick={() => onRemoveService(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum serviço adicionado</p>
                  )}
                </div>
                {onAddService && (
                  <div className="flex gap-2">
                    <Input placeholder="Digite um novo serviço e pressione Enter" value={servicesInput} onChange={(e) => onServicesInputChange && onServicesInputChange(e.target.value)} onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const text = (servicesInput || '').trim();
                        if (text) onAddService(text);
                      }
                    }} />
                    <Button type="button" disabled={!servicesInput?.trim()} onClick={() => {
                      const text = (servicesInput || '').trim();
                      if (text) onAddService(text);
                    }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t" />

            <div className="space-y-4">
              <h3 className="font-medium mb-3">Informações Comerciais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Termos de Pagamento</Label>
                  <Textarea className="whitespace-pre-wrap min-h-[100px]" rows={4} value={value.payment_terms ?? ''} onChange={(e) => onChange({ payment_terms: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notas Técnicas</Label>
                  <Textarea className="whitespace-pre-wrap min-h[100px]" rows={4} value={value.technical_notes ?? ''} onChange={(e) => onChange({ technical_notes: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Condições Especiais</Label>
                  <Textarea className="whitespace-pre-wrap min-h-[100px]" rows={4} value={value.special_conditions ?? ''} onChange={(e) => onChange({ special_conditions: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Termos de Garantia</Label>
                  <Textarea className="whitespace-pre-wrap min-h-[100px]" rows={4} value={value.warranty_terms ?? ''} onChange={(e) => onChange({ warranty_terms: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractEditor;


