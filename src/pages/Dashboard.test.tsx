import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { Dashboard } from '@/pages/Dashboard';

vi.mock('@/hooks/useContracts', () => ({
  useContracts: () => ({
    contracts: [
      {
        id: '1',
        contract_number: 'CNT-001',
        client_name: 'Test Company',
        status: 'active',
        monthly_value: 5000,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      },
      {
        id: '2',
        contract_number: 'CNT-002',
        client_name: 'Another Company',
        status: 'active',
        monthly_value: 3000,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useMaintenances', () => ({
  useMaintenances: () => ({
    maintenances: [
      {
        id: '1',
        contract_id: '1',
        scheduled_date: new Date().toISOString(),
        status: 'pending',
        type: 'preventive',
      },
      {
        id: '2',
        contract_id: '2',
        scheduled_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
        type: 'corrective',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard components', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays contract statistics', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/contratos ativos/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('displays revenue information', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/receita mensal/i)).toBeInTheDocument();
      expect(screen.getByText(/8\.000/)).toBeInTheDocument();
    });
  });

  it('displays upcoming maintenances', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/manutenções pendentes/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    vi.unmock('@/hooks/useContracts');
    vi.mock('@/hooks/useContracts', () => ({
      useContracts: () => ({
        contracts: [],
        isLoading: true,
        error: null,
      }),
    }));

    render(<Dashboard />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('handles error state', () => {
    vi.unmock('@/hooks/useContracts');
    vi.mock('@/hooks/useContracts', () => ({
      useContracts: () => ({
        contracts: [],
        isLoading: false,
        error: new Error('Failed to load contracts'),
      }),
    }));

    render(<Dashboard />);

    expect(screen.getByText(/erro ao carregar dados/i)).toBeInTheDocument();
  });

  it('displays charts when data is available', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-chart')).toBeInTheDocument();
      expect(screen.getByTestId('maintenance-chart')).toBeInTheDocument();
    });
  });

  it('displays recent activities', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/atividades recentes/i)).toBeInTheDocument();
    });
  });

  it('shows quick actions buttons', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo contrato/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /agendar manutenção/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gerar relatório/i })).toBeInTheDocument();
    });
  });

  it('filters data by date range', async () => {
    render(<Dashboard />);

    const dateRangeButton = await screen.findByRole('button', { name: /últimos 30 dias/i });
    expect(dateRangeButton).toBeInTheDocument();
  });
});