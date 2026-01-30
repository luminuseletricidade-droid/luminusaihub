
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Redirect authenticated users to app dashboard automatically
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    // Show loading state while redirecting
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center space-y-8 p-6">
        <div className="space-y-4">
          <Building2 className="h-20 w-20 text-primary mx-auto" />
          <h1 className="text-4xl font-bold">Luminus Contract AI Hub</h1>
          <p className="text-xl text-muted-foreground">
            Sistema inteligente de gestão de contratos com IA para automatizar
            processos de manutenção e locação de geradores
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/app/dashboard')} 
          size="lg"
          className="px-8 py-4 text-lg"
        >
          Acessar Sistema
        </Button>
      </div>
    </div>
  );
};

export default Index;
