import { useState } from 'react';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/config/api.config';

interface ExtractedData {
  // Informações do Contrato
  contract_number?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  value?: number;
  status?: string;
  description?: string;
  
  // Informações do Cliente
  client_name?: string;
  client_cnpj?: string;
  client_email?: string;
  client_phone?: string;
  client_phone_secondary?: string;
  client_address?: string;
  client_contact_person?: string;
  client_website?: string;
  client_emergency_contact?: string;
  client_observations?: string;
  
  // Informações dos Equipamentos
  equipment?: Array<{
    type: string;
    model: string;
    manufacturer?: string;
    serial_number?: string;
    location?: string;
    installation_date?: string;
    quantity?: number;
    observations?: string;
  }>;
  
  // Serviços e Manutenções
  services?: Array<{
    name: string;
    frequency?: string;
    description?: string;
  }>;
  
  // Plano de Manutenção
  maintenance_plan?: {
    daily?: string[];
    weekly?: string[];
    monthly?: string[];
    quarterly?: string[];
    yearly?: string[];
  };
}

export function useContractExtractionViaStorage() {
  const { session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  const extractAndSaveContractData = async (
    file: File, 
    contractId: string
  ): Promise<ExtractedData | null> => {
    try {
      setIsExtracting(true);
      setExtractionProgress(10);
      
      console.log('🚀 Iniciando extração via Supabase Storage...');
      
      // Check AuthContext session before proceeding
      if (!session?.access_token) {
        console.warn('⚠️ [Contract Extraction] AuthContext session not available');
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }
      
      console.log('✅ [Contract Extraction] AuthContext ready, starting extraction...');
      
      // 1. Upload file to Supabase Storage
      const fileName = `contracts/${contractId}/${Date.now()}-${file.name}`;
      setExtractionProgress(20);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error('Erro ao fazer upload do arquivo');
      }
      
      setExtractionProgress(40);

      // 2. Get signed URL (válida por 1 hora) para backend processar
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .createSignedUrl(fileName, 3600); // 1 hora de validade

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('Erro ao gerar signed URL:', signedUrlError);
        throw new Error('Erro ao gerar URL de acesso temporário');
      }

      const signedUrl = signedUrlData.signedUrl;
      console.log('📎 Arquivo enviado para:', signedUrl);
      setExtractionProgress(50);
      
      // 3. Call API with file URL instead of base64
      const apiUrl = getApiUrl('/process-pdf-storage');
      console.log('[Contract Extraction] API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: signedUrl,
          filename: file.name,
          contractId: contractId,
          storagePath: fileName
        })
      });
      
      setExtractionProgress(70);
      
      if (!response.ok) {
        // Clean up uploaded file if processing fails
        await supabase.storage
          .from(CONTRACT_DOCUMENTS_BUCKET)
          .remove([fileName]);
          
        throw new Error('Erro na extração do PDF');
      }
      
      const result = await response.json();
      console.log('📄 Dados extraídos:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Nenhum dado foi extraído');
      }
      
      const extractedData = result.data.extracted_data || {};
      setExtractionProgress(80);
      
      // Save extracted data to database (if needed)
      if (extractedData.client_name || extractedData.contract_number) {
        setExtractionProgress(90);
        
        // Check AuthContext session before database update
        if (!session?.access_token) {
          console.warn('⚠️ [Contract Extraction] AuthContext session not available for database update');
          // Don't throw error, just skip database update but return extracted data
        } else {
          // Update contract with extracted data
          const { error: updateError } = await supabase
            .from('contracts')
            .update({
              extracted_data: extractedData,
              pdf_url: publicUrl,
              // Dados do cliente extraídos
              client_name: extractedData.client_name,
              client_cnpj: extractedData.client_cnpj,
              client_email: extractedData.client_email,
              client_phone: extractedData.client_phone,
              client_address: extractedData.client_address,
              client_city: extractedData.client_city,
              client_state: extractedData.client_state,
              client_zip_code: extractedData.client_zip_code,
              client_contact_person: extractedData.client_contact_person,
              client_website: extractedData.client_website,
              client_emergency_contact: extractedData.client_emergency_contact,
              // Dados comerciais
              payment_terms: extractedData.payment_terms,
              technical_notes: extractedData.technical_notes,
              special_conditions: extractedData.special_conditions,
              warranty_terms: extractedData.warranty_terms,
              updated_at: new Date().toISOString()
            })
            .eq('id', contractId);
            
          if (updateError) {
            console.error('Erro ao salvar dados extraídos:', updateError);
          } else {
            console.log('✅ [Contract Extraction] Dados salvos no banco de dados');
          }
        }
      }
      
      setExtractionProgress(100);
      toast.success('Dados extraídos com sucesso!');
      
      return extractedData;
      
    } catch (error) {
      console.error('Erro na extração:', error);
      toast.error('Erro ao processar o PDF. Tente novamente.');
      return null;
    } finally {
      setIsExtracting(false);
      setTimeout(() => setExtractionProgress(0), 1000);
    }
  };

  return {
    extractAndSaveContractData,
    isExtracting,
    extractionProgress
  };
}