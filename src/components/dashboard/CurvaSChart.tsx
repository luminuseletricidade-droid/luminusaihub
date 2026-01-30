import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import type { CurvaSDataPoint } from './types';
import { calculateCurvaSDeviation } from './utils/statusHelper';
import { cn } from '@/lib/utils';

interface CurvaSChartProps {
  data: CurvaSDataPoint[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    payload: CurvaSDataPoint;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const deviation = calculateCurvaSDeviation(data.planejadoPercent, data.realPercent);
  const deviationClass = {
    ahead: 'text-green-600 dark:text-green-400',
    on_track: 'text-blue-600 dark:text-blue-400',
    behind: 'text-red-600 dark:text-red-400'
  }[deviation.status];

  const deviationLabel = {
    ahead: 'Adiantado',
    on_track: 'No prazo',
    behind: 'Atrasado'
  }[deviation.status];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">
        Semana {data.semana}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {data.dataInicio} - {data.dataFim}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Planejado
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.planejadoPercent.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Real
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.realPercent.toFixed(1)}%
          </span>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Desvio</span>
            <span className={cn("text-sm font-bold", deviationClass)}>
              {deviation.value >= 0 ? '+' : ''}{deviation.value.toFixed(1)}% ({deviationLabel})
            </span>
          </div>
        </div>

        <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Acum. Planejado:</span>
            <span>{data.planejadoAcumulado}</span>
          </div>
          <div className="flex justify-between">
            <span>Acum. Real:</span>
            <span>{data.realAcumulado}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CurvaSChart: React.FC<CurvaSChartProps> = ({ data, className }) => {
  // Calculate current week for reference line
  const today = new Date();
  const currentWeekData = data.find(d => {
    const startDate = new Date(d.dataInicio.split('/').reverse().join('-'));
    const endDate = new Date(d.dataFim.split('/').reverse().join('-'));
    return today >= startDate && today <= endDate;
  });

  const currentWeek = currentWeekData?.semana || null;

  // Calculate overall deviation
  const latestData = data[data.length - 1];
  const overallDeviation = latestData
    ? calculateCurvaSDeviation(latestData.planejadoPercent, latestData.realPercent)
    : null;

  return (
    <div className={cn("w-full", className)}>
      {/* Summary Header */}
      {overallDeviation && (
        <div className="mb-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Planejado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Real</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-red-400 dark:bg-red-500"></span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Zona de Atraso</span>
            </div>
          </div>

          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold",
            overallDeviation.status === 'ahead' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            overallDeviation.status === 'on_track' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            overallDeviation.status === 'behind' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          )}>
            Desvio: {overallDeviation.value >= 0 ? '+' : ''}{overallDeviation.value.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <defs>
            {/* Gradient for delay zone */}
            <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>

            {/* Gradient for planned line */}
            <linearGradient id="plannedGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
            </linearGradient>

            {/* Gradient for actual line */}
            <linearGradient id="actualGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={1} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />

          <XAxis
            dataKey="semana"
            tickFormatter={(value) => `S${value}`}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            axisLine={{ stroke: '#d1d5db' }}
            className="dark:fill-gray-400"
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
            axisLine={{ stroke: '#d1d5db' }}
            className="dark:fill-gray-400"
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Current week reference line */}
          {currentWeek && (
            <ReferenceLine
              x={currentWeek}
              stroke="#9333ea"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Hoje',
                position: 'top',
                fill: '#9333ea',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
          )}

          {/* Target 100% reference line */}
          <ReferenceLine
            y={100}
            stroke="#10b981"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{
              value: '100%',
              position: 'right',
              fill: '#10b981',
              fontSize: 10
            }}
          />

          {/* Area showing delay zone (when actual < planned) */}
          <Area
            type="monotone"
            dataKey={(d: CurvaSDataPoint) => {
              // Show filled area when actual is behind planned
              if (d.realPercent < d.planejadoPercent) {
                return d.planejadoPercent;
              }
              return null;
            }}
            stroke="none"
            fill="url(#delayGradient)"
            fillOpacity={1}
            name="Zona de Atraso"
            isAnimationActive={false}
          />

          {/* Planned Line (S-curve) */}
          <Line
            type="monotone"
            dataKey="planejadoPercent"
            name="Planejado"
            stroke="url(#plannedGradient)"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
          />

          {/* Actual Line */}
          <Line
            type="monotone"
            dataKey="realPercent"
            name="Real"
            stroke="url(#actualGradient)"
            strokeWidth={3}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            activeDot={{ fill: '#22c55e', strokeWidth: 2, r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend with additional info */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Planejado</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {latestData?.planejadoAcumulado || 0}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Realizado</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {latestData?.realAcumulado || 0}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">% Planejado</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {latestData?.planejadoPercent.toFixed(1) || 0}%
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400">% Realizado</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {latestData?.realPercent.toFixed(1) || 0}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurvaSChart;
