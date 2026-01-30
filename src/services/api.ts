/**
 * Direct API service for all backend calls
 * Replaces all Supabase direct calls - everything goes through backend
 */

import { API_BASE_URL } from '@/config/api.config';
import { Contract, Maintenance, Client, ApiResponse } from '@/types';
import { logger } from '@/lib/logger';

// Custom error type with additional properties
interface ApiError extends Error {
  status?: number;
  detail?: string;
}

const API_URL = API_BASE_URL;

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Generic fetch wrapper with type support
export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const startTime = performance.now();
  const method = options.method || 'GET';
  
  logger.debug(`API Request: ${method} ${endpoint}`, {
    endpoint,
    method,
    headers: getAuthHeaders()
  }, 'API', 'request');

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const duration = performance.now() - startTime;
    const data = await response.json() as T;

    if (!response.ok) {
      logger.error(`API Error: ${method} ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration.toFixed(2)}ms`,
        data
      }, 'API', 'error');

      // Extract error message from response
      const errorMessage = (data as Record<string, unknown>)?.detail || (data as Record<string, unknown>)?.message || (data as Record<string, unknown>)?.error || 'Erro na requisição';
      const error: ApiError = new Error(String(errorMessage));
      error.status = response.status;
      error.detail = (data as Record<string, unknown>)?.detail as string | undefined;
      throw error;
    }

    logger.info(`API Success: ${method} ${endpoint}`, {
      status: response.status,
      duration: `${duration.toFixed(2)}ms`,
      dataSize: JSON.stringify(data).length
    }, 'API', 'success');

    return data;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (error instanceof Error && 'status' in error) {
      // This is an API error we already logged
      throw error;
    }

    // Network or other error
    logger.error(`API Network Error: ${method} ${endpoint}`, {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration.toFixed(2)}ms`
    }, 'API', 'network_error');

    throw error;
  }
}

// Contracts API
export const contractsApi = {
  getAll: () => apiFetch<Contract[]>('/api/contracts'),
  create: (data: Partial<Contract>) => apiFetch<Contract>('/api/contracts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Contract>) => apiFetch<Contract>(`/api/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => apiFetch<void>(`/api/contracts/${id}`, {
    method: 'DELETE'
  })
};

// Maintenances API
export const maintenancesApi = {
  getAll: () => apiFetch<Maintenance[]>('/api/maintenances'),
  create: (data: Partial<Maintenance>) => apiFetch<Maintenance>('/api/maintenances', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Maintenance>) => apiFetch<Maintenance>(`/api/maintenances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => apiFetch<void>(`/api/maintenances/${id}`, {
    method: 'DELETE'
  })
};

// Clients API
export const clientsApi = {
  getAll: () => apiFetch<Client[]>('/api/clients'),
  create: (data: Partial<Client>) => apiFetch<Client>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Client>) => apiFetch<Client>(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => apiFetch<void>(`/api/clients/${id}`, {
    method: 'DELETE'
  })
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => apiFetch('/api/dashboard-metrics')
};

// Auth API
export const authApi = {
  signIn: (email: string, password: string) => apiFetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  signUp: (email: string, password: string) => apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  signOut: () => apiFetch('/api/auth/signout', {
    method: 'POST'
  })
};

// Export a mock supabase object for compatibility
export const supabase = {
  from: (table: string) => ({
    select: () => ({
      then: async (resolve: Function) => {
        try {
          let data;
          switch(table) {
            case 'contracts':
              data = await contractsApi.getAll();
              break;
            case 'maintenances':
              data = await maintenancesApi.getAll();
              break;
            case 'clients':
              data = await clientsApi.getAll();
              break;
            default:
              data = [];
          }
          resolve({ data, error: null });
        } catch (error) {
          resolve({ data: null, error });
        }
      },
      eq: () => ({
        then: async (resolve: (value: unknown) => void) => {
          // Simplified - just return all data for now
          const result = await supabase.from(table).select().then((r: unknown) => r);
          resolve(result);
        }
      })
    }),
    insert: (data: Record<string, unknown>) => ({
      then: async (resolve: (value: unknown) => void) => {
        try {
          let result;
          switch(table) {
            case 'contracts':
              result = await contractsApi.create(data as Partial<Contract>);
              break;
            case 'maintenances':
              result = await maintenancesApi.create(data as Partial<Maintenance>);
              break;
            case 'clients':
              result = await clientsApi.create(data as Partial<Client>);
              break;
            default:
              result = null;
          }
          resolve({ data: result, error: null });
        } catch (error) {
          resolve({ data: null, error });
        }
      }
    }),
    update: (data: Record<string, unknown>) => ({
      eq: (column: string, id: string) => ({
        then: async (resolve: (value: unknown) => void) => {
          try {
            let result;
            switch(table) {
              case 'contracts':
                result = await contractsApi.update(id, data as Partial<Contract>);
                break;
              case 'maintenances':
                result = await maintenancesApi.update(id, data as Partial<Maintenance>);
                break;
              case 'clients':
                result = await clientsApi.update(id, data as Partial<Client>);
                break;
              default:
                result = null;
            }
            resolve({ data: result, error: null });
          } catch (error) {
            resolve({ data: null, error });
          }
        }
      })
    }),
    delete: () => ({
      eq: (column: string, id: string) => ({
        then: async (resolve: (value: unknown) => void) => {
          try {
            let result;
            switch(table) {
              case 'contracts':
                result = await contractsApi.delete(id);
                break;
              case 'maintenances':
                result = await maintenancesApi.delete(id);
                break;
              case 'clients':
                result = await clientsApi.delete(id);
                break;
              default:
                result = null;
            }
            resolve({ data: result, error: null });
          } catch (error) {
            resolve({ data: null, error });
          }
        }
      })
    })
  }),
  
  channel: () => ({
    on: function() { return this; },
    subscribe: () => ({ status: 'SUBSCRIBED' }),
    unsubscribe: () => {}
  }),
  
  removeChannel: (channel: unknown) => {
    // No-op for compatibility
  },
  
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  },
  
  auth: {
    getUser: async () => {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        return { data: { user: JSON.parse(userData) }, error: null };
      }
      return { data: null, error: { message: 'Not authenticated' } };
    }
  }
};

// Export backendApi for compatibility with AuthContext
export const backendApi = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return response.json();
    },
    signin: async (email: string, password: string) => {
      return authApi.signIn(email, password);
    },
    signup: async (email: string, password: string) => {
      return authApi.signUp(email, password);
    },
    signout: async () => {
      return authApi.signOut();
    },
    getCurrentUser: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, data: null };
      
      try {
        const response = await fetch(`${API_URL}/api/auth/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const responseData = await response.json();
          // Backend returns: { success: true, data: { user: {...}, session: {...} } }
          if (responseData.success && responseData.data) {
            return { 
              success: true, 
              data: { 
                user: responseData.data.user,
                session: { access_token: token }
              }
            };
          }
        }
        return { success: false, data: null };
      } catch (error) {
        return { success: false, data: null };
      }
    },
    getUser: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      
      const response = await fetch(`${API_URL}/admin/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    }
  },
  admin: {
    getTableStats: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      
      const response = await fetch(`${API_URL}/admin/table-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
      return null;
    },
    getDetailedMetrics: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      
      const response = await fetch(`${API_URL}/admin/detailed-metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
      return null;
    }
  }
};