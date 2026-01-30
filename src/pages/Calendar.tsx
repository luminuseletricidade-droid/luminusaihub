import React, { useEffect } from 'react';
import EnhancedCalendar from '@/components/EnhancedCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const Calendar = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('📅 [Calendar] Componente montado');
    console.log('📅 [Calendar] User:', user?.id ? 'Autenticado' : 'Não autenticado');
    console.log('📅 [Calendar] Loading:', loading);
  }, [user, loading]);

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!user?.id) {
    console.error('❌ [Calendar] Usuário não autenticado');
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de autenticação</AlertTitle>
          <AlertDescription>
            Você precisa estar autenticado para acessar o calendário. Por favor, faça login novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  console.log('✅ [Calendar] Renderizando calendário para userId:', user.id);

  return <EnhancedCalendar userId={user.id} />;
};

export default Calendar;