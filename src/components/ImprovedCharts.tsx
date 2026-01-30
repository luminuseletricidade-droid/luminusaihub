import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LabelList
} from 'recharts';

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: unknown[];
}

interface ImprovedChartsProps {
  chart: ChartData;
  height?: number;
  showValues?: boolean;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500  
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

const CustomTooltip = ({ active, payload, label }: unknown) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' 
              ? entry.value.toLocaleString('pt-BR')
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const renderCustomLabel = (props: unknown) => {
  const { x, y, width, height, value } = props;
  const radius = 10;

  return (
    <g>
      <text 
        x={x + width / 2} 
        y={y - radius} 
        fill="#666" 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="text-xs font-medium"
      >
        {value}
      </text>
    </g>
  );
};

const RADIAN = Math.PI / 180;
const renderCustomizedPieLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value
}: unknown) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percentage is > 5%
  if (percent < 0.05) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-semibold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ImprovedCharts: React.FC<ImprovedChartsProps> = ({ 
  chart, 
  height = 300,
  showValues = true 
}) => {
  // Ensure data exists and has proper format
  if (!chart.data || chart.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Sem dados disponíveis</p>
          <p className="text-xs text-gray-400">Os dados serão exibidos quando disponíveis</p>
        </div>
      </div>
    );
  }

  switch (chart.type) {
    case 'bar':
      // Determine the correct data key
      const barDataKey = chart.data[0]?.count !== undefined ? 'count' : 
                        chart.data[0]?.value !== undefined ? 'value' : 
                        'count';
      
      // Determine the correct axis key
      const barAxisKey = chart.data[0]?.type ? 'type' : 
                        chart.data[0]?.status ? 'status' : 
                        chart.data[0]?.metric ? 'metric' : 
                        chart.data[0]?.age ? 'age' :
                        chart.data[0]?.period ? 'period' :
                        chart.data[0]?.client ? 'client' : 
                        'name';

      // Filter out data with 0 or null values for cleaner display
      const filteredBarData = chart.data.filter(item => {
        const value = item[barDataKey];
        return value !== null && value !== undefined && value !== 0;
      });

      if (filteredBarData.length === 0) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nenhum dado para exibir</p>
          </div>
        );
      }

      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={filteredBarData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={barAxisKey}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              angle={filteredBarData.length > 4 ? -45 : 0}
              textAnchor={filteredBarData.length > 4 ? "end" : "middle"}
              height={80}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={barDataKey}
              fill={COLORS[0]}
              radius={[8, 8, 0, 0]}
            >
              {showValues && <LabelList dataKey={barDataKey} content={renderCustomLabel} />}
              {filteredBarData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      const lineDataKey = chart.data[0]?.value !== undefined ? 'value' : 'count';
      const lineAxisKey = chart.data[0]?.month ? 'month' : 
                         chart.data[0]?.period ? 'period' :
                         chart.data[0]?.date ? 'date' : 
                         'name';

      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart 
            data={chart.data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={lineAxisKey}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              angle={chart.data.length > 6 ? -45 : 0}
              textAnchor={chart.data.length > 6 ? "end" : "middle"}
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={lineDataKey}
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={{ fill: COLORS[0], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'pie':
      // Filter out zero values for pie chart
      const filteredPieData = chart.data.filter(item => 
        item.value !== null && item.value !== undefined && item.value !== 0
      );

      if (filteredPieData.length === 0) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nenhum dado para exibir</p>
          </div>
        );
      }

      // Calculate total for percentage display
      const total = filteredPieData.reduce((sum, item) => sum + (item.value || 0), 0);

      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={filteredPieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showValues ? renderCustomizedPieLabel : false}
              outerRadius={height / 3}
              fill="#8884d8"
              dataKey="value"
            >
              {filteredPieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip />}
              formatter={(value: unknown) => [
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
                ''
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: unknown) => (
                <span style={{ color: entry.color }}>
                  {value} ({((entry.payload.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Tipo de gráfico não suportado</p>
        </div>
      );
  }
};

export default ImprovedCharts;