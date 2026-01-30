import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface UseAuthenticatedRequestResult {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export const useAuthenticatedRequest = (): UseAuthenticatedRequestResult => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthentication = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ [AuthenticatedRequest] Erro na sessão:', sessionError.message);
        setError('Erro ao verificar sessão');
        return;
      }
      
      if (currentSession?.access_token && currentSession?.user) {
        console.log('✅ [AuthenticatedRequest] Sessão válida:', currentSession.user.email);
        setSession(currentSession);
      } else {
        console.log('⏳ [AuthenticatedRequest] Aguardando autenticação...');
        setSession(null);
      }
    } catch (err) {
      console.error('❌ [AuthenticatedRequest] Erro inesperado:', err);
      setError('Erro inesperado na autenticação');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setIsLoading(true);
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    // Initial check with a small delay to let auth settle
    const timer = setTimeout(() => {
      checkAuthentication();
    }, 100);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`🔄 [AuthenticatedRequest] Auth state change:`, event);
      
      if (event === 'SIGNED_IN' && newSession) {
        console.log('✅ [AuthenticatedRequest] Usuário logado');
        setSession(newSession);
        setError(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 [AuthenticatedRequest] Usuário deslogado');
        setSession(null);
        setError(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        console.log('🔄 [AuthenticatedRequest] Token atualizado');
        setSession(newSession);
        setError(null);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [checkAuthentication]);

  return {
    session,
    isLoading,
    error,
    retry
  };
};