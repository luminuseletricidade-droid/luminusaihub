import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
}

interface DataValidationProps {
  data: unknown;
  validationRules: ValidationRule[];
  onValidationResult?: (result: ValidationResult) => void;
}

export const DataValidation: React.FC<DataValidationProps> = ({
  data,
  validationRules,
  onValidationResult
}) => {
  const validateData = (data: any, rules: ValidationRule[]): ValidationResult => {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];

    rules.forEach(rule => {
      const fieldValue = data?.[rule.field];
      let isRuleViolated = false;

      switch (rule.rule) {
        case 'required':
          isRuleViolated = !fieldValue || fieldValue === '';
          break;
        case 'email':
          isRuleViolated = fieldValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue);
          break;
        case 'phone':
          isRuleViolated = fieldValue && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(fieldValue);
          break;
        case 'cnpj':
          isRuleViolated = fieldValue && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(fieldValue);
          break;
        case 'future_date':
          isRuleViolated = fieldValue && new Date(fieldValue) <= new Date();
          break;
        case 'positive_number':
          isRuleViolated = fieldValue && (isNaN(fieldValue) || parseFloat(fieldValue) <= 0);
          break;
        default:
          break;
      }

      if (isRuleViolated) {
        if (rule.severity === 'error') {
          errors.push(rule);
        } else if (rule.severity === 'warning') {
          warnings.push(rule);
        }
      }
    });

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (onValidationResult) {
      onValidationResult(result);
    }

    return result;
  };

  const validation = validateData(data, validationRules);

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Todos os dados estão válidos
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {validation.errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Badge variant="destructive" className="text-xs">
              {error.field}
            </Badge>
          </AlertDescription>
        </Alert>
      ))}

      {validation.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between text-yellow-800">
            <span>{warning.message}</span>
            <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
              {warning.field}
            </Badge>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

// Regras de validação pré-definidas
export const contractValidationRules: ValidationRule[] = [
  { field: 'contract_number', rule: 'required', message: 'Número do contrato é obrigatório', severity: 'error' },
  { field: 'client_id', rule: 'required', message: 'Cliente é obrigatório', severity: 'error' },
  { field: 'start_date', rule: 'required', message: 'Data de início é obrigatória', severity: 'error' },
  { field: 'end_date', rule: 'required', message: 'Data de fim é obrigatória', severity: 'error' },
  { field: 'end_date', rule: 'future_date', message: 'Data de fim deve ser futura', severity: 'warning' },
  { field: 'value', rule: 'positive_number', message: 'Valor deve ser um número positivo', severity: 'error' }
];

export const clientValidationRules: ValidationRule[] = [
  { field: 'name', rule: 'required', message: 'Nome da empresa é obrigatório', severity: 'error' },
  { field: 'email', rule: 'email', message: 'Email deve ter formato válido', severity: 'warning' },
  { field: 'phone', rule: 'phone', message: 'Telefone deve ter formato (xx) xxxxx-xxxx', severity: 'warning' },
  { field: 'cnpj', rule: 'cnpj', message: 'CNPJ deve ter formato xx.xxx.xxx/xxxx-xx', severity: 'warning' }
];

export const maintenanceValidationRules: ValidationRule[] = [
  { field: 'contract_id', rule: 'required', message: 'Contrato é obrigatório', severity: 'error' },
  { field: 'type', rule: 'required', message: 'Tipo de manutenção é obrigatório', severity: 'error' },
  { field: 'scheduled_date', rule: 'required', message: 'Data agendada é obrigatória', severity: 'error' },
  { field: 'technician', rule: 'required', message: 'Técnico responsável é obrigatório', severity: 'warning' }
];

export default DataValidation;