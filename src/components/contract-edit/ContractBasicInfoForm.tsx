
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from '@/components/ui/date-picker';

const formSchema = z.object({
  contract_number: z.string().min(2, "Número do contrato deve ter pelo menos 2 caracteres."),
  contract_type: z.enum(['maintenance', 'rental', 'hybrid'], {
    required_error: "Selecione um tipo de contrato.",
  }),
  client_name: z.string().min(2, "Nome do cliente deve ter pelo menos 2 caracteres."),
  equipment_type: z.string().min(2, "Tipo do equipamento deve ter pelo menos 2 caracteres."),
  equipment_model: z.string().min(2, "Modelo do equipamento deve ter pelo menos 2 caracteres."),
  equipment_location: z.string().min(2, "Localização do equipamento deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  value: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ContractBasicInfoFormProps {
  contract: unknown;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}

export const ContractBasicInfoForm = ({ contract, onSubmit, isLoading }: ContractBasicInfoFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_number: contract?.contract_number || '',
      contract_type: contract?.contract_type || 'maintenance',
      client_name: contract?.client_name || contract?.clients?.name || '',
      equipment_type: contract?.equipment_type || contract?.equipment?.[0]?.type || '',
      equipment_model: contract?.equipment_model || contract?.equipment?.[0]?.model || '',
      equipment_location: contract?.equipment_location || contract?.equipment?.[0]?.location || '',
      description: contract?.description || '',
      start_date: contract?.start_date || '',
      end_date: contract?.end_date || '',
      value: contract?.value ? contract.value.toString() : '',
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Contrato</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Selecione o tipo de contrato" />
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
            </div>
            
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="equipment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Equipamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Gerador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="equipment_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo do Equipamento</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="equipment_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização do Equipamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Subsolo" {...field} />
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
                      placeholder="Detalhes adicionais sobre o contrato..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                    <FormLabel>Valor do Contrato (R$)</FormLabel>
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
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '💾 Salvando...' : '💾 Atualizar Contrato'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
