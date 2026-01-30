import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { MaintenanceTask, Status } from '../types';
import { getTaskStatuses } from '../utils/statusHelper';

interface ChartProps {
    data: MaintenanceTask[];
}

const COLORS: Record<Exclude<Status, null>, string> = {
    'EM ATRASO': '#EF4444', // red-500
    'EM DIA': '#22C55E', // green-500
    'PROGRAMADO': '#3B82F6', // blue-500
    'PENDENTE': '#6B7280', // gray-500
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) {
        return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


const StatusDistributionChart: React.FC<ChartProps> = ({ data }) => {
    // Instead of getting the single overall status, we get ALL statuses from every task.
    const allIndividualStatuses = data.flatMap(getTaskStatuses);

    const statusCounts = allIndividualStatuses.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<Exclude<Status, null>, number>);

    const nameMapping: Record<string, string> = {
        'EM ATRASO': 'Atrasado',
        'EM DIA': 'Em Dia',
        'PROGRAMADO': 'Programado',
        'PENDENTE': 'Pendente'
    };

    const chartData = Object.entries(statusCounts).map(([name, value]) => ({
        name: nameMapping[name] || name,
        value,
        color: COLORS[name as keyof typeof COLORS]
    }));

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">Sem dados para exibir</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderColor: '#e5e7eb'
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StatusDistributionChart;
