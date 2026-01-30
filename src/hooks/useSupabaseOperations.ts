
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useSupabaseOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSupabaseError = (error: any, customMessage?: string) => {
    console.error('Supabase error:', error);
    toast({
      title: "Erro na operação",
      description: customMessage || "Ocorreu um erro inesperado. Tente novamente.",
      variant: "destructive"
    });
  };

  const handleSupabaseSuccess = (message: string, description?: string) => {
    toast({
      title: message,
      description,
    });
  };

  const createContract = async (contractData: unknown) => {
    if (!user) {
      handleSupabaseError(null, "Usuário não autenticado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();

      if (error) throw error;
      
      handleSupabaseSuccess("Contrato criado", `Contrato ${contractData.contract_number} criado com sucesso.`);
      return data;
    } catch (error) {
      handleSupabaseError(error, "Falha ao criar contrato");
      return null;
    }
  };

  const findClientByCNPJ = async (cnpj: string) => {
    if (!user || !cnpj) {
      return null;
    }

    try {
      // Clean CNPJ - remove all non-numeric characters
      const cleanCNPJ = cnpj.replace(/[^0-9]/g, '');
      
      if (cleanCNPJ.length !== 14) {
        console.warn(`Invalid CNPJ format: ${cnpj}`);
        return null;
      }

      // Search for existing client with same CNPJ
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .ilike('cnpj', `%${cleanCNPJ}%`)
        .limit(1);

      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error finding client by CNPJ:', error);
      return null;
    }
  };

  const createClient = async (clientData: unknown) => {
    if (!user) {
      handleSupabaseError(null, "Usuário não autenticado");
      return null;
    }

    try {
      // Check for duplicate CNPJ first
      if (clientData.cnpj) {
        const existingClient = await findClientByCNPJ(clientData.cnpj);
        if (existingClient) {
          console.log(`Cliente já existe com CNPJ ${clientData.cnpj}: ${existingClient.name}`);
          toast({
            title: "Cliente já existe",
            description: `Cliente "${existingClient.name}" já cadastrado com este CNPJ. Utilizando cliente existente.`,
            variant: "default"
          });
          return existingClient;
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...clientData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      handleSupabaseSuccess("Cliente criado", `Cliente ${clientData.name} criado com sucesso.`);
      return data;
    } catch (error) {
      handleSupabaseError(error, "Falha ao criar cliente");
      return null;
    }
  };

  const uploadDocument = async (filePath: string, file: File) => {
    if (!user) {
      handleSupabaseError(null, "Usuário não autenticado");
      return false;
    }

    try {
      const { error } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      return true;
    } catch (error) {
      handleSupabaseError(error, "Falha no upload do documento");
      return false;
    }
  };

  const createDocumentRecord = async (documentData: unknown) => {
    if (!user) {
      handleSupabaseError(null, "Usuário não autenticado");
      return false;
    }

    try {
      const { error } = await supabase
        .from('contract_documents')
        .insert([{
          ...documentData,
          uploaded_by: user.id
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      handleSupabaseError(error, "Falha ao registrar documento");
      return false;
    }
  };

  const saveChatMessage = async (contractId: string, role: 'user' | 'assistant', content: string) => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from('ai_generated_plans')
        .insert({
          contract_id: contractId,
          plan_type: 'technical_analysis',
          content: `${role.toUpperCase()}: ${content}`,
          status: 'generated',
          user_id: user.id,
          created_by: user.id
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving chat message:', error);
      return false;
    }
  };

  return {
    createContract,
    createClient,
    findClientByCNPJ,
    uploadDocument,
    createDocumentRecord,
    saveChatMessage,
    handleSupabaseError,
    handleSupabaseSuccess
  };
};
