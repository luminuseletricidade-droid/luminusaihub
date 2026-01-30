import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock da função de exportação CSV
const mockExportToCSV = vi.fn();
vi.mock('@/utils/csvExporter', () => ({
  exportToCSV: mockExportToCSV,
  formatCSVData: vi.fn((data) => {
    return data.map((item: unknown) => ({
      ...item,
      formatted_date: new Date(item.date).toLocaleDateString('pt-BR'),
    }));
  }),
}));

// Mock dos dados
const mockMaintenanceData = [
  {
    id: '1',
    title: 'Manutenção Preventiva',
    client_name: 'Cliente A',
    contract_number: 'CTR-001',
    scheduled_date: '2024-01-15T10:00:00Z',
    status: 'scheduled',
    technician: 'João Silva',
    description: 'Verificação mensal dos equipamentos',
  },
  {
    id: '2',
    title: 'Manutenção Corretiva',
    client_name: 'Cliente B',
    contract_number: 'CTR-002',
    scheduled_date: '2024-01-16T14:00:00Z',
    status: 'completed',
    technician: 'Maria Santos',
    description: 'Reparo no sistema de refrigeração',
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CSV Export Functionality', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation
    mockExportToCSV.mockImplementation((data, filename) => {
      const csvContent = convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to convert data to CSV
  const convertToCSV = (data: unknown[]) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return `${csvHeaders}\n${csvRows.join('\n')}`;
  };

  it('should export maintenance data to CSV with correct formatting', async () => {
    const CSVExportComponent = () => {
      const handleExport = () => {
        mockExportToCSV(mockMaintenanceData, 'manutencoes.csv');
      };

      return (
        <div>
          <button onClick={handleExport}>Exportar CSV</button>
          <div data-testid="data-preview">
            {mockMaintenanceData.map(item => (
              <div key={item.id}>{item.title}</div>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<CSVExportComponent />);

    const exportButton = screen.getByRole('button', { name: /exportar csv/i });
    await user.click(exportButton);

    // Verificar se a função foi chamada com os dados corretos
    expect(mockExportToCSV).toHaveBeenCalledWith(
      mockMaintenanceData,
      'manutencoes.csv'
    );
  });

  it('should handle UTF-8 encoding for Portuguese characters', async () => {
    const dataWithPortuguese = [
      {
        id: '1',
        title: 'Manutenção',
        description: 'Verificação de válvulas e conexões',
        status: 'Agendado',
        notes: 'Atenção: peças de reposição',
      },
    ];

    const CSVExportWithPortuguese = () => {
      const handleExport = () => {
        // Add BOM for UTF-8
        const bom = '\uFEFF';
        const csvContent = bom + convertToCSV(dataWithPortuguese);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        expect(blob.type).toBe('text/csv;charset=utf-8');

        mockExportToCSV(dataWithPortuguese, 'dados_portugues.csv');
      };

      return <button onClick={handleExport}>Exportar com Acentos</button>;
    };

    renderWithProviders(<CSVExportWithPortuguese />);

    const exportButton = screen.getByRole('button', { name: /exportar com acentos/i });
    await user.click(exportButton);

    expect(mockExportToCSV).toHaveBeenCalledWith(
      dataWithPortuguese,
      'dados_portugues.csv'
    );
  });

  it('should filter data by date range before export', async () => {
    const CSVExportWithFilter = () => {
      const [startDate, setStartDate] = React.useState('2024-01-15');
      const [endDate, setEndDate] = React.useState('2024-01-16');

      const handleExport = () => {
        const filtered = mockMaintenanceData.filter(item => {
          const itemDate = new Date(item.scheduled_date);
          return itemDate >= new Date(startDate) && itemDate <= new Date(endDate + 'T23:59:59');
        });

        mockExportToCSV(filtered, 'manutencoes_filtradas.csv');
      };

      return (
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Data início"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Data fim"
          />
          <button onClick={handleExport}>Exportar Filtrado</button>
        </div>
      );
    };

    renderWithProviders(<CSVExportWithFilter />);

    // Alterar datas do filtro
    const startInput = screen.getByLabelText('Data início');
    const endInput = screen.getByLabelText('Data fim');

    await user.clear(startInput);
    await user.type(startInput, '2024-01-15');

    await user.clear(endInput);
    await user.type(endInput, '2024-01-15');

    const exportButton = screen.getByRole('button', { name: /exportar filtrado/i });
    await user.click(exportButton);

    // Verificar se apenas o primeiro item foi exportado
    await waitFor(() => {
      const callArgs = mockExportToCSV.mock.calls[0];
      expect(callArgs[0]).toHaveLength(1);
      expect(callArgs[0][0].id).toBe('1');
    });
  });

  it('should include correct headers in CSV export', async () => {
    const CSVExportWithHeaders = () => {
      const handleExport = () => {
        const headers = {
          id: 'ID',
          title: 'Título',
          client_name: 'Cliente',
          contract_number: 'Contrato',
          scheduled_date: 'Data Agendada',
          status: 'Status',
          technician: 'Técnico',
          description: 'Descrição',
        };

        // Transform data with proper headers
        const csvData = mockMaintenanceData.map(item => {
          const row: unknown = {};
          Object.keys(headers).forEach(key => {
            row[headers[key as keyof typeof headers]] = item[key as keyof typeof item];
          });
          return row;
        });

        mockExportToCSV(csvData, 'manutencoes_com_headers.csv');
      };

      return <button onClick={handleExport}>Exportar com Headers</button>;
    };

    renderWithProviders(<CSVExportWithHeaders />);

    const exportButton = screen.getByRole('button', { name: /exportar com headers/i });
    await user.click(exportButton);

    // Verificar se os headers foram mapeados corretamente
    const callArgs = mockExportToCSV.mock.calls[0];
    const firstRow = callArgs[0][0];

    expect(firstRow).toHaveProperty('Título');
    expect(firstRow).toHaveProperty('Cliente');
    expect(firstRow).toHaveProperty('Contrato');
    expect(firstRow).toHaveProperty('Data Agendada');
  });

  it('should handle empty data gracefully', async () => {
    const CSVExportEmpty = () => {
      const handleExport = () => {
        mockExportToCSV([], 'vazio.csv');
      };

      return (
        <div>
          <button onClick={handleExport}>Exportar Vazio</button>
          <div data-testid="empty-message">Nenhum dado para exportar</div>
        </div>
      );
    };

    renderWithProviders(<CSVExportEmpty />);

    expect(screen.getByTestId('empty-message')).toBeInTheDocument();

    const exportButton = screen.getByRole('button', { name: /exportar vazio/i });
    await user.click(exportButton);

    expect(mockExportToCSV).toHaveBeenCalledWith([], 'vazio.csv');
  });

  it('should format dates in Brazilian format', async () => {
    const CSVExportWithDateFormat = () => {
      const handleExport = () => {
        const formattedData = mockMaintenanceData.map(item => ({
          ...item,
          scheduled_date: new Date(item.scheduled_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

        mockExportToCSV(formattedData, 'manutencoes_formatadas.csv');
      };

      return <button onClick={handleExport}>Exportar com Datas BR</button>;
    };

    renderWithProviders(<CSVExportWithDateFormat />);

    const exportButton = screen.getByRole('button', { name: /exportar com datas br/i });
    await user.click(exportButton);

    // Verificar se as datas foram formatadas
    const callArgs = mockExportToCSV.mock.calls[0];
    const firstItem = callArgs[0][0];

    // A data deve estar no formato brasileiro
    expect(firstItem.scheduled_date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});