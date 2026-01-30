import { supabase } from '@/integrations/supabase/client';
import { adjustToBusinessDay, isBusinessDay, addBusinessDays } from './businessDays';

interface MaintenancePlan {
  frequency?: string;
  maintenance_type?: string;
  daily?: string[];
  weekly?: string[];
  monthly?: string[];
  quarterly?: string[];
  included_services?: string[];
}

interface Service {
  type?: string;
  description?: string;
  frequency?: string;
  included_items?: string[];
}

interface GenerateMaintenancesParams {
  contractId: string;
  startDate: string;
  endDate: string;
  frequency?: string;
  contractType?: string;
  maintenancePlan?: MaintenancePlan;
  services?: (string | Service)[];
  equipmentType?: string;
  userId: string;
}

export const generateMaintenances = async ({
  contractId,
  startDate,
  endDate,
  frequency = 'monthly',
  contractType = 'maintenance',
  maintenancePlan,
  services = [],
  equipmentType = 'Gerador',
  userId
}: GenerateMaintenancesParams) => {
  try {
    if (!userId) {
      console.error('Erro ao gerar manutenções: userId é obrigatório');
      return { success: false, error: new Error('userId é obrigatório para gerar manutenções') };
    }

    const maintenances = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log('🔧 Gerando manutenções com dados reais do contrato:', {
      contractId,
      frequency,
      maintenancePlan,
      services,
      equipmentType
    });

    // Usar frequência do plano de manutenção da IA se disponível
    const actualFrequency = maintenancePlan?.frequency || frequency;
    
    // Determinar intervalo baseado na frequência real do contrato
    let intervalDays = 30; // mensal por padrão
    switch (actualFrequency) {
      case 'daily':
        intervalDays = 1;
        break;
      case 'weekly':
        intervalDays = 7;
        break;
      case 'biweekly':
        intervalDays = 14;
        break;
      case 'monthly':
        intervalDays = 30;
        break;
      case 'quarterly':
        intervalDays = 90;
        break;
      case 'semiannual':
        intervalDays = 180;
        break;
      case 'annual':
        intervalDays = 365;
        break;
    }
    
    // Gerar manutenções para o período do contrato
    // Ajustar data inicial para próximo dia útil se necessário
    let currentDate = adjustToBusinessDay(new Date(start));
    let maintenanceNumber = 1;
    
    while (currentDate <= end) {
      // Determinar tipo de manutenção baseado nos dados reais do contrato
      let maintenanceType = maintenancePlan?.maintenance_type || 'Preventiva';
      
      // Criar descrição baseada nos serviços reais do contrato
      let description = `Manutenção ${maintenanceType} - ${equipmentType}`;
      
      // Se tem serviços específicos, usar os do contrato
      let maintenanceServices: string[] = [];
      if (actualFrequency === 'daily' && maintenancePlan?.daily?.length) {
        maintenanceServices = maintenancePlan.daily;
        description = `Manutenção Diária - ${equipmentType}`;
      } else if (actualFrequency === 'weekly' && maintenancePlan?.weekly?.length) {
        maintenanceServices = maintenancePlan.weekly;
        description = `Manutenção Semanal - ${equipmentType}`;
      } else if (actualFrequency === 'monthly' && maintenancePlan?.monthly?.length) {
        maintenanceServices = maintenancePlan.monthly;
        description = `Manutenção Mensal - ${equipmentType}`;
      } else if (actualFrequency === 'quarterly' && maintenancePlan?.quarterly?.length) {
        maintenanceServices = maintenancePlan.quarterly;
        description = `Manutenção Trimestral - ${equipmentType}`;
      } else if (services.length > 0) {
        // Convert service objects to strings and deduplicate
        const serviceStrings = services.map(s =>
          typeof s === 'string' ? s : (s.type || s.description || 'Serviço')
        );
        // Remove duplicates using Set
        const uniqueServices = Array.from(new Set(serviceStrings));
        maintenanceServices = uniqueServices.slice(0, 3); // Primeiros 3 serviços únicos
        description = `${uniqueServices[0]} - ${equipmentType}`;
      }
      
      // Definir periodicidade especial para revisões maiores
      if (maintenanceNumber % 12 === 0) {
        maintenanceType = 'Anual';
        description = `Revisão Anual Completa - ${equipmentType}`;
      } else if (maintenanceNumber % 6 === 0) {
        maintenanceType = 'Semestral';
        description = `Revisão Semestral - ${equipmentType}`;
      } else if (maintenanceNumber % 3 === 0 && actualFrequency === 'monthly') {
        maintenanceType = 'Trimestral';
        description = `Inspeção Trimestral - ${equipmentType}`;
      }
      
      // Criar notas detalhadas com os serviços reais
      let notes = `Manutenção ${maintenanceNumber} - ${actualFrequency === 'daily' ? 'Diária' :
                   actualFrequency === 'weekly' ? 'Semanal' :
                   actualFrequency === 'biweekly' ? 'Quinzenal' :
                   actualFrequency === 'monthly' ? 'Mensal' :
                   actualFrequency === 'quarterly' ? 'Trimestral' :
                   actualFrequency === 'semiannual' ? 'Semestral' :
                   actualFrequency === 'annual' ? 'Anual' : 'Periódica'}`;
      
      if (maintenanceServices.length > 0) {
        notes += `\n\nServiços inclusos:\n${maintenanceServices.map(service => `• ${service}`).join('\n')}`;
      }
      
      if (maintenancePlan?.included_services?.length > 0) {
        notes += `\n\nServiços do contrato:\n${maintenancePlan.included_services.map(service => `• ${service}`).join('\n')}`;
      }

      // Verificar se a data da manutenção já passou para definir status correto
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
      
      const maintenanceDate = new Date(currentDate);
      maintenanceDate.setHours(0, 0, 0, 0);
      
      // Usar string ISO para comparação mais confiável
      const todayStr = today.toISOString().split('T')[0];
      const maintenanceStr = maintenanceDate.toISOString().split('T')[0];
      
      // Se a data da manutenção é anterior a hoje, marcar como atrasada
      const maintenanceStatus = maintenanceStr < todayStr ? 'overdue' : 'scheduled';
      
      console.log(`📅 Manutenção ${maintenanceNumber}:`);
      console.log(`   Data: ${maintenanceStr}`);
      console.log(`   Hoje: ${todayStr}`);
      console.log(`   Status: ${maintenanceStatus} (${maintenanceStr < todayStr ? 'ATRASADA' : 'agendada'})`);
      console.log(`   Comparação: ${maintenanceDate.getTime()} < ${today.getTime()} = ${maintenanceDate.getTime() < today.getTime()}`);
      
      maintenances.push({
        contract_id: contractId,
        user_id: userId,
        type: maintenanceType,
        description: description,
        scheduled_date: currentDate.toISOString().split('T')[0],
        scheduled_time: '09:00',
        status: maintenanceStatus,
        technician: null,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Avançar para a próxima data considerando apenas dias úteis
      if (actualFrequency === 'monthly') {
        // Para frequência mensal, avançar um mês e ajustar para dia útil
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate = adjustToBusinessDay(currentDate);
      } else {
        // Para outras frequências, usar addBusinessDays
        const businessDaysToAdd = Math.floor(intervalDays / 7) * 5; // Aproximação de dias úteis
        currentDate = addBusinessDays(currentDate, businessDaysToAdd || 1);
      }
      maintenanceNumber++;
    }
    
    // Inserir as manutenções no banco
    if (maintenances.length > 0) {
      // Contar quantas estão atrasadas
      const overdueCount = maintenances.filter(m => m.status === 'overdue').length;
      const scheduledCount = maintenances.filter(m => m.status === 'scheduled').length;
      
      console.log(`📊 Resumo das manutenções a serem criadas:`);
      console.log(`   Total: ${maintenances.length}`);
      console.log(`   Atrasadas: ${overdueCount} 🔴`);
      console.log(`   Agendadas: ${scheduledCount} 🟢`);
      
      const { data, error } = await supabase
        .from('maintenances')
        .insert(maintenances);
      
      if (error) {
        console.error('Erro ao criar manutenções:', error);
        throw error;
      }
      
      console.log(`✅ ${maintenances.length} manutenções criadas para o contrato ${contractId}`);
      console.log(`   - ${overdueCount} manutenções marcadas como ATRASADAS`);
      console.log(`   - ${scheduledCount} manutenções marcadas como agendadas`);
      
      return { success: true, count: maintenances.length, overdueCount, scheduledCount };
    }
    
    return { success: true, count: 0 };
  } catch (error) {
    console.error('Erro ao gerar manutenções:', error);
    return { success: false, error };
  }
};
