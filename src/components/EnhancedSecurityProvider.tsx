import React, { createContext, useContext, useCallback } from 'react';
import { useSecurity } from './SecurityProvider';
import { useRateLimit, rateLimitConfigs } from '@/hooks/useRateLimit';

interface EnhancedSecurityContextType {
  // Original security functions
  sanitizeInput: (input: string) => string;
  validateFileType: (file: File, allowedTypes: string[]) => boolean;
  isValidContractNumber: (contractNumber: string) => boolean;
  validateEmail: (email: string) => boolean;
  validatePhone: (phone: string) => boolean;
  validateCNPJ: (cnpj: string) => boolean;
  
  // Enhanced security functions
  sanitizeHtml: (html: string) => string;
  validateFileContent: (file: File) => Promise<boolean>;
  checkRateLimit: (operation: string, config?: unknown) => boolean;
  sanitizeForDatabase: (input: unknown) => any;
  validateImageFile: (file: File) => boolean;
  sanitizeFilename: (filename: string) => string;
}

const EnhancedSecurityContext = createContext<EnhancedSecurityContextType | undefined>(undefined);

export const EnhancedSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const security = useSecurity();
  const authRateLimit = useRateLimit(rateLimitConfigs.auth);
  const uploadRateLimit = useRateLimit(rateLimitConfigs.upload);
  const aiRateLimit = useRateLimit(rateLimitConfigs.aiChat);
  const apiRateLimit = useRateLimit(rateLimitConfigs.apiCall);

  const sanitizeHtml = useCallback((html: string): string => {
    if (!html || typeof html !== 'string') return '';
    
    return html
      // Remove all script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove all style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove all link tags (can contain CSS)
      .replace(/<link[^>]*>/gi, '')
      // Remove all iframe tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      // Remove all object and embed tags
      .replace(/<(object|embed)[^>]*>.*?<\/\1>/gi, '')
      // Remove all form tags
      .replace(/<form[^>]*>.*?<\/form>/gi, '')
      // Remove all dangerous attributes
      .replace(/\s(on\w+|href|src)\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: and data: protocols
      .replace(/(javascript|data|vbscript):/gi, '')
      // Remove expression() CSS
      .replace(/expression\s*\(/gi, '')
      // Limit length to prevent DoS
      .slice(0, 50000)
      .trim();
  }, []);

  const validateFileContent = useCallback(async (file: File): Promise<boolean> => {
    try {
      // Check file headers (magic bytes) for PDF
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.slice(0, 4).arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const header = Array.from(uint8Array).map(byte => byte.toString(16).padStart(2, '0')).join('');
        
        // PDF magic bytes: 25504446 (%PDF)
        if (!header.startsWith('25504446')) {
          return false;
        }
      }

      // Additional content validation for suspicious patterns
      const text = await file.text().catch(() => '');
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /eval\(/i,
        /Function\(/i,
        /setTimeout\(/i,
        /setInterval\(/i
      ];

      return !suspiciousPatterns.some(pattern => pattern.test(text));
    } catch {
      return false;
    }
  }, []);

  const checkRateLimit = useCallback((operation: string, customConfig?: unknown): boolean => {
    switch (operation) {
      case 'auth':
        return authRateLimit.checkRateLimit(operation);
      case 'upload':
        return uploadRateLimit.checkRateLimit(operation);
      case 'ai':
        return aiRateLimit.checkRateLimit(operation);
      case 'api':
        return apiRateLimit.checkRateLimit(operation);
      default:
        return apiRateLimit.checkRateLimit(operation);
    }
  }, [authRateLimit, uploadRateLimit, aiRateLimit, apiRateLimit]);

  const sanitizeForDatabase = useCallback((input: unknown): unknown => {
    if (typeof input === 'string') {
      return security.sanitizeInput(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(sanitizeForDatabase);
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: unknown = {};
      for (const [key, value] of Object.entries(input)) {
        // Sanitize both key and value
        const sanitizedKey = security.sanitizeInput(key);
        sanitized[sanitizedKey] = sanitizeForDatabase(value);
      }
      return sanitized;
    }
    
    return input;
  }, [security]);

  const validateImageFile = useCallback((file: File): boolean => {
    // Only allow specific image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return false;
    }

    // Check file size (max 5MB for images)
    if (file.size > 5 * 1024 * 1024) {
      return false;
    }

    return true;
  }, []);

  const sanitizeFilename = useCallback((filename: string): string => {
    if (!filename || typeof filename !== 'string') return 'document';
    
    return filename
      // Replace special characters and spaces
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      // Remove multiple underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, '')
      // Limit length
      .slice(0, 100)
      // Ensure not empty
      || 'document';
  }, []);

  const value: EnhancedSecurityContextType = {
    // Original functions
    ...security,
    
    // Enhanced functions
    sanitizeHtml,
    validateFileContent,
    checkRateLimit,
    sanitizeForDatabase,
    validateImageFile,
    sanitizeFilename
  };

  return (
    <EnhancedSecurityContext.Provider value={value}>
      {children}
    </EnhancedSecurityContext.Provider>
  );
};

export const useEnhancedSecurity = (): EnhancedSecurityContextType => {
  const context = useContext(EnhancedSecurityContext);
  if (!context) {
    throw new Error('useEnhancedSecurity must be used within an EnhancedSecurityProvider');
  }
  return context;
};