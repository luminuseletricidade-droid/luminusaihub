// API Configuration for different environments
// This file centralizes all API endpoint configuration

// Get API URL from environment variable only - no hardcoded fallbacks
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    console.error('VITE_API_URL is not set in environment variables. Please configure it in .env file.');
    throw new Error('API URL not configured. Check your .env file.');
  }
  
  return apiUrl;
}

export const API_BASE_URL = getApiBaseUrl();

// Log configuration for debugging
if (typeof window !== 'undefined') {
  console.log('[API Config]', {
    API_BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
}

// API Endpoints
export const API_ENDPOINTS = {
  // PDF Processing
  processBase64PDF: `${API_BASE_URL}/api/process-base64-pdf`,
  
  // Document Generation  
  generateDocument: `${API_BASE_URL}/api/generate-document`,
  
  // Auth
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    user: `${API_BASE_URL}/api/auth/user`,
    logout: `${API_BASE_URL}/api/auth/logout`,
  },
  
  // Resources
  contracts: `${API_BASE_URL}/api/contracts`,
  maintenances: `${API_BASE_URL}/api/maintenances`,
  chatSessions: `${API_BASE_URL}/api/chat-sessions`,
  
  // Admin
  admin: {
    tableStats: `${API_BASE_URL}/admin/table-stats`,
    detailedMetrics: `${API_BASE_URL}/admin/detailed-metrics`,
  }
};

// Timeout configurations for different file sizes
export const TIMEOUT_CONFIG = {
  // Default timeout for regular requests (60 seconds)
  default: 60000,

  // Timeout for small files < 5MB (3 minutes)
  small: 180000,

  // Timeout for medium files 5-10MB (5 minutes)
  medium: 300000,

  // Timeout for large files > 10MB (10 minutes)
  large: 600000,

  // Maximum timeout (15 minutes)
  maximum: 900000
};

// Get timeout based on file size
export function getTimeoutForFileSize(fileSizeMB: number): number {
  if (fileSizeMB < 5) return TIMEOUT_CONFIG.small;
  if (fileSizeMB < 10) return TIMEOUT_CONFIG.medium;
  return TIMEOUT_CONFIG.large;
}

// Helper function to get the correct API URL
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

// Timeout error handling
export interface TimeoutError {
  isTimeout: boolean;
  timeoutSeconds: number;
  message: string;
  retryable: boolean;
}

export function createTimeoutError(timeoutMs: number): TimeoutError {
  return {
    isTimeout: true,
    timeoutSeconds: timeoutMs / 1000,
    message: `Request timed out after ${timeoutMs / 1000} seconds`,
    retryable: true
  };
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error && error.isTimeout === true;
}

// Enhanced error response handler
export function handleApiError(error: unknown): {
  isTimeout: boolean;
  isNetworkError: boolean;
  isServerError: boolean;
  message: string;
  details?: unknown;
  retryable: boolean;
} {
  // Timeout error from backend (408)
  if (error?.response?.status === 408) {
    return {
      isTimeout: true,
      isNetworkError: false,
      isServerError: false,
      message: error.response?.data?.detail?.message || "Request timed out",
      details: error.response?.data?.detail,
      retryable: true
    };
  }

  // Network timeout or connection error
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      isTimeout: true,
      isNetworkError: true,
      isServerError: false,
      message: "Connection timeout - please check your internet connection",
      retryable: true
    };
  }

  // Network connection error
  if (!error?.response) {
    return {
      isTimeout: false,
      isNetworkError: true,
      isServerError: false,
      message: "Network connection failed - please check your internet connection",
      retryable: true
    };
  }

  // Server errors (5xx)
  if (error?.response?.status >= 500) {
    return {
      isTimeout: false,
      isNetworkError: false,
      isServerError: true,
      message: "Server error - please try again later",
      details: error.response?.data,
      retryable: true
    };
  }

  // Client errors (4xx)
  return {
    isTimeout: false,
    isNetworkError: false,
    isServerError: false,
    message: error?.response?.data?.detail || error?.message || "An error occurred",
    details: error.response?.data,
    retryable: false
  };
}