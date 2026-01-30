
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { EquipmentSection } from './EquipmentSection';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';
import * as z from "zod";

const formSchema = z.object({
  contract_number: z.string().min(1, "Número do contrato é obrigatório"),
  contract_type: z.enum(['maintenance', 'rental', 'hybrid'], {
    required_error: "Tipo de contrato é obrigatório",
  }),
  status: z.enum(['active', 'inactive', 'expired', 'renewal', 'draft'], {
    required_error: "Status é obrigatório",
  }),
  client_name: z.string().min(1, "Nome do cliente é obrigatório"),
  client_cnpj: z.string().optional(),
  client_email: z.string().optional(),
  client_phone: z.string().optional(),
  client_secondary_phone: z.string().optional(),
  client_contact_person: z.string().optional(),
  client_website: z.string().optional(),
  client_emergency_contact: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_state: z.string().optional(),
  client_zip_code: z.string().optional(),
  client_notes: z.string().optional(),
  equipment_type: z.string().min(1, "Tipo do equipamento é obrigatório"),
  equipment_model: z.string().min(1, "Modelo do equipamento é obrigatório"),
  equipment_location: z.string().min(1, "Localização do equipamento é obrigatória"),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  value: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SimpleContractEditFormProps {
  contract: unknown;
  onUpdate: () => void;
}

export const SimpleContractEditForm = ({ contract, onUpdate }: SimpleContractEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Validate contract data before proceeding
  if (!contract || !contract.id) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        ⚠️ Dados do contrato não disponíveis
      </div>
    );
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_number: contract.contract_number || '',
      contract_type: contract.contract_type || 'maintenance',
      status: contract.status || 'active',
      client_name: contract.client_name || contract.clients?.name || '',
      client_cnpj: contract.clients?.cnpj || '',
      client_email: contract.clients?.email || '',
      client_phone: contract.clients?.phone || '',
      client_secondary_phone: contract.clients?.secondary_phone || '',
      client_contact_person: contract.clients?.contact_person || '',
      client_website: contract.clients?.website || '',
      client_emergency_contact: contract.clients?.emergency_contact || '',
      client_address: contract.clients?.address || '',
      client_notes: contract.clients?.notes || '',
      equipment_type: contract.equipment_type || contract.equipment?.[0]?.type || '',
      equipment_model: contract.equipment_model || contract.equipment?.[0]?.model || '',
      equipment_location: contract.equipment_location || contract.equipment?.[0]?.location || '',
      description: contract.description || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      value: contract.value ? contract.value.toString() : '',
    },
  });

  // Debounced change detection
  const debouncedFormData = useDebounce(form.watch(), 300);

  // Track changes without causing re-renders
  const handleFormChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleSubmit = async (values: FormData) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('💾 Salvando contrato:', contract.id, values);

      const valueAsNumber = values.value && values.value.trim() !== '' 
        ? parseFloat(values.value) 
        : null;

      // Update contract data
      const contractUpdateData = {
        contract_number: values.contract_number,
        contract_type: values.contract_type,
        status: values.status,
        client_name: values.client_name,
        equipment_type: values.equipment_type,
        equipment_model: values.equipment_model,
        equipment_location: values.equipment_location,
        description: values.description || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        value: valueAsNumber,
        updated_at: new Date().toISOString(),
      };

      const { error: contractError } = await supabase
        .from('contracts')
        .update(contractUpdateData)
        .eq('id', contract.id);

      if (contractError) {
        console.error('❌ Erro ao atualizar contrato:', contractError);
        throw contractError;
      }

      // Update client data if client exists
      if (contract.client_id || contract.clients?.id) {
        const clientId = contract.client_id || contract.clients?.id;
        
        const clientUpdateData = {
          name: values.client_name,
          cnpj: values.client_cnpj || null,
          email: values.client_email || null,
          phone: values.client_phone || null,
          secondary_phone: values.client_secondary_phone || null,
          contact_person: values.client_contact_person || null,
          website: values.client_website || null,
          emergency_contact: values.client_emergency_contact || null,
          address: values.client_address || null,
          notes: values.client_notes || null,
          updated_at: new Date().toISOString(),
        };

        const { error: clientError } = await supabase
          .from('clients')
          .update(clientUpdateData)
          .eq('id', clientId);

        if (clientError) {
          console.error('❌ Erro ao atualizar cliente:', clientError);
          throw clientError;
        }
      }

      // Update equipment data
      if (contract.equipment?.[0]?.id) {
        const equipmentUpdateData = {
          type: values.equipment_type,
          model: values.equipment_model,
          location: values.equipment_location,
          updated_at: new Date().toISOString(),
        };

        const { error: equipmentError } = await supabase
          .from('equipment')
          .update(equipmentUpdateData)
          .eq('id', contract.equipment[0].id);

        if (equipmentError) {
          console.error('❌ Erro ao atualizar equipamento:', equipmentError);
          throw equipmentError;
        }
      }

      console.log('✅ Contrato e dados relacionados atualizados com sucesso');
      
      toast({
        title: "✅ Sucesso",
        description: "Contrato e dados do cliente atualizados com sucesso.",
      });

      setHasChanges(false);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('💥 Erro ao atualizar contrato:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível atualizar o contrato.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Informações do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" onChange={handleFormChange}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contract_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Contrato</FormLabel>
                      <FormControl>
                        <Input placeholder="INS-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="rental">Locação</SelectItem>
                          <SelectItem value="hybrid">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="expired">Vencido</SelectItem>
                          <SelectItem value="renewal">Renovação</SelectItem>
                          <SelectItem value="draft">Rascunho</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChangeString={field.onChange}
                          allowWeekends={true}
                          placeholder="Selecione a data de início"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Término</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChangeString={field.onChange}
                          allowWeekends={true}
                          placeholder="Selecione a data de término"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1000.00" 
                          step="0.01"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre o contrato..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">🏢 Informações do Cliente</h3>
                
                <FormField
                  control={form.control}
                  name="client_name"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="client_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="client_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Principal</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_secondary_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Secundário</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="client_contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pessoa de Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="www.empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="client_emergency_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato de Emergência</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <AddressFormWithCep
                      cep={form.watch('client_zip_code') || ''}
                      address={form.watch('client_address') || ''}
                      city={form.watch('client_city') || ''}
                      state={form.watch('client_state') || ''}
                      onCepChange={(value) => form.setValue('client_zip_code', value)}
                      onAddressChange={(value) => form.setValue('client_address', value)}
                      onCityChange={(value) => form.setValue('client_city', value)}
                      onStateChange={(value) => form.setValue('client_state', value)}
                      showLabels={true}
                      required={false}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="client_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações do Cliente</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações sobre o cliente..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Equipment Information - Multiple Equipment Support */}
              <div className="border-t pt-6">
                <EquipmentSection 
                  contractId={contract.id}
                  initialEquipment={contract.equipment || []}
                  onUpdate={onUpdate}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoading || !hasChanges} 
                className="w-full"
              >
                {isLoading ? '💾 Salvando...' : '💾 Salvar Alterações'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
