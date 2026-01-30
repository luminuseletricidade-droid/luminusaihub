import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export function useContractExtraction() {
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
      
      console.log('🚀 Iniciando extração completa do contrato...');
      
      // Converter arquivo para Base64
      const base64Data = await fileToBase64(file);
      setExtractionProgress(20);
      
      // Chamar backend para extração com IA
      const apiUrl = getApiUrl('/process-base64-pdf');
      console.log('[Contract Extraction] API URL:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Data,
          filename: file.name,
          contractId: contractId
        })
      });
      
      setExtractionProgress(50);
      
      if (!response.ok) {
        throw new Error('Erro na extração do PDF');
      }
      
      const result = await response.json();
      console.log('📄 Dados extraídos:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Nenhum dado foi extraído');
      }
      
      const extractedData = result.data.extracted_data || {};
      const maintenancePlan = result.data.maintenance_plan || {};
      
      setExtractionProgress(70);
      
      // Preparar dados para atualização
      const updateData: unknown = {
        // Dados básicos do contrato
        description: extractedData.observations || `Contrato extraído de ${file.name}`,
        status: extractedData.status || 'active',
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
      };
      
      // Adicionar valor se extraído
      if (extractedData.contract_value) {
        const value = parseFloat(extractedData.contract_value.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(value)) {
          updateData.value = value;
        }
      }
      
      // Adicionar datas se extraídas
      if (extractedData.contract_date) {
        updateData.start_date = formatDate(extractedData.contract_date);
      }
      if (extractedData.duration) {
        // Calcular end_date baseado na duração
        const startDate = new Date(updateData.start_date || new Date());
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 ano
        updateData.end_date = endDate.toISOString().split('T')[0];
      }
      
      // Atualizar contrato com dados extraídos
      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId);

      if (updateError) {
        console.error('Erro ao atualizar contrato:', updateError);
      }

      setExtractionProgress(75);

      // ⚡ Executar operações paralelas para melhor performance
      console.log('⚡ Iniciando operações paralelas de extração...');
      const parallelOperations = [];

      // Criar/Atualizar cliente se houver dados
      if (extractedData.client_name) {
        parallelOperations.push(
          createOrUpdateClient(extractedData, contractId)
            .catch(err => console.error('Erro ao processar cliente:', err))
        );
      }

      // Adicionar equipamentos se houver
      if (extractedData.equipment && extractedData.equipment.length > 0) {
        parallelOperations.push(
          addEquipments(extractedData.equipment, contractId)
            .catch(err => console.error('Erro ao processar equipamentos:', err))
        );
      }

      // Adicionar serviços se houver
      if (extractedData.services || maintenancePlan) {
        parallelOperations.push(
          addServices(extractedData.services, maintenancePlan, contractId)
            .catch(err => console.error('Erro ao processar serviços:', err))
        );
      }

      // Criar eventos de manutenção no calendário
      if (maintenancePlan && Object.keys(maintenancePlan).length > 0) {
        parallelOperations.push(
          createMaintenanceEvents(maintenancePlan, contractId, extractedData)
            .catch(err => console.error('Erro ao criar manutenções:', err))
        );
      }

      // Aguardar todas as operações em paralelo com timeout
      if (parallelOperations.length > 0) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Operações demoraram mais de 90 segundos')), 90000)
        );
        
        await Promise.race([
          Promise.all(parallelOperations),
          timeoutPromise
        ]);
      }

      setExtractionProgress(95);
      
      setExtractionProgress(100);
      
      toast.success('Extração completa!', {
        description: 'Todos os dados foram extraídos e salvos automaticamente.'
      });
      
      return {
        ...extractedData,
        maintenance_plan: maintenancePlan
      };
      
    } catch (error) {
      console.error('Erro na extração:', error);
      toast.error('Erro na extração', {
        description: 'Alguns dados podem não ter sido extraídos corretamente.'
      });
      return null;
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Função auxiliar para converter arquivo para Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Função para formatar datas
  const formatDate = (dateStr: string): string => {
    try {
      // Tentar diferentes formatos de data
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // Se falhar, tentar formato brasileiro DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };
  
  // Criar ou atualizar cliente com verificação de CNPJ duplicado
  const createOrUpdateClient = async (data: any, contractId: string) => {
    try {
      let clientId;
      
      // Verificar se cliente já existe pelo CNPJ
      if (data.client_cnpj) {
        // Limpar CNPJ para comparação
        const cleanCNPJ = data.client_cnpj.replace(/[^0-9]/g, '');
        
        if (cleanCNPJ.length === 14) {
          // Buscar cliente existente com CNPJ limpo
          const { data: userData } = await supabase.auth.getUser();
          
          if (userData?.user?.id) {
            const { data: existingClients } = await supabase
              .from('clients')
              .select('id, name, cnpj')
              .eq('user_id', userData.user.id);
            
            // Encontrar cliente com CNPJ correspondente
            const existingClient = existingClients?.find(client => {
              if (!client.cnpj) return false;
              const clientCleanCNPJ = client.cnpj.replace(/[^0-9]/g, '');
              return clientCleanCNPJ === cleanCNPJ;
            });
            
            if (existingClient) {
              clientId = existingClient.id;
              console.log(`Cliente já existe com CNPJ ${data.client_cnpj}: ${existingClient.name}`);
              
              // Atualizar dados do cliente existente (sem duplicar)
              await supabase
                .from('clients')
                .update({
                  name: data.client_name || existingClient.name,
                  email: data.client_email,
                  phone: data.client_phone,
                  address: data.client_address,
                  contact_person: data.client_contact_person,
                  website: data.client_website,
                  observations: data.client_observations,
                  updated_at: new Date().toISOString()
                })
                .eq('id', clientId);
              
              toast.success('Cliente existente vinculado', {
                description: `Cliente "${existingClient.name}" com CNPJ ${data.client_cnpj} foi vinculado ao contrato.`
              });
            }
          }
        } else {
          console.warn(`CNPJ inválido: ${data.client_cnpj} (deve ter 14 dígitos)`);
        }
      }
      
      // Se não existe, criar novo cliente
      if (!clientId) {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user?.id) {
          const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
              name: data.client_name,
              cnpj: data.client_cnpj,
              email: data.client_email,
              phone: data.client_phone,
              address: data.client_address,
              contact_person: data.client_contact_person,
              website: data.client_website,
              observations: data.client_observations,
              user_id: userData.user.id
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('Erro ao criar cliente:', insertError);
            // Verificar se é erro de CNPJ duplicado
            if (insertError.message.includes('idx_clients_unique_cnpj_per_user')) {
              toast.error('CNPJ já cadastrado', {
                description: 'Um cliente com este CNPJ já está cadastrado em sua conta.'
              });
              return;
            }
            throw insertError;
          }
          
          if (newClient) {
            clientId = newClient.id;
            console.log(`Novo cliente criado: ${newClient.name} (CNPJ: ${newClient.cnpj})`);
            toast.success('Novo cliente criado', {
              description: `Cliente "${newClient.name}" foi criado e vinculado ao contrato.`
            });
          }
        }
      }
      
      // Vincular cliente ao contrato
      if (clientId) {
        const { error: linkError } = await supabase
          .from('contracts')
          .update({ client_id: clientId })
          .eq('id', contractId);
          
        if (linkError) {
          console.error('Erro ao vincular cliente ao contrato:', linkError);
        }
      }
      
    } catch (error) {
      console.error('Erro ao criar/atualizar cliente:', error);
      toast.error('Erro ao processar cliente', {
        description: 'Não foi possível criar ou atualizar o cliente.'
      });
    }
  };
  
  // Adicionar equipamentos (com batch insert para melhor performance)
  const addEquipments = async (equipment: any, contractId: string) => {
    try {
      if (!equipment || equipment.length === 0) return;

      // ⚡ Preparar todos os equipamentos de uma vez (batch insert)
      const equipmentData = equipment.map((equip: any) => ({
        contract_id: contractId,
        equipment_type: equip.type || 'Gerador',
        model: equip.model || 'Modelo padrão',
        manufacturer: equip.manufacturer,
        serial_number: equip.serial_number,
        location: equip.location,
        installation_date: equip.installation_date ? formatDate(equip.installation_date) : null,
        quantity: equip.quantity || 1,
        observations: equip.observations
      }));

      console.log(`🔧 Inserindo ${equipmentData.length} equipamentos em batch otimizado...`);
      
      // ⚡ Batch insert com chunking para evitar limites de query
      const chunkSize = 50; // Processar em chunks de 50 equipamentos
      for (let i = 0; i < equipmentData.length; i += chunkSize) {
        const chunk = equipmentData.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('contract_equipment')
          .insert(chunk);
        
        if (error) {
          console.error(`Erro ao inserir chunk ${i}-${i + chunkSize}:`, error);
          throw error;
        }
      }
      
      console.log(`✅ ${equipmentData.length} equipamentos inseridos com sucesso`);
    } catch (error) {
      console.error('Erro ao adicionar equipamentos:', error);
    }
  };
  
  // Adicionar serviços (com batch insert para melhor performance)
  const addServices = async (services: any, maintenancePlan: any, contractId: string) => {
    try {
      // Converter plano de manutenção em serviços
      const allServices = [];

      if (maintenancePlan?.daily?.length) {
        allServices.push({
          name: 'Manutenção Diária',
          frequency: 'daily',
          description: maintenancePlan.daily.join(', ')
        });
      }

      if (maintenancePlan?.weekly?.length) {
        allServices.push({
          name: 'Manutenção Semanal',
          frequency: 'weekly',
          description: maintenancePlan.weekly.join(', ')
        });
      }

      if (maintenancePlan?.monthly?.length) {
        allServices.push({
          name: 'Manutenção Mensal',
          frequency: 'monthly',
          description: maintenancePlan.monthly.join(', ')
        });
      }

      // Adicionar serviços extraídos
      if (services && Array.isArray(services)) {
        allServices.push(...services);
      }

      if (allServices.length === 0) return;

      // ⚡ Preparar todos os serviços de uma vez (batch insert)
      const servicesData = allServices.map(service => ({
        contract_id: contractId,
        service_name: service.name,
        frequency: service.frequency,
        description: service.description,
        price: 0,
        is_included: true
      }));

      console.log(`💼 Inserindo ${servicesData.length} serviços em batch otimizado...`);
      
      // ⚡ Batch insert com chunking para evitar limites de query
      const chunkSize = 50; // Processar em chunks de 50 serviços
      for (let i = 0; i < servicesData.length; i += chunkSize) {
        const chunk = servicesData.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('contract_services')
          .insert(chunk);
        
        if (error) {
          console.error(`Erro ao inserir chunk ${i}-${i + chunkSize}:`, error);
          throw error;
        }
      }
      
      console.log(`✅ ${servicesData.length} serviços inseridos com sucesso`);
    } catch (error) {
      console.error('Erro ao adicionar serviços:', error);
    }
  };
  
  // Criar eventos de manutenção no calendário
  const createMaintenanceEvents = async (maintenancePlan: any, contractId: string, contractData: any) => {
    try {
      // Obter user_id do Supabase Auth
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.warn('Usuário não autenticado, pulando criação de manutenções');
        return;
      }

      const userId = userData.user.id;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const maintenances = [];

      // Criar manutenções mensais
      if (maintenancePlan.monthly?.length) {
        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
          maintenances.push({
            contract_id: contractId,
            client_id: contractData?.client_id || null,
            user_id: userId,
            type: 'preventiva',
            scheduled_date: new Date(d).toISOString().split('T')[0],
            scheduled_time: '09:00',
            status: 'scheduled',
            priority: 'medium',
            description: `Manutenção Mensal - ${contractData?.client_name || 'Cliente'}`,
            notes: maintenancePlan.monthly.join(', '),
            technician: 'A definir',
            estimated_duration: 2,
            client_name: contractData?.client_name,
            contract_number: contractData?.contract_number
          });
        }
      }

      // Inserir manutenções no banco (em batch otimizado para melhor performance)
      if (maintenances.length > 0) {
        console.log(`📅 Criando ${maintenances.length} eventos de manutenção em batch otimizado...`);
        
        // ⚡ Batch insert com chunking para evitar limites de query
        const chunkSize = 100; // Processar em chunks de 100 manutenções
        for (let i = 0; i < maintenances.length; i += chunkSize) {
          const chunk = maintenances.slice(i, i + chunkSize);
          const { error } = await supabase
            .from('maintenances')
            .insert(chunk);
          
          if (error) {
            console.error(`Erro ao inserir chunk ${i}-${i + chunkSize}:`, error);
            throw error;
          }
        }
        
        console.log(`✅ ${maintenances.length} manutenções criadas com sucesso`);
      }

    } catch (error) {
      console.error('Erro ao criar eventos de manutenção:', error);
    }
  };
  
  return {
    extractAndSaveContractData,
    isExtracting,
    extractionProgress
  };
}