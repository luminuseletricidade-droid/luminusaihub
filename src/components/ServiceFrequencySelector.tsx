
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ServiceFrequencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const frequencyOptions = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' }
];

export const ServiceFrequencySelector = ({ value, onChange, disabled = false }: ServiceFrequencySelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="frequency">Frequência da Manutenção</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a frequência" />
        </SelectTrigger>
        <SelectContent>
          {frequencyOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
