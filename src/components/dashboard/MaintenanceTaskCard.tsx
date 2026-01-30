import React, { useState, useMemo } from 'react';
import type { MaintenanceTask, MaintenanceItem, Status } from './types';
import { Power, MapPin, FileText, AlertTriangle, CheckCircle, Clock, User, Hourglass, Play } from 'lucide-react';

interface MaintenanceTaskCardProps {
    task: MaintenanceTask;
    activeFilter: Status | 'ALL';
    selectedYear?: string;
    selectedMonth?: string;
}

const StatusBadge: React.FC<{ status: Status | null }> = ({ status }) => {
    if (!status) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">N/D</span>;
    }

    const statusStyles: Record<Exclude<Status, null>, string> = {
        'EM DIA': 'bg-green-100 text-green-800',
        'EM ATRASO': 'bg-red-100 text-red-700',
        'EM ANDAMENTO': 'bg-yellow-100 text-yellow-800',
        'PROGRAMADO': 'bg-blue-100 text-blue-800',
        'PENDENTE': 'bg-gray-200 text-gray-700',
    };

    const statusIcons: Record<Exclude<Status, null>, React.ReactNode> = {
        'EM DIA': <CheckCircle className="h-3 w-3" />,
        'EM ATRASO': <AlertTriangle className="h-3 w-3" />,
        'EM ANDAMENTO': <Play className="h-3 w-3" />,
        'PROGRAMADO': <Clock className="h-3 w-3" />,
        'PENDENTE': <Hourglass className="h-3 w-3" />,
    };

    const statusLabels: Record<Exclude<Status, null>, string> = {
        'EM DIA': 'Dia',
        'EM ATRASO': 'Atraso',
        'EM ANDAMENTO': 'Andamento',
        'PROGRAMADO': 'Programado',
        'PENDENTE': 'Pendente',
    };

    return (
        <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
            {statusIcons[status]}
            {statusLabels[status]}
        </span>
    );
};

// Função para obter label curto do tipo de manutenção
const getShortLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
        'Manutenção Preventiva 250h': '250H',
        'Manutenção Preventiva 500h': '500H',
        'Manutenção Mensal': 'Mensal',
        'Manutenção Mensal (complementar)': 'Mensal Compl.',
        'Manutenção Corretiva': 'Corretiva',
        'Atendimento Emergencial': 'Emergencial',
        'Teste de Carga / Operação Assistida de Partida': 'Teste Carga',
        'Startup / Comissionamento': 'Startup',
        'Avarias de Controlador': 'Controlador',
        'Visita Técnica Orçamentária': 'Visita Orçam.',
        'Visita Técnica de Inspeção': 'Visita Insp.',
        'Inspeção de Alternador': 'Megagem Alternador',
        'Limpeza de Radiador': 'Limpeza Radiador',
        'Instalação de Equipamentos': 'Instalação Equip.',
        'Instalação de GMG – Próprio (permanente)': 'Instalação GMG',
        'Limpeza de Tanque': 'Limpeza de Tanque',
        'Troca de Bateria': 'Bateria',
        'Regulagem de Válvulas': 'Regulagem Válvula',
        'Revisão/Calibração de Bomba Injetora': 'Bomba Injetora',
        'Entrega/Retirada de GMG': 'Entrega/Retirada',
    };
    return typeMap[type] || type;
};

const MaintenanceTaskCard: React.FC<MaintenanceTaskCardProps> = ({
    task,
    activeFilter,
    selectedYear = 'ALL',
    selectedMonth = 'ALL'
}) => {
    const [showBacklog, setShowBacklog] = useState(false);

    // Helper to parse date from "DD/MM/YYYY" or ISO format
    const parseDateString = (dateStr: string | null): Date | null => {
        if (!dateStr) return null;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Filter maintenances based on activeFilter AND date filters
    const filteredMaintenances = useMemo(() => {
        if (!task.maintenances) return [];

        return task.maintenances.filter(m => {
            // Status filter
            const statusMatch = activeFilter === 'ALL' || m.status === activeFilter;
            if (!statusMatch) return false;

            // Date filter - if no date filters are set, include all
            if (selectedYear === 'ALL' && selectedMonth === 'ALL') return true;

            const date = parseDateString(m.date);
            if (!date) return false;

            const yearMatch = selectedYear === 'ALL' || date.getFullYear().toString() === selectedYear;
            const monthMatch = selectedMonth === 'ALL' || date.getMonth().toString() === selectedMonth;

            return yearMatch && monthMatch;
        });
    }, [task.maintenances, activeFilter, selectedYear, selectedMonth]);

    // Calculate overall status from FILTERED maintenances (respects date filters)
    const overallStatus = useMemo((): Status => {
        if (filteredMaintenances.length === 0) return null;

        const statuses = filteredMaintenances.map(m => m.status).filter(s => s !== null);

        if (statuses.some(s => s === 'EM ATRASO')) return 'EM ATRASO';
        if (statuses.some(s => s === 'EM ANDAMENTO')) return 'EM ANDAMENTO';
        if (statuses.some(s => s === 'PROGRAMADO')) return 'PROGRAMADO';
        if (statuses.some(s => s === 'PENDENTE')) return 'PENDENTE';
        if (statuses.some(s => s === 'EM DIA')) return 'EM DIA';

        return null;
    }, [filteredMaintenances]);

    const handleAtrasoClick = () => {
        if (task.backlog) {
            setShowBacklog(prev => !prev);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 flex flex-col">
            {/* Header com fundo escuro como no modelo */}
            <div className="bg-gray-800 text-white p-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold truncate">{task.client}</h3>
                        <p className="text-xs text-gray-300 mt-0.5">{task.code}</p>
                    </div>
                    <div
                        className={`flex-shrink-0 ml-2 ${overallStatus === 'EM ATRASO' && task.backlog ? 'cursor-pointer' : ''}`}
                        onClick={overallStatus === 'EM ATRASO' ? handleAtrasoClick : undefined}
                        title={overallStatus === 'EM ATRASO' && task.backlog ? 'Clique para ver pendências' : ''}
                    >
                        {overallStatus === 'EM ATRASO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-red-600 text-white">
                                <AlertTriangle className="h-3 w-3" />
                                ATRASO
                            </span>
                        )}
                        {overallStatus === 'EM DIA' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3" />
                                EM DIA
                            </span>
                        )}
                        {overallStatus === 'EM ANDAMENTO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-yellow-500 text-white">
                                <Play className="h-3 w-3" />
                                EM ANDAMENTO
                            </span>
                        )}
                        {overallStatus === 'PROGRAMADO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white">
                                <Clock className="h-3 w-3" />
                                PROGRAMADO
                            </span>
                        )}
                        {overallStatus === 'PENDENTE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-gray-500 text-white">
                                <Hourglass className="h-3 w-3" />
                                PENDENTE
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-300">
                    <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{task.region}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Power className="h-3 w-3" />
                        <span>{task.powerKVA ? `${task.powerKVA} KVA` : 'N/D'}</span>
                    </div>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-300">
                    <User className="h-3 w-3" />
                    <span>{task.technician || 'Não atribuído'}</span>
                </div>
            </div>

            {/* Lista de manutenções */}
            <div className="p-4 flex-grow">
                {filteredMaintenances.length > 0 ? (
                    <>
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Status Detalhados</h4>
                        <div className="space-y-2">
                            {filteredMaintenances.map((item, index) => (
                                <div key={item.id || index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-600 truncate flex-1 mr-2">
                                        {getShortLabel(item.type)}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-gray-500 text-xs w-20 text-right">{item.date || '-'}</span>
                                        <div className="w-24">
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma manutenção encontrada</p>
                )}
            </div>

            {showBacklog && task.backlog && (
                <div className="bg-gray-50 p-4 border-t border-gray-200 mt-auto">
                    <div className="text-sm">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4" />
                            Pendências
                        </h4>
                        <p className="text-gray-600">{task.backlog}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceTaskCard;
