import { describe, it, expect } from 'vitest';
import {
  removeNonNumeric,
  formatCNPJ,
  formatCNPJWhileTyping,
  validateCNPJ,
  getCNPJErrorMessage,
  validateCNPJWithDetails,
  VALID_CNPJ_EXAMPLES,
  INVALID_CNPJ_EXAMPLES
} from './cnpjValidation';

describe('CNPJ Validation Utilities', () => {
  describe('removeNonNumeric', () => {
    it('should remove all non-numeric characters', () => {
      expect(removeNonNumeric('11.222.333/0001-81')).toBe('11222333000181');
      expect(removeNonNumeric('ABC123DEF456')).toBe('123456');
      expect(removeNonNumeric('!@#$%^&*()')).toBe('');
    });
  });

  describe('formatCNPJ', () => {
    it('should format valid CNPJ correctly', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
      expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
    });

    it('should return original value if not 14 digits', () => {
      expect(formatCNPJ('1122233300018')).toBe('1122233300018'); // 13 digits
      expect(formatCNPJ('112223330001811')).toBe('112223330001811'); // 15 digits
      expect(formatCNPJ('invalid')).toBe('invalid');
    });
  });

  describe('formatCNPJWhileTyping', () => {
    it('should progressively format CNPJ as user types', () => {
      expect(formatCNPJWhileTyping('11')).toBe('11');
      expect(formatCNPJWhileTyping('112')).toBe('11.2');
      expect(formatCNPJWhileTyping('11222')).toBe('11.222');
      expect(formatCNPJWhileTyping('112223')).toBe('11.222.3');
      expect(formatCNPJWhileTyping('11222333')).toBe('11.222.333');
      expect(formatCNPJWhileTyping('112223330')).toBe('11.222.333/0');
      expect(formatCNPJWhileTyping('112223330001')).toBe('11.222.333/0001');
      expect(formatCNPJWhileTyping('1122233300018')).toBe('11.222.333/0001-8');
      expect(formatCNPJWhileTyping('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('should handle formatted input', () => {
      expect(formatCNPJWhileTyping('11.222.333/0001-81')).toBe('11.222.333/0001-81');
    });
  });

  describe('validateCNPJ', () => {
    describe('valid CNPJs', () => {
      VALID_CNPJ_EXAMPLES.forEach(cnpj => {
        it(`should validate ${cnpj} as valid`, () => {
          expect(validateCNPJ(cnpj)).toBe(true);
        });
      });

      it('should validate additional valid CNPJs', () => {
        expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
        expect(validateCNPJ('11222333000181')).toBe(true);
        expect(validateCNPJ('34.028.316/0001-03')).toBe(true);
        expect(validateCNPJ('06.990.590/0001-23')).toBe(true);
      });
    });

    describe('invalid CNPJs', () => {
      INVALID_CNPJ_EXAMPLES.forEach(cnpj => {
        it(`should validate ${cnpj} as invalid`, () => {
          expect(validateCNPJ(cnpj)).toBe(false);
        });
      });

      it('should reject CNPJs with wrong length', () => {
        expect(validateCNPJ('1122233300018')).toBe(false); // 13 digits
        expect(validateCNPJ('112223330001811')).toBe(false); // 15 digits
        expect(validateCNPJ('')).toBe(false); // empty
      });

      it('should reject CNPJs with all same digits', () => {
        expect(validateCNPJ('00000000000000')).toBe(false);
        expect(validateCNPJ('11111111111111')).toBe(false);
        expect(validateCNPJ('99999999999999')).toBe(false);
      });

      it('should reject CNPJs with invalid check digits', () => {
        expect(validateCNPJ('11.222.333/0001-82')).toBe(false); // Wrong second check digit
        expect(validateCNPJ('11.222.333/0001-80')).toBe(false); // Wrong both check digits
      });
    });
  });

  describe('getCNPJErrorMessage', () => {
    it('should return appropriate error messages', () => {
      expect(getCNPJErrorMessage('')).toBe('CNPJ é obrigatório');
      expect(getCNPJErrorMessage('112223330001')).toBe('CNPJ incompleto (12/14 dígitos)');
      expect(getCNPJErrorMessage('112223330001811')).toBe('CNPJ com dígitos extras');
      expect(getCNPJErrorMessage('00000000000000')).toBe('CNPJ inválido (todos os dígitos iguais)');
      expect(getCNPJErrorMessage('11222333000182')).toBe('CNPJ inválido (dígitos verificadores incorretos)');
      expect(getCNPJErrorMessage('11222333000181')).toBe(null);
    });
  });

  describe('validateCNPJWithDetails', () => {
    it('should return detailed validation for valid CNPJ', () => {
      const result = validateCNPJWithDetails('11222333000181');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('11.222.333/0001-81');
      expect(result.errorMessage).toBe(null);
      expect(result.cleaned).toBe('11222333000181');
    });

    it('should return detailed validation for formatted valid CNPJ', () => {
      const result = validateCNPJWithDetails('11.222.333/0001-81');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('11.222.333/0001-81');
      expect(result.errorMessage).toBe(null);
      expect(result.cleaned).toBe('11222333000181');
    });

    it('should return detailed validation for invalid CNPJ', () => {
      const result = validateCNPJWithDetails('11222333000182');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('11222333000182');
      expect(result.errorMessage).toBe('CNPJ inválido (dígitos verificadores incorretos)');
      expect(result.cleaned).toBe('11222333000182');
    });

    it('should return detailed validation for empty CNPJ', () => {
      const result = validateCNPJWithDetails('');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('');
      expect(result.errorMessage).toBe('CNPJ é obrigatório');
      expect(result.cleaned).toBe('');
    });

    it('should return detailed validation for incomplete CNPJ', () => {
      const result = validateCNPJWithDetails('11.222.333');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('11.222.333');
      expect(result.errorMessage).toBe('CNPJ incompleto (9/14 dígitos)');
      expect(result.cleaned).toBe('11222333');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined gracefully', () => {
      // @ts-ignore - Testing runtime behavior
      expect(removeNonNumeric(null)).toBe('');
      // @ts-ignore - Testing runtime behavior
      expect(removeNonNumeric(undefined)).toBe('');
      // @ts-ignore - Testing runtime behavior
      expect(validateCNPJ(null)).toBe(false);
      // @ts-ignore - Testing runtime behavior
      expect(validateCNPJ(undefined)).toBe(false);
    });

    it('should handle mixed formatting', () => {
      expect(validateCNPJ('11.222333/000181')).toBe(true); // Partially formatted
      expect(validateCNPJ('11 222 333 0001 81')).toBe(true); // Spaces instead of dots
      expect(validateCNPJ('11-222-333-0001-81')).toBe(true); // Dashes instead of dots
    });

    it('should handle leading zeros', () => {
      expect(validateCNPJ('06.990.590/0001-23')).toBe(true);
      expect(formatCNPJ('06990590000123')).toBe('06.990.590/0001-23');
    });
  });
});