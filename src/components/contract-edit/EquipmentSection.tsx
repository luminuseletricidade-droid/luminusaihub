import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';

interface Equipment {
  id?: string;
  type: string;
  model: string;
  location: string;
  manufacturer?: string;
  serial_number?: string;
  installation_date?: string;
  year?: string; // ✅ Adicionado: Ano de fabricação
  condition?: string; // ✅ Adicionado: Condição do equipamento
  power?: string; // ✅ Adicionado: Potência do equipamento
  voltage?: string; // ✅ Adicionado: Tensão do equipamento
  quantity?: number;
  observations?: string;
}

interface EquipmentSectionProps {
  contractId: string;
  initialEquipment?: Equipment[];
  onUpdate?: () => void;
}

export const EquipmentSection = ({ contractId, initialEquipment = [], onUpdate }: EquipmentSectionProps) => {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment.length > 0 ? initialEquipment : [
    { type: '', model: '', location: '', year: '', condition: '', power: '', voltage: '', quantity: 1, observations: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialEquipment && initialEquipment.length > 0) {
      setEquipment(initialEquipment.map(eq => ({
        ...eq,
        year: eq.year || '',
        condition: eq.condition || '',
        power: eq.power || '',
        voltage: eq.voltage || '',
        observations: eq.observations || '',
        quantity: eq.quantity || 1
      })));
    }
  }, [initialEquipment]);

  const addEquipment = () => {
    setEquipment([...equipment, {
      type: '',
      model: '',
      location: '',
      year: '',
      condition: '',
      power: '',
      voltage: '',
      quantity: 1,
      observations: ''
    }]);
  };

  const removeEquipment = (index: number) => {
    const newEquipment = equipment.filter((_, i) => i !== index);
    setEquipment(newEquipment);
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: string | number) => {
    const newEquipment = [...equipment];
    newEquipment[index] = {
      ...newEquipment[index],
      [field]: value
    };
    setEquipment(newEquipment);
  };

  const saveEquipment = async () => {
    if (!contractId) return;

    setIsLoading(true);
    try {
      // Delete existing equipment for this contract
      const { error: deleteError } = await supabase
        .from('equipment')
        .delete()
        .eq('contract_id', contractId);

      if (deleteError) {
        console.error('Erro ao deletar equipamentos:', deleteError);
        throw deleteError;
      }

      // Insert new equipment
      const equipmentToInsert = equipment
        .filter(eq => eq.type.trim() && eq.model.trim() && eq.location.trim())
        .map(eq => ({
          contract_id: contractId,
          type: eq.type,
          model: eq.model,
          location: eq.location,
          manufacturer: eq.manufacturer || null,
          serial_number: eq.serial_number || null,
          installation_date: eq.installation_date || null,
          year: eq.year || null,
          condition: eq.condition || null,
          power: eq.power || null,
          voltage: eq.voltage || null,
          quantity: eq.quantity || 1,
          observations: eq.observations || null
        }));

      if (equipmentToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('equipment')
          .insert(equipmentToInsert);

        if (insertError) {
          console.error('Erro ao inserir equipamentos:', insertError);
          throw insertError;
        }
      }

      toast({
        title: "✅ Sucesso",
        description: "Equipamentos salvos com sucesso!",
      });

      if (onUpdate) {
        onUpdate();
      }

    } catch (error) {
      console.error('Erro ao salvar equipamentos:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao salvar equipamentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">🔧 Informações dos Equipamentos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEquipment}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Equipamento
        </Button>
      </div>

      {equipment.map((eq, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            {equipment.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEquipment(index)}
                className="absolute top-2 right-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor={`equipment-type-${index}`}>Tipo de Equipamento *</Label>
                <Input
                  id={`equipment-type-${index}`}
                  placeholder="Gerador"
                  value={eq.type}
                  onChange={(e) => updateEquipment(index, 'type', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-model-${index}`}>Modelo/Identificação *</Label>
                <Input
                  id={`equipment-model-${index}`}
                  placeholder="ABC 123"
                  value={eq.model}
                  onChange={(e) => updateEquipment(index, 'model', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-location-${index}`}>Localização *</Label>
                <Input
                  id={`equipment-location-${index}`}
                  placeholder="Subsolo"
                  value={eq.location}
                  onChange={(e) => updateEquipment(index, 'location', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor={`equipment-manufacturer-${index}`}>Fabricante</Label>
                <Input
                  id={`equipment-manufacturer-${index}`}
                  placeholder="Fabricante"
                  value={eq.manufacturer || ''}
                  onChange={(e) => updateEquipment(index, 'manufacturer', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-serial-${index}`}>Número de Série</Label>
                <Input
                  id={`equipment-serial-${index}`}
                  placeholder="SN123456"
                  value={eq.serial_number || ''}
                  onChange={(e) => updateEquipment(index, 'serial_number', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-installation-${index}`}>Data de Instalação</Label>
                <DatePicker
                  id={`equipment-installation-${index}`}
                  value={eq.installation_date || ''}
                  onChangeString={(date) => updateEquipment(index, 'installation_date', date)}
                  allowWeekends={true}
                  placeholder="Selecione a data de instalação"
                />
              </div>

              <div>
                <Label htmlFor={`equipment-quantity-${index}`}>Quantidade</Label>
                <Input
                  id={`equipment-quantity-${index}`}
                  type="number"
                  min="1"
                  value={eq.quantity || 1}
                  onChange={(e) => updateEquipment(index, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor={`equipment-year-${index}`}>Ano de Fabricação</Label>
                <Input
                  id={`equipment-year-${index}`}
                  placeholder="2022"
                  value={eq.year || ''}
                  onChange={(e) => updateEquipment(index, 'year', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-condition-${index}`}>Condição</Label>
                <Input
                  id={`equipment-condition-${index}`}
                  placeholder="Novo, Usado, Seminovo, etc."
                  value={eq.condition || ''}
                  onChange={(e) => updateEquipment(index, 'condition', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-power-${index}`}>Potência</Label>
                <Input
                  id={`equipment-power-${index}`}
                  placeholder="450 kVA"
                  value={eq.power || ''}
                  onChange={(e) => updateEquipment(index, 'power', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`equipment-voltage-${index}`}>Tensão</Label>
                <Input
                  id={`equipment-voltage-${index}`}
                  placeholder="380V"
                  value={eq.voltage || ''}
                  onChange={(e) => updateEquipment(index, 'voltage', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`equipment-observations-${index}`}>Observações</Label>
              <Textarea
                id={`equipment-observations-${index}`}
                placeholder="Observações sobre este equipamento..."
                rows={3}
                value={eq.observations || ''}
                onChange={(e) => updateEquipment(index, 'observations', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        onClick={saveEquipment}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? '💾 Salvando...' : '💾 Salvar Equipamentos'}
      </Button>
    </div>
  );
};