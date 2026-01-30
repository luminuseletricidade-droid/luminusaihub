import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  technicianFilter: string;
  onTechnicianFilterChange: (value: string) => void;
  dateRange: { from?: Date; to?: Date } | undefined;
  onDateRangeChange: (range: { from?: Date; to?: Date } | undefined) => void;
  contractFilter: string;
  onContractFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function MaintenanceFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  technicianFilter,
  onTechnicianFilterChange,
  dateRange,
  onDateRangeChange,
  contractFilter,
  onContractFilterChange,
  onClearFilters
}: MaintenanceFiltersProps) {
  const hasActiveFilters = statusFilter || typeFilter || priorityFilter || technicianFilter || dateRange || contractFilter;

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': '#3b82f6',
      'in_progress': '#f59e0b', 
      'completed': '#10b981',
      'cancelled': '#6b7280',
      'overdue': '#dc2626'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Manutenção Preventiva 250h': '#10b981',
      'Manutenção Preventiva 500h': '#059669',
      'Manutenção Mensal': '#14b8a6',
      'Manutenção Corretiva': '#f59e0b',
      'Atendimento Emergencial': '#ef4444',
      'Teste de Carga / Operação Assistida de Partida': '#8b5cf6',
      'Startup / Comissionamento': '#6366f1',
      'Avarias de Controlador': '#dc2626',
      'Visita Técnica Orçamentária': '#0ea5e9',
      'Visita Técnica de Inspeção': '#06b6d4',
      'Inspeção de Alternador': '#3b82f6',
      'Limpeza de Radiador': '#22c55e',
      'Instalação de Equipamentos': '#a855f7',
      'Instalação de GMG – Próprio (permanente)': '#7c3aed',
      'Limpeza de Tanque': '#84cc16',
      'Troca de Bateria': '#eab308',
      'Manutenção Mensal (complementar)': '#0d9488',
      'Regulagem de Válvulas': '#f97316',
      'Revisão/Calibração de Bomba Injetora': '#ec4899',
      'Entrega/Retirada de GMG': '#64748b'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Busca Principal */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar manutenções... (cliente, técnico, descrição)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros em Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Status */}
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="scheduled">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor('scheduled') }}
                    />
                    Agendado
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor('in_progress') }}
                    />
                    Em Andamento
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor('completed') }}
                    />
                    Concluído
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor('cancelled') }}
                    />
                    Cancelado
                  </div>
                </SelectItem>
                <SelectItem value="overdue">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor('overdue') }}
                    />
                    Atrasado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Tipo */}
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="Manutenção Preventiva 250h">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Manutenção Preventiva 250h') }} />
                    Manutenção Preventiva 250h
                  </div>
                </SelectItem>
                <SelectItem value="Manutenção Preventiva 500h">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Manutenção Preventiva 500h') }} />
                    Manutenção Preventiva 500h
                  </div>
                </SelectItem>
                <SelectItem value="Manutenção Mensal">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Manutenção Mensal') }} />
                    Manutenção Mensal
                  </div>
                </SelectItem>
                <SelectItem value="Manutenção Corretiva">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Manutenção Corretiva') }} />
                    Manutenção Corretiva
                  </div>
                </SelectItem>
                <SelectItem value="Atendimento Emergencial">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Atendimento Emergencial') }} />
                    Atendimento Emergencial
                  </div>
                </SelectItem>
                <SelectItem value="Teste de Carga / Operação Assistida de Partida">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Teste de Carga / Operação Assistida de Partida') }} />
                    Teste de Carga / Operação Assistida
                  </div>
                </SelectItem>
                <SelectItem value="Startup / Comissionamento">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Startup / Comissionamento') }} />
                    Startup / Comissionamento
                  </div>
                </SelectItem>
                <SelectItem value="Avarias de Controlador">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Avarias de Controlador') }} />
                    Avarias de Controlador
                  </div>
                </SelectItem>
                <SelectItem value="Visita Técnica Orçamentária">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Visita Técnica Orçamentária') }} />
                    Visita Técnica Orçamentária
                  </div>
                </SelectItem>
                <SelectItem value="Visita Técnica de Inspeção">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Visita Técnica de Inspeção') }} />
                    Visita Técnica de Inspeção
                  </div>
                </SelectItem>
                <SelectItem value="Inspeção de Alternador">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Inspeção de Alternador') }} />
                    Inspeção de Alternador
                  </div>
                </SelectItem>
                <SelectItem value="Limpeza de Radiador">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Limpeza de Radiador') }} />
                    Limpeza de Radiador
                  </div>
                </SelectItem>
                <SelectItem value="Instalação de Equipamentos">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Instalação de Equipamentos') }} />
                    Instalação de Equipamentos
                  </div>
                </SelectItem>
                <SelectItem value="Instalação de GMG – Próprio (permanente)">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Instalação de GMG – Próprio (permanente)') }} />
                    Instalação de GMG – Próprio
                  </div>
                </SelectItem>
                <SelectItem value="Limpeza de Tanque">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Limpeza de Tanque') }} />
                    Limpeza de Tanque
                  </div>
                </SelectItem>
                <SelectItem value="Troca de Bateria">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Troca de Bateria') }} />
                    Troca de Bateria
                  </div>
                </SelectItem>
                <SelectItem value="Manutenção Mensal (complementar)">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Manutenção Mensal (complementar)') }} />
                    Manutenção Mensal (complementar)
                  </div>
                </SelectItem>
                <SelectItem value="Regulagem de Válvulas">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Regulagem de Válvulas') }} />
                    Regulagem de Válvulas
                  </div>
                </SelectItem>
                <SelectItem value="Revisão/Calibração de Bomba Injetora">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Revisão/Calibração de Bomba Injetora') }} />
                    Revisão/Calibração de Bomba Injetora
                  </div>
                </SelectItem>
                <SelectItem value="Entrega/Retirada de GMG">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor('Entrega/Retirada de GMG') }} />
                    Entrega/Retirada de GMG
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Prioridade */}
            <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>

            {/* Técnico */}
            <Input
              placeholder="Técnico"
              value={technicianFilter}
              onChange={(e) => onTechnicianFilterChange(e.target.value)}
            />

            {/* Contrato */}
            <Input
              placeholder="Contrato"
              value={contractFilter}
              onChange={(e) => onContractFilterChange(e.target.value)}
            />

            {/* Range de Data */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange as unknown}
                  onSelect={(range) => onDateRangeChange(range as { from?: Date; to?: Date } | undefined)}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtros Ativos e Limpar */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                {statusFilter && statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onStatusFilterChange('all')} />
                  </Badge>
                )}
                {typeFilter && typeFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Tipo: {typeFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onTypeFilterChange('all')} />
                  </Badge>
                )}
                {priorityFilter && priorityFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Prioridade: {priorityFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onPriorityFilterChange('all')} />
                  </Badge>
                )}
                {technicianFilter && (
                  <Badge variant="secondary" className="gap-1">
                    Técnico: {technicianFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onTechnicianFilterChange('')} />
                  </Badge>
                )}
                {contractFilter && (
                  <Badge variant="secondary" className="gap-1">
                    Contrato: {contractFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onContractFilterChange('')} />
                  </Badge>
                )}
                {dateRange && (
                  <Badge variant="secondary" className="gap-1">
                    Período
                    <X className="h-3 w-3 cursor-pointer" onClick={() => onDateRangeChange(undefined)} />
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}