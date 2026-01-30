import React, { createContext, useContext, useEffect, useState } from 'react';
import { backendApi } from '@/services/api';

// Define User and Session types locally to avoid Supabase dependency
interface User {
  id: string;
  email?: string;
  role?: 'admin' | 'user';
  [key: string]: unknown;
}

interface Session {
  access_token: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session through backend API and localStorage
    const checkSession = async () => {
      try {
        // First try to get from localStorage for immediate state restore
        const storedToken = localStorage.getItem('auth_token');
        const storedUserData = localStorage.getItem('user_data');
        
        if (storedToken && storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            // Create a minimal session object with proper validation
            // Accept only valid JWT tokens (3 parts separated by dots)
            const isValidToken = storedToken.split('.').length === 3;
            
            if (isValidToken) {
              setSession({ access_token: storedToken } as unknown);
            } else {
              // Token is malformed, clear it
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_data');
              setUser(null);
              setSession(null);
            }
          } catch (e) {
            // If parsing fails, clear invalid data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
          }
        }
        
        // Only verify with backend API if we have a stored token
        if (storedToken) {
          try {
            const currentUser = await backendApi.auth.getCurrentUser();
            
            console.log('AuthContext - getCurrentUser response:', currentUser);
            
            if (currentUser.success && currentUser.data) {
              const { user, session } = currentUser.data;
              console.log('AuthContext - setting user:', user);
              console.log('AuthContext - setting session:', session);
              setUser(user);
              setSession(session);
              
              // Update localStorage with fresh data
              if (session?.access_token) {
                localStorage.setItem('auth_token', session.access_token);
                localStorage.setItem('user_data', JSON.stringify(user));
              }
            } else {
              console.log('Backend validation failed, but keeping local session for now');
              // Don't clear session immediately - user experience priority
              // Keep the local session until explicit logout or real error
            }
          } catch (error: unknown) {
            // Only clear on actual authorization errors
            if (error.message?.includes('Session expired') || error.message?.includes('401')) {
              console.log('Token expired, clearing session');
              setUser(null);
              setSession(null);
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_data');
            } else {
              console.log('Network error during validation, keeping local session:', error.message);
              // Keep local session on network errors
            }
          }
        } else {
          // No stored token, user is not authenticated
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        // No valid session - user is not authenticated
        setUser(null);
        setSession(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await backendApi.auth.signup(email, password);
      
      if (response.success) {
        // Handle both response formats: direct user/token or nested data structure
        let user, token;
        
        if (response.data) {
          // New format: { success: true, data: { user, session } }
          const { user: userData, session } = response.data;
          user = userData;
          token = session?.access_token;
        } else {
          // Legacy format: { success: true, user, token }
          user = response.user;
          token = response.token;
        }
        
        if (user && token) {
          // Accept only valid JWT tokens (3 parts separated by dots)
          const isValidToken = token.split('.').length === 3;
          
          if (isValidToken) {
            setUser(user);
            setSession({ access_token: token });
            
            // Persist session data to localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(user));
          } else {
            console.error('Invalid token format received from backend');
            return { error: { message: 'Invalid authentication token received' } };
          }
        }
        return { error: null };
      } else {
        return { error: { message: response.error || 'Registration failed' } };
      }
    } catch (error: unknown) {
      return { 
        error: { 
          message: error.detail || error.message || 'Registration failed' 
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Input validation and sanitization
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }

    try {
      const response = await backendApi.auth.signin(email.toLowerCase().trim(), password);
      
      if (response.success) {
        // Handle both response formats: direct user/token or nested data structure
        let user, token;
        
        if (response.data) {
          // New format: { success: true, data: { user, session } }
          const { user: userData, session } = response.data;
          user = userData;
          token = session?.access_token;
        } else {
          // Legacy format: { success: true, user, token }
          user = response.user;
          token = response.token;
        }
        
        if (user && token) {
          // Accept only valid JWT tokens (3 parts separated by dots)
          const isValidToken = token.split('.').length === 3;
          
          if (isValidToken) {
            setUser(user);
            setSession({ access_token: token });
            
            // Persist session data to localStorage for refresh persistence
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(user));
          } else {
            console.error('Invalid token format received from backend');
            return { error: { message: 'Invalid authentication token received' } };
          }
        }
        return { error: null };
      } else {
        return { error: { message: response.error || 'Login failed' } };
      }
    } catch (error: unknown) {
      return { 
        error: { 
          message: error.detail || error.message || 'Login failed' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      await backendApi.auth.signout();
    } catch (error) {
      // Ignore logout errors (403 Forbidden is common and safe to ignore)
      // User will be logged out locally regardless
    } finally {
      // Clear local state and localStorage regardless of backend response
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};