import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCepValidation } from '@/hooks/useCepValidation';

interface CepInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const CepInput: React.FC<CepInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = "00000-000",
  disabled = false,
  label = "CEP",
  className = ""
}) => {
  const { handleCepChange, handleCepBlur, error } = useCepValidation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = handleCepChange(inputValue);
    onChange(formatted);
  };

  const handleBlurEvent = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const result = handleCepBlur(inputValue);
    if (onBlur) {
      onBlur(result.formatted);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="cep-input">{label}</Label>
      <Input
        id="cep-input"
        value={value}
        onChange={handleChange}
        onBlur={handleBlurEvent}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={9} // 8 dígitos + 1 hífen
        className={error ? 'border-red-500 focus:border-red-500' : ''}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
