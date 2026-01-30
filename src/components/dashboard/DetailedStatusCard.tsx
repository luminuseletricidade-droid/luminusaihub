import React from 'react';
import { AlertTriangle, CheckCircle, Calendar, Hourglass, Play } from 'lucide-react';

interface DetailedStatusCardProps {
    title: string;
    description?: string;
    late: number;
    onSchedule: number;
    inProgress: number;
    planned: number;
    pending: number;
}

const DetailedStatusCard: React.FC<DetailedStatusCardProps> = ({ title, description, late, onSchedule, inProgress, planned, pending }) => {
    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-1 text-sm truncate" title={title}>{title}</h3>
            {description && (
                <p className="text-xs text-gray-500 mb-3 truncate" title={description}>{description}</p>
            )}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Atrasadas
                    </span>
                    <span className="font-bold text-gray-800 bg-red-100 px-2 py-0.5 rounded-full">{late}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Em Dia
                    </span>
                    <span className="font-bold text-gray-800 bg-green-100 px-2 py-0.5 rounded-full">{onSchedule}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <Play className="h-4 w-4 text-yellow-500" />
                        Em Andamento
                    </span>
                    <span className="font-bold text-gray-800 bg-yellow-100 px-2 py-0.5 rounded-full">{inProgress}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Programadas
                    </span>
                    <span className="font-bold text-gray-800 bg-blue-100 px-2 py-0.5 rounded-full">{planned}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                        <Hourglass className="h-4 w-4 text-gray-500" />
                        Pendentes
                    </span>
                    <span className="font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-full">{pending}</span>
                </div>
            </div>
        </div>
    );
};

export default DetailedStatusCard;
