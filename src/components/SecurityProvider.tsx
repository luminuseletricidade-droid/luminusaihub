
import React, { createContext, useContext, useCallback } from 'react';

interface SecurityContextType {
  sanitizeInput: (input: string) => string;
  validateFileType: (file: File, allowedTypes: string[]) => boolean;
  isValidContractNumber: (contractNumber: string) => boolean;
  validateEmail: (email: string) => boolean;
  validatePhone: (phone: string) => boolean;
  validateCNPJ: (cnpj: string) => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sanitizeInput = useCallback((input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove data: URLs that could contain scripts
      .replace(/data:(?:text\/html|application\/javascript)[^;]*;[^,]*,/gi, '')
      // Remove vbscript: protocol
      .replace(/vbscript:/gi, '')
      // Remove expression() CSS
      .replace(/expression\s*\(/gi, '')
      // Limit length
      .slice(0, 10000)
      .trim();
  }, []);

  const validateFileType = useCallback((file: File, allowedTypes: string[]): boolean => {
    if (!file || !file.name || !file.type) {
      return false;
    }

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // No file size limit - removed per request
    // File size validation removed
    
    // Stricter MIME type validation
    if (!allowedTypes.some(type => fileType === type.toLowerCase())) {
      return false;
    }
    
    // Enhanced file extension validation
    const extension = fileName.split('.').pop();
    const allowedExtensions = ['pdf']; // Restricting to only PDF for security
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return false;
    }

    // Enhanced suspicious pattern detection
    const suspiciousPatterns = [
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.pif$/i,
      /\.scr$/i, /\.vbs$/i, /\.js$/i, /\.jar$/i, /\.php$/i,
      /\.html$/i, /\.htm$/i, /\.\./i, /[<>:"|?*]/,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i, // Windows reserved names
      /^\./i, // Hidden files
      /[^\x20-\x7E]/i // Non-printable characters
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }

    // Check for double extensions
    const parts = fileName.split('.');
    if (parts.length > 2) {
      return false;
    }
    
    return true;
  }, []);

  const isValidContractNumber = useCallback((contractNumber: string): boolean => {
    if (!contractNumber || typeof contractNumber !== 'string') {
      return false;
    }
    
    // Allow alphanumeric characters, hyphens, and underscores only
    const pattern = /^[A-Za-z0-9\-_]+$/;
    return pattern.test(contractNumber) && 
           contractNumber.length >= 3 && 
           contractNumber.length <= 50;
  }, []);

  // Additional security functions
  const validateEmail = useCallback((email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }, []);

  const validatePhone = useCallback((phone: string): boolean => {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^\(?\d{2}\)?\s*\d{4,5}-?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }, []);

  const validateCNPJ = useCallback((cnpj: string): boolean => {
    if (!cnpj || typeof cnpj !== 'string') return false;
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    return cnpjRegex.test(cnpj);
  }, []);

  const value: SecurityContextType = {
    sanitizeInput,
    validateFileType,
    isValidContractNumber,
    validateEmail,
    validatePhone,
    validateCNPJ
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
