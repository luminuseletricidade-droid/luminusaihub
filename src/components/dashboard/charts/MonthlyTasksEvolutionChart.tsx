import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MaintenanceTask } from '../types';
import { getAllTaskDates } from '../utils/statusHelper';

interface ChartProps {
    data: MaintenanceTask[];
    year: number;
    month: number; // 0-11
}

const MonthlyTasksEvolutionChart: React.FC<ChartProps> = ({ data, year, month }) => {
    // 1. Determine the number of days in the selected month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 2. Filter tasks relevant to the selected month/year
    // We consider a task relevant if it has ANY scheduled date within this month
    const relevantTasks = data.filter(task => {
        const dates = getAllTaskDates(task);
        return dates.some(d => d.getFullYear() === year && d.getMonth() === month);
    });

    // 3. Calculate "Total Tasks" (Initial Burden)
    // This is the total number of tasks that *should* be done in this month.
    const totalTasks = relevantTasks.length;

    // 4. Build the daily data for the chart
    const chartData = [];
    let completedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        // Find tasks completed on this specific day
        // We need to check which specific sub-task was completed on this day.
        // For simplicity in this view, we can count how many tasks have *any* date on this day
        // AND are marked as 'EM DIA' (assuming 'EM DIA' means completed on that date).
        // However, the data structure couples date and status.
        // A better approximation given the data:
        // Count how many dates fall on this day.

        const tasksCompletedOnDay = relevantTasks.reduce((count, task) => {
            const dates = getAllTaskDates(task);
            // Check if any of the dates match today
            const matches = dates.filter(d => d.getDate() === day && d.getMonth() === month && d.getFullYear() === year);
            return count + matches.length;
        }, 0);

        completedCount += tasksCompletedOnDay;
        const remainingTasks = Math.max(0, totalTasks - completedCount);

        // Ideal burn down: starts at totalTasks, reaches 0 at end of month
        const idealBurn = totalTasks - (totalTasks / daysInMonth) * day;

        chartData.push({
            name: day.toString(),
            "Tarefas Restantes": remainingTasks,
            "Queima Ideal": Math.round(idealBurn)
        });
    }

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-center px-4">Nenhuma tarefa agendada para o mês selecionado.</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280' }} />
                    <YAxis tick={{ fill: '#6B7280' }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderColor: '#e5e7eb'
                        }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Tarefas Restantes" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Queima Ideal" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MonthlyTasksEvolutionChart;
