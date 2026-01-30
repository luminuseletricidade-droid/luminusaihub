import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AuthSessionHook {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  waitForAuth: (maxRetries?: number, delayMs?: number) => Promise<Session | null>;
  refreshSession: () => Promise<void>;
}

export const useAuthSession = (): AuthSessionHook => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced authentication check with better error handling and logging
  const waitForAuth = useCallback(async (maxRetries = 15, delayMs = 300): Promise<Session | null> => {
    console.log('🔐 [AuthSession] Iniciando verificação de autenticação...');
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check Supabase session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn(`⚠️ [AuthSession] Erro de sessão tentativa ${i + 1}:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        if (currentSession?.access_token && currentSession?.user) {
          console.log('✅ [AuthSession] Autenticação confirmada:', currentSession.user.email);
          setSession(currentSession);
          return currentSession;
        }
        
        if (i === 0) {
          console.log('⏳ [AuthSession] Aguardando estabelecimento da sessão...');
        }
        
        if (i % 5 === 0 && i > 0) {
          console.log(`🔄 [AuthSession] Tentativa ${i + 1}/${maxRetries} - ainda aguardando...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        console.error(`❌ [AuthSession] Erro na verificação tentativa ${i + 1}:`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.error('❌ [AuthSession] Falha na autenticação após todas as tentativas');
    return null;
  }, []);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthSession] Erro ao atualizar sessão:', error);
        setSession(null);
        return;
      }
      
      setSession(refreshedSession);
      console.log('🔄 [AuthSession] Sessão atualizada:', refreshedSession?.user?.email || 'nenhuma');
    } catch (error) {
      console.error('❌ [AuthSession] Erro inesperado ao atualizar sessão:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize session and set up listeners
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🚀 [AuthSession] Inicializando autenticação...');
      
      try {
        // Try to get existing session first
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('⚠️ [AuthSession] Erro ao obter sessão inicial:', error);
        }
        
        if (mounted) {
          if (initialSession?.access_token && initialSession?.user) {
            console.log('✅ [AuthSession] Sessão inicial encontrada:', initialSession.user.email);
            setSession(initialSession);
          } else {
            console.log('⏳ [AuthSession] Nenhuma sessão inicial, aguardando...');
            // Try to wait for authentication
            const authSession = await waitForAuth(10, 200);
            if (mounted && authSession) {
              setSession(authSession);
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ [AuthSession] Erro na inicialização:', error);
        if (mounted) {
          setSession(null);
          setIsLoading(false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`🔄 [AuthSession] Mudança de estado:`, event, newSession?.user?.email || 'nenhuma');
      
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
        
        // Log the authentication state change
        if (event === 'SIGNED_IN' && newSession) {
          console.log('✅ [AuthSession] Usuário logado:', newSession.user.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 [AuthSession] Usuário deslogado');
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('🔄 [AuthSession] Token atualizado para:', newSession.user.email);
        }
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [waitForAuth]);

  return {
    session,
    isAuthenticated: !!session?.access_token && !!session?.user,
    isLoading,
    waitForAuth,
    refreshSession
  };
};