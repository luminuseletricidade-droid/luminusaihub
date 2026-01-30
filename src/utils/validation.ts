export const isValidValue = (value: unknown): boolean => {
  if (!value) return false;

  const invalidValues = [
    'Não informado',
    'Não especificado',
    'Cliente Exemplo',
    'Empresa Exemplo',
    'João Silva',
    'Coordenador de Infraestrutura',
    'Invalid Date',
    'undefined',
    'null'
  ];

  const valueStr = String(value).trim();
  return !invalidValues.some(invalid =>
    valueStr.toLowerCase().includes(invalid.toLowerCase())
  );
};

export const validateFormData = (data: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' && !isValidValue(value)) {
      errors.push(`Campo ${key} contém valor inválido ou padrão`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};