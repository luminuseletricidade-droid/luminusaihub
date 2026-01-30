import React, { useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCepValidation } from '@/hooks/useCepValidation';
import { AddressData } from '@/services/viaCepApi';

interface AddressFormWithCepProps {
  // Valores controlados
  cep: string;
  address: string;
  neighborhood: string;
  number: string;
  city: string;
  state: string;

  // Callbacks de mudança
  onCepChange: (cep: string) => void;
  onAddressChange: (address: string) => void;
  onNeighborhoodChange: (neighborhood: string) => void;
  onNumberChange: (number: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;

  // Configurações opcionais
  showLabels?: boolean;
  required?: boolean;
  disabled?: boolean;
  layout?: 'grid' | 'stacked';
  className?: string;
}

export const AddressFormWithCep: React.FC<AddressFormWithCepProps> = ({
  cep,
  address,
  neighborhood,
  number,
  city,
  state,
  onCepChange,
  onAddressChange,
  onNeighborhoodChange,
  onNumberChange,
  onCityChange,
  onStateChange,
  showLabels = true,
  required = false,
  disabled = false,
  layout = 'grid',
  className = ''
}) => {
  const { searchCep, isLoading, error, clearError } = useCepValidation();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedCepRef = useRef<string>('');

  const handleCepInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    onCepChange(formattedCep);
    clearError();
  }, [onCepChange, clearError]);

  const isCepComplete = cep.replace(/\D/g, '').length === 8;

  // Auto-buscar endereço quando CEP fica completo
  useEffect(() => {
    if (!isCepComplete || !cep || disabled) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      return;
    }

    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Atrasar a busca para dar tempo do usuário terminar de digitar
    searchTimeoutRef.current = setTimeout(async () => {
      const cleaned = cep.replace(/\D/g, '');
      // Evitar repetição: se já aplicamos este CEP e campos não estão vazios, não buscar novamente
      if (lastAppliedCepRef.current === cleaned) {
        return;
      }

      console.log('🔍 [AddressFormWithCep] Buscando CEP:', cep);
      const result = await searchCep(cep);

      if (result.success && result.data) {
        console.log('✅ [AddressFormWithCep] CEP encontrado:', result.data);
        // Auto-preencher os campos sem dialog
        onAddressChange(result.data.logradouro || '');
        onNeighborhoodChange(result.data.bairro || '');
        onCityChange(result.data.cidade);
        onStateChange(result.data.estado);
        lastAppliedCepRef.current = cleaned;
      } else {
        console.warn('⚠️ [AddressFormWithCep] CEP não encontrado ou erro:', result.error);
      }
    }, 300); // Pequeno delay após o debounce do hook

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isCepComplete, cep, disabled, searchCep, onAddressChange, onNeighborhoodChange, onCityChange, onStateChange]);

  const containerClass = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
    : 'space-y-4';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Campo CEP com indicador de carregamento */}
      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="cep">
            CEP {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Input
              id="cep"
              value={cep}
              onChange={handleCepInputChange}
              placeholder="00000-000"
              maxLength={9}
              disabled={disabled}
              className={error ? 'border-red-500' : ''}
            />
          </div>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          {!isLoading && isCepComplete && !error && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <Alert variant="destructive" className="py-2">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Campos de endereço */}
      <div className={containerClass}>
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="address">
              Logradouro {required && <span className="text-red-500">*</span>}
            </Label>
          )}
          <Input
            id="address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Rua, Avenida, etc."
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="neighborhood">
              Bairro {required && <span className="text-red-500">*</span>}
            </Label>
          )}
          <Input
            id="neighborhood"
            value={neighborhood}
            onChange={(e) => onNeighborhoodChange(e.target.value)}
            placeholder="Bairro"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="number">
              Número
            </Label>
          )}
          <Input
            id="number"
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            placeholder="Número"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="city">
              Cidade {required && <span className="text-red-500">*</span>}
            </Label>
          )}
          <Input
            id="city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Cidade"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="state">
              Estado {required && <span className="text-red-500">*</span>}
            </Label>
          )}
          <Input
            id="state"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            placeholder="UF"
            maxLength={2}
            disabled={disabled}
            className="uppercase"
          />
        </div>
      </div>

    </div>
  );
};
