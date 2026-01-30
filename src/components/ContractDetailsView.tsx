
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Wrench, CheckCircle, Clock, AlertTriangle, ScrollText } from 'lucide-react';
import { useContractSync } from '@/hooks/useContractSync';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateSafe } from '@/utils/formatters';

interface ContractDetailsViewProps {
  contractId: string;
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: 'default',
    inactive: 'secondary',
    expired: 'destructive',
    renewal: 'secondary',
    draft: 'outline'
  } as const;

  const labels = {
    active: 'Ativo',
    inactive: 'Inativo', 
    expired: 'Vencido',
    renewal: 'Renovação',
    draft: 'Rascunho'
  };

  const variant = variants[status as keyof typeof variants] || 'outline';
  const label = labels[status as keyof typeof labels] || status;

  return <Badge variant={variant}>{label}</Badge>;
};

const getTypeBadge = (type: string) => {
  const labels = {
    maintenance: 'Manutenção',
    rental: 'Locação',
    hybrid: 'Híbrido'
  };

  const label = labels[type as keyof typeof labels] || type;
  return <Badge variant="outline">{label}</Badge>;
};

const getOperationalStatusIcon = (maintenances: Maintenance[] = []) => {
  const pendingMaintenances = maintenances.filter((m: Maintenance) => m.status === 'scheduled');
  const overdueMaintenances = maintenances.filter((m: Maintenance) =>
    m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
  );
  
  if (overdueMaintenances.length > 0) {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  } else if (pendingMaintenances.length > 0) {
    return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  return <CheckCircle className="h-4 w-4 text-green-500" />;
};

const getOperationalStatusText = (maintenances: Maintenance[] = []) => {
  const pendingMaintenances = maintenances.filter((m: Maintenance) => m.status === 'scheduled');
  const overdueMaintenances = maintenances.filter((m: Maintenance) =>
    m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
  );
  
  if (overdueMaintenances.length > 0) {
    return 'OS atrasadas';
  } else if (pendingMaintenances.length > 0) {
    return 'OS pendente';
  }
  return 'OS em dia';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'Não informado';
  return formatDateSafe(dateString);
};

export const ContractDetailsView = ({ contractId }: ContractDetailsViewProps) => {
  const { contractData, isLoading } = useContractSync(contractId);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        ⚠️ Dados do contrato não disponíveis
      </div>
    );
  }

  const client = contractData.clients;
  const equipment = contractData.equipment || [];
  const services = contractData.contract_services || [];
  const maintenances = contractData.maintenances || [];

  const monthlyValue = contractData.value ? contractData.value / 12 : 0;
  const fallbackEquipmentDetails = {
    brand: contractData.equipment_brand?.trim() || '',
    serial: contractData.equipment_serial?.trim() || '',
    condition: contractData.equipment_condition?.trim() || '',
    year: contractData.equipment_year?.trim() || '',
    power: contractData.equipment_power?.trim() || '',
    voltage: contractData.equipment_voltage?.trim() || ''
  };

  const commercialInfo = [
    { key: 'payment_terms', label: 'Termos de Pagamento', value: contractData.payment_terms || contractData.contract_payment_terms || contractData?.metadata?.payment_terms },
    { key: 'technical_notes', label: 'Notas Técnicas', value: contractData.technical_notes || contractData?.metadata?.technical_notes },
    { key: 'special_conditions', label: 'Condições Especiais', value: contractData.special_conditions || contractData?.metadata?.special_conditions },
    { key: 'warranty_terms', label: 'Termos de Garantia', value: contractData.warranty_terms || contractData?.metadata?.warranty_terms }
  ];

  const parseServicesField = (servicesField: string[] | string | null): string[] => {
    if (!servicesField) {
      return [];
    }

    if (Array.isArray(servicesField)) {
      return servicesField
        .map(service => typeof service === 'string' ? service.trim() : '')
        .filter(service => service.length > 0);
    }

    if (typeof servicesField === 'string') {
      const trimmed = servicesField.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(service => typeof service === 'string' ? service.trim() : '')
            .filter(service => service.length > 0);
        }
      } catch {
        return trimmed
          .split('\n')
          .map(service => service.trim())
          .filter(service => service.length > 0);
      }
    }

    return [];
  };

  const fallbackServices = parseServicesField((contractData as unknown).services);

  return (
    <div className="space-y-6 p-6">
      <div className="bg-background rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            VISÃO GERAL
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Client Info */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-primary" />
                CLIENTE
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Empresa:</span> {client?.name || contractData.client_name || 'Não informado'}
                </div>
                <div>
                  <span className="text-muted-foreground">CNPJ:</span> {client?.cnpj || 'Não informado'}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {client?.email || 'Não informado'}
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span> {client?.phone || 'Não informado'}
                </div>
                {client?.secondary_phone && (
                  <div>
                    <span className="text-muted-foreground">Telefone 2:</span> {client.secondary_phone}
                  </div>
                )}
                {client?.contact_person && (
                  <div>
                    <span className="text-muted-foreground">Pessoa de Contato:</span> {client.contact_person}
                  </div>
                )}
                {client?.website && (
                  <div>
                    <span className="text-muted-foreground">Website:</span> 
                    <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="text-primary hover:underline ml-1">
                      {client.website}
                    </a>
                  </div>
                )}
                {client?.emergency_contact && (
                  <div>
                    <span className="text-muted-foreground">Emergência:</span> {client.emergency_contact}
                  </div>
                )}
                {client?.address && (
                  <div>
                    <span className="text-muted-foreground">Endereço:</span> {client.address}
                  </div>
                )}
                {client?.notes && (
                  <div className="mt-3 pt-2 border-t border-muted">
                    <span className="text-muted-foreground">Observações:</span>
                    <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract Info */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                CONTRATO
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span> {contractData.contract_number}
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span> {getTypeBadge(contractData.contract_type)}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span> {getStatusBadge(contractData.status)}
                </div>
                <div>
                  <span className="text-muted-foreground">Vigência:</span> {formatDate(contractData.start_date)} a {formatDate(contractData.end_date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span> {formatCurrency(monthlyValue)}/mês
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Equipment Info */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Wrench className="h-4 w-4 mr-2 text-primary" />
                EQUIPAMENTOS ({equipment.length})
              </h4>
              {equipment.length > 0 ? (
                <div className="space-y-4">
                  {equipment.map((item: any, index: number) => (
                    <div key={item.id || index} className="space-y-2 text-sm border-l-2 border-primary/20 pl-3">
                      <div className="font-medium text-primary">
                        Equipamento {index + 1}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo:</span> {item.type || contractData.equipment_type || 'Não informado'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modelo:</span> {item.model || contractData.equipment_model || 'Não informado'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Localização:</span> {item.location || contractData.equipment_location || 'Não informado'}
                      </div>
                      {(() => {
                        const manufacturer = item.manufacturer || fallbackEquipmentDetails.brand;
                        return manufacturer ? (
                          <div>
                            <span className="text-muted-foreground">Marca/Fabricante:</span> {manufacturer}
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <span className="text-muted-foreground">Nº Série:</span> {item.serial_number || fallbackEquipmentDetails.serial || 'Não informado'}
                      </div>
                      {item.quantity && (
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span> {item.quantity}
                        </div>
                      )}
                      {item.installation_date && (
                        <div>
                          <span className="text-muted-foreground">Data de Instalação:</span> {formatDate(item.installation_date)}
                        </div>
                      )}
                      {item.observations && (
                        <div>
                          <span className="text-muted-foreground">Observações:</span>
                          <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">{item.observations}</p>
                        </div>
                      )}
                      {(() => {
                        const power = (item.power as string | undefined) || fallbackEquipmentDetails.power;
                        return power ? (
                          <div>
                            <span className="text-muted-foreground">Potência:</span> {power}
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const voltage = (item.voltage as string | undefined) || fallbackEquipmentDetails.voltage;
                        return voltage ? (
                          <div>
                            <span className="text-muted-foreground">Tensão:</span> {voltage}
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const condition = (item.condition as string | undefined) || fallbackEquipmentDetails.condition;
                        return condition ? (
                          <div>
                            <span className="text-muted-foreground">Condição:</span> {condition}
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const year = (item.year as string | undefined) || fallbackEquipmentDetails.year;
                        return year ? (
                          <div>
                            <span className="text-muted-foreground">Ano:</span> {year}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Equipamento:</span> {contractData.equipment_type || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modelo:</span> {contractData.equipment_model || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localização:</span> {contractData.equipment_location || 'Local a definir'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marca/Fabricante:</span> {fallbackEquipmentDetails.brand || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nº Série:</span> {fallbackEquipmentDetails.serial || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Potência:</span> {fallbackEquipmentDetails.power || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tensão:</span> {fallbackEquipmentDetails.voltage || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ano:</span> {fallbackEquipmentDetails.year || 'Não informado'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condição:</span> {fallbackEquipmentDetails.condition || 'Não informado'}
                  </div>
                </div>
              )}
            </div>

            {/* Operational Status */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                {getOperationalStatusIcon(maintenances)}
                <span className="ml-2">STATUS OPERACIONAL</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">OSs Geradas:</span> {maintenances.length}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span> {getOperationalStatusText(maintenances)}
                </div>
                {maintenances.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Próxima Manutenção:</span> {
                      maintenances
                        .filter((m: unknown) => m.status === 'scheduled' && new Date(m.scheduled_date) > new Date())
                        .sort((a: any, b: unknown) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0]
                        ? formatDate(maintenances
                            .filter((m: unknown) => m.status === 'scheduled' && new Date(m.scheduled_date) > new Date())
                            .sort((a: any, b: unknown) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0]
                            .scheduled_date)
                        : 'Não agendada'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mt-6">
            <h4 className="font-medium mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary" />
              SERVIÇOS
            </h4>
            {services.length > 0 ? (
              <ul className="text-sm space-y-1">
                {services.map((service: any, index: number) => (
                  <li key={service.id || index} className="flex items-center">
                    <span className="mr-2">•</span>
                    {service.service_name}
                    {service.frequency && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {service.frequency}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : fallbackServices.length > 0 ? (
              <ul className="text-sm space-y-1">
                {fallbackServices.map((service, index) => (
                  <li key={`${service}-${index}`} className="flex items-center">
                    <span className="mr-2">•</span>
                    {service}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum serviço configurado</p>
            )}
          </div>

          {/* Commercial Information */}
          <div className="mt-6">
            <h4 className="font-medium mb-3 flex items-center">
              <ScrollText className="h-4 w-4 mr-2 text-primary" />
              INFORMAÇÕES COMERCIAIS
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {commercialInfo.map((field) => {
                const displayValue = field.value && field.value.trim().length > 0
                  ? field.value
                  : 'Não informado';

                return (
                  <div key={field.key} className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </p>
                    <p className={`text-sm mt-2 whitespace-pre-wrap ${displayValue === 'Não informado' ? 'text-muted-foreground italic' : ''}`}>
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          {contractData.description && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">DESCRIÇÃO</h4>
              <p className="text-sm text-muted-foreground">{contractData.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
