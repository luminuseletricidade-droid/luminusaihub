import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import type { MaintenanceTask } from '../types';


interface ChartProps {
    data: MaintenanceTask[];
    selectedYear?: string;
    selectedMonth?: string;
}

const TasksByRegionChart: React.FC<ChartProps> = ({ data, selectedYear = 'ALL', selectedMonth = 'ALL' }) => {
    const regionCounts = data.reduce((acc, task) => {
        const region = task.region || 'Desconhecida';
        if (!acc[region]) {
            acc[region] = { name: region, Atrasadas: 0, 'Em Dia': 0, Programadas: 0, Pendentes: 0 };
        }

        // Filtrar manutenções por data ANTES de contar os statuses
        const relevantMaintenances = (task.maintenances || []).filter(m => {
            if (!m.date) return false;
            const date = new Date(m.date);
            if (isNaN(date.getTime())) return false;
            const yearMatches = selectedYear === 'ALL' || date.getFullYear().toString() === selectedYear;
            const monthMatches = selectedMonth === 'ALL' || date.getMonth().toString() === selectedMonth;
            return yearMatches && monthMatches;
        });

        // Contar APENAS os statuses das manutenções filtradas
        relevantMaintenances.forEach(m => {
            if (m.status === 'EM ATRASO') {
                acc[region].Atrasadas++;
            } else if (m.status === 'EM DIA') {
                acc[region]['Em Dia']++;
            } else if (m.status === 'PROGRAMADO') {
                acc[region].Programadas++;
            } else if (m.status === 'PENDENTE') {
                acc[region].Pendentes++;
            }
        });

        return acc;
    }, {} as Record<string, { name: string; Atrasadas: number; 'Em Dia': number; Programadas: number; Pendentes: number; }>);

    const chartData = Object.values(regionCounts);

    const renderLabel = (props: any) => {
        const { x, y, width, height, value } = props;
        if (value > 0) {
            return (
                <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dy=".3em" fontSize={12} fontWeight="bold">
                    {value}
                </text>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280' }} />
                    <YAxis tick={{ fill: '#6B7280' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderColor: '#e5e7eb'
                        }}
                    />
                    <Legend />
                    <Bar dataKey="Atrasadas" name="Atrasadas" stackId="a" fill="#EF4444">
                        <LabelList dataKey="Atrasadas" content={renderLabel} />
                    </Bar>
                    <Bar dataKey="Pendentes" name="Pendentes" stackId="a" fill="#6B7280">
                        <LabelList dataKey="Pendentes" content={renderLabel} />
                    </Bar>
                    <Bar dataKey="Programadas" name="Programadas" stackId="a" fill="#3B82F6">
                        <LabelList dataKey="Programadas" content={renderLabel} />
                    </Bar>
                    <Bar dataKey="Em Dia" name="Em Dia" stackId="a" fill="#22C55E">
                        <LabelList dataKey="Em Dia" content={renderLabel} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TasksByRegionChart;
