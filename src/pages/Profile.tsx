import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { API_BASE_URL } from '@/config/api.config';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword || data.confirmPassword) {
    return data.currentPassword && data.currentPassword.length >= 6;
  }
  return true;
}, {
  message: 'Senha atual é obrigatória para alterar a senha',
  path: ['currentPassword'],
}).refine((data) => {
  if (data.newPassword && data.confirmPassword) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.newPassword) {
    return data.newPassword.length >= 6;
  }
  return true;
}, {
  message: 'Nova senha deve ter pelo menos 6 caracteres',
  path: ['newPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<unknown>(null);
  
  // DEBUG: Log user object to see its structure
  console.log('Profile - user object:', user);
  
  // Fetch user data directly from Supabase if backend user is not available
  useEffect(() => {
    const fetchSupabaseUser = async () => {
      try {
        const { data: { user: supaUser }, error } = await supabase.auth.getUser();
        if (supaUser) {
          console.log('Profile - Supabase user:', supaUser);
          setSupabaseUser(supaUser);
        }
      } catch (error) {
        console.error('Error fetching Supabase user:', error);
      }
    };

    if (!user || !user.email) {
      fetchSupabaseUser();
    }
  }, [user]);
  
  // Get email and name from backend user object or fallback to Supabase
  const userEmail = user?.email || supabaseUser?.email || '';
  const userName = user?.full_name || user?.username || supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || userEmail.split('@')[0] || '';

  console.log('Profile - userEmail:', userEmail);
  console.log('Profile - userName:', userName);
  console.log('Profile - supabaseUser:', supabaseUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userName,
    },
  });

  // Update form when userName changes
  useEffect(() => {
    if (userName) {
      setValue('name', userName);
    }
  }, [userName, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    
    try {
      // Update display name
      if (data.name !== user?.full_name) {
        const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ full_name: data.name })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update profile');
        }
      }
      
      // Update password if provided
      if (data.newPassword && data.currentPassword) {
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ 
            current_password: data.currentPassword,
            new_password: data.newPassword
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            toast({
              title: 'Erro',
              description: 'Senha atual incorreta',
              variant: 'destructive',
            });
            return;
          }
          throw new Error(errorData.error || 'Failed to update password');
        }
      }
      
      toast({
        title: 'Perfil Atualizado',
        description: 'Suas informações foram atualizadas com sucesso',
      });
      
      // Reset password fields
      reset({
        name: data.name,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao Atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar seu perfil',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize suas informações de perfil e senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline-block w-4 h-4 mr-2" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado {!userEmail && "(Nenhum e-mail encontrado)"}
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="inline-block w-4 h-4 mr-2" />
                Nome
              </Label>
              <Input
                id="name"
                type="text"
                {...register('name')}
                placeholder="Seu nome completo"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Alterar Senha</h3>
              
              {/* Current Password */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="currentPassword">
                  <Lock className="inline-block w-4 h-4 mr-2" />
                  Senha Atual
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...register('currentPassword')}
                  placeholder="Digite sua senha atual"
                />
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="newPassword">
                  <Lock className="inline-block w-4 h-4 mr-2" />
                  Nova Senha
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...register('newPassword')}
                  placeholder="Digite sua nova senha"
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <Lock className="inline-block w-4 h-4 mr-2" />
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirme sua nova senha"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}