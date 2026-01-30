/**
 * Utility functions for CNPJ validation and formatting
 */

/**
 * Remove all non-numeric characters from a string
 */
export const removeNonNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Format CNPJ for display (XX.XXX.XXX/XXXX-XX)
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = removeNonNumeric(cnpj);

  if (cleaned.length !== 14) {
    return cnpj; // Return original if not valid length
  }

  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

/**
 * Format CNPJ while typing (progressive formatting)
 */
export const formatCNPJWhileTyping = (value: string): string => {
  const cleaned = removeNonNumeric(value);

  let formatted = cleaned;

  if (cleaned.length > 2) {
    formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
  }
  if (cleaned.length > 5) {
    formatted = formatted.slice(0, 6) + '.' + cleaned.slice(5);
  }
  if (cleaned.length > 8) {
    formatted = formatted.slice(0, 10) + '/' + cleaned.slice(8);
  }
  if (cleaned.length > 12) {
    formatted = formatted.slice(0, 15) + '-' + cleaned.slice(12, 14);
  }

  return formatted;
};

/**
 * Validate CNPJ using the official algorithm
 */
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = removeNonNumeric(cnpj);

  // CNPJ must have exactly 14 digits
  if (cleaned.length !== 14) {
    return false;
  }

  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }

  // Calculate first check digit
  let sum = 0;
  let weight = 5;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }

  let checkDigit = sum % 11;
  checkDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

  if (parseInt(cleaned.charAt(12)) !== checkDigit) {
    return false;
  }

  // Calculate second check digit
  sum = 0;
  weight = 6;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }

  checkDigit = sum % 11;
  checkDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

  if (parseInt(cleaned.charAt(13)) !== checkDigit) {
    return false;
  }

  return true;
};

/**
 * Get validation error message for CNPJ
 */
export const getCNPJErrorMessage = (cnpj: string): string | null => {
  const cleaned = removeNonNumeric(cnpj);

  if (cleaned.length === 0) {
    return 'CNPJ é obrigatório';
  }

  if (cleaned.length < 14) {
    return `CNPJ incompleto (${cleaned.length}/14 dígitos)`;
  }

  if (cleaned.length > 14) {
    return 'CNPJ com dígitos extras';
  }

  if (/^(\d)\1{13}$/.test(cleaned)) {
    return 'CNPJ inválido (todos os dígitos iguais)';
  }

  if (!validateCNPJ(cleaned)) {
    return 'CNPJ inválido (dígitos verificadores incorretos)';
  }

  return null; // No error
};

/**
 * Check if CNPJ is valid and return detailed validation result
 */
export interface CNPJValidationResult {
  isValid: boolean;
  formatted: string;
  errorMessage: string | null;
  cleaned: string;
}

export const validateCNPJWithDetails = (cnpj: string): CNPJValidationResult => {
  const cleaned = removeNonNumeric(cnpj);
  const errorMessage = getCNPJErrorMessage(cnpj);
  const isValid = errorMessage === null;
  const formatted = isValid ? formatCNPJ(cleaned) : cnpj;

  return {
    isValid,
    formatted,
    errorMessage,
    cleaned
  };
};

/**
 * Common valid CNPJ examples for testing
 */
export const VALID_CNPJ_EXAMPLES = [
  '11.222.333/0001-81', // Formatted
  '11222333000181',     // Unformatted
  '11.444.777/0001-61',
  '11444777000161',
];

/**
 * Common invalid CNPJ examples for testing
 */
export const INVALID_CNPJ_EXAMPLES = [
  '00.000.000/0000-00', // All zeros
  '11.111.111/1111-11', // All same digit
  '12.345.678/9012-34', // Invalid check digits
  '11.222.333/0001-82', // Wrong check digit
  '11.222.333',         // Incomplete
  'ABC.DEF.GHI/JKLM-NO', // Letters
];