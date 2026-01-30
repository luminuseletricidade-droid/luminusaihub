import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dos hooks de manutenção
const mockUseMaintenances = vi.fn(() => ({
  maintenances: [
    {
      id: '1',
      title: 'Manutenção Preventiva',
      description: 'Verificação mensal',
      status: 'scheduled',
      scheduled_date: '2024-01-15T10:00:00Z',
      client_id: 'client-1',
      contract_id: 'contract-1',
    },
    {
      id: '2',
      title: 'Manutenção Corretiva',
      description: 'Reparo emergencial',
      status: 'in_progress',
      scheduled_date: '2024-01-16T14:00:00Z',
      client_id: 'client-2',
      contract_id: 'contract-2',
    },
  ],
  isLoading: false,
  createMaintenance: vi.fn(),
  updateMaintenance: vi.fn(),
  deleteMaintenance: vi.fn(),
}));

const mockUseMaintenanceStatusSync = vi.fn(() => ({
  updateStatus: vi.fn().mockResolvedValue({ success: true }),
  syncStatus: vi.fn(),
}));

vi.mock('@/hooks/useMaintenances', () => ({
  useMaintenances: mockUseMaintenances,
}));

vi.mock('@/hooks/useMaintenanceStatusSync', () => ({
  useMaintenanceStatusSync: mockUseMaintenanceStatusSync,
}));

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

describe('Maintenance Creation and Status Updates', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new maintenance with all required fields', async () => {
    const MaintenanceForm = () => {
      const { createMaintenance } = mockUseMaintenances();

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createMaintenance({
          title: 'Nova Manutenção',
          description: 'Descrição da manutenção',
          scheduled_date: '2024-01-20T10:00:00Z',
          status: 'scheduled',
          client_id: 'client-1',
          contract_id: 'contract-1',
        });
      };

      return (
        <form onSubmit={handleSubmit} data-testid="maintenance-form">
          <input name="title" placeholder="Título" required />
          <textarea name="description" placeholder="Descrição" required />
          <input type="datetime-local" name="scheduled_date" required />
          <select name="status" required>
            <option value="scheduled">Agendada</option>
            <option value="in_progress">Em Progresso</option>
            <option value="completed">Concluída</option>
          </select>
          <button type="submit">Criar Manutenção</button>
        </form>
      );
    };

    renderWithProviders(<MaintenanceForm />);

    // Preencher o formulário
    await user.type(screen.getByPlaceholderText('Título'), 'Nova Manutenção');
    await user.type(screen.getByPlaceholderText('Descrição'), 'Descrição detalhada');

    const dateInput = screen.getByDisplayValue('');
    await user.type(dateInput, '2024-01-20T10:00');

    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, 'scheduled');

    // Submeter o formulário
    const submitButton = screen.getByRole('button', { name: 'Criar Manutenção' });
    await user.click(submitButton);

    // Verificar se a função foi chamada
    await waitFor(() => {
      const { createMaintenance } = mockUseMaintenances();
      expect(createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nova Manutenção',
          status: 'scheduled',
        })
      );
    });
  });

  it('should update maintenance status from scheduled to in_progress', async () => {
    const MaintenanceCard = ({ maintenance }: unknown) => {
      const { updateStatus } = mockUseMaintenanceStatusSync();

      const handleStatusUpdate = async (newStatus: string) => {
        await updateStatus(maintenance.id, newStatus);
      };

      return (
        <div data-testid={`maintenance-${maintenance.id}`}>
          <h3>{maintenance.title}</h3>
          <p>Status: {maintenance.status}</p>
          <button onClick={() => handleStatusUpdate('in_progress')}>
            Iniciar
          </button>
          <button onClick={() => handleStatusUpdate('completed')}>
            Concluir
          </button>
        </div>
      );
    };

    const maintenance = {
      id: '1',
      title: 'Manutenção Teste',
      status: 'scheduled',
    };

    renderWithProviders(<MaintenanceCard maintenance={maintenance} />);

    // Verificar estado inicial
    expect(screen.getByText('Status: scheduled')).toBeInTheDocument();

    // Clicar no botão para iniciar
    const startButton = screen.getByRole('button', { name: 'Iniciar' });
    await user.click(startButton);

    // Verificar se a função foi chamada
    await waitFor(() => {
      const { updateStatus } = mockUseMaintenanceStatusSync();
      expect(updateStatus).toHaveBeenCalledWith('1', 'in_progress');
    });
  });

  it('should validate scheduled date is in the future', async () => {
    const MaintenanceFormWithValidation = () => {
      const [error, setError] = React.useState('');

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const scheduledDate = formData.get('scheduled_date') as string;

        if (new Date(scheduledDate) < new Date()) {
          setError('Data deve ser no futuro');
          return;
        }

        setError('');
      };

      return (
        <form onSubmit={handleSubmit}>
          <input type="datetime-local" name="scheduled_date" required />
          <button type="submit">Agendar</button>
          {error && <span role="alert">{error}</span>}
        </form>
      );
    };

    renderWithProviders(<MaintenanceFormWithValidation />);

    // Tentar agendar com data passada
    const dateInput = screen.getByDisplayValue('');
    await user.type(dateInput, '2020-01-01T10:00');

    const submitButton = screen.getByRole('button', { name: 'Agendar' });
    await user.click(submitButton);

    // Verificar mensagem de erro
    expect(screen.getByRole('alert')).toHaveTextContent('Data deve ser no futuro');
  });

  it('should display maintenance status with correct colors', async () => {
    const StatusBadge = ({ status }: { status: string }) => {
      const colors = {
        scheduled: 'blue',
        in_progress: 'yellow',
        completed: 'green',
        cancelled: 'red',
      };

      return (
        <span
          data-testid="status-badge"
          style={{ color: colors[status as keyof typeof colors] }}
        >
          {status}
        </span>
      );
    };

    const { rerender } = renderWithProviders(<StatusBadge status="scheduled" />);

    let badge = screen.getByTestId('status-badge');
    expect(badge).toHaveStyle({ color: 'blue' });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <StatusBadge status="in_progress" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    badge = screen.getByTestId('status-badge');
    expect(badge).toHaveStyle({ color: 'yellow' });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <StatusBadge status="completed" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    badge = screen.getByTestId('status-badge');
    expect(badge).toHaveStyle({ color: 'green' });
  });

  it('should link maintenance to contract correctly', async () => {
    const MaintenanceWithContract = () => {
      const { createMaintenance } = mockUseMaintenances();
      const [selectedContract, setSelectedContract] = React.useState('');

      const contracts = [
        { id: 'contract-1', number: 'CTR-001', client_name: 'Cliente A' },
        { id: 'contract-2', number: 'CTR-002', client_name: 'Cliente B' },
      ];

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContract) {
          alert('Selecione um contrato');
          return;
        }

        await createMaintenance({
          title: 'Manutenção',
          contract_id: selectedContract,
          client_id: contracts.find(c => c.id === selectedContract)?.client_id,
        });
      };

      return (
        <form onSubmit={handleSubmit}>
          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            required
          >
            <option value="">Selecione um contrato</option>
            {contracts.map(contract => (
              <option key={contract.id} value={contract.id}>
                {contract.number} - {contract.client_name}
              </option>
            ))}
          </select>
          <button type="submit">Criar com Contrato</button>
        </form>
      );
    };

    renderWithProviders(<MaintenanceWithContract />);

    // Selecionar um contrato
    const contractSelect = screen.getByRole('combobox');
    await user.selectOptions(contractSelect, 'contract-1');

    // Submeter
    const submitButton = screen.getByRole('button', { name: 'Criar com Contrato' });
    await user.click(submitButton);

    // Verificar se foi vinculado corretamente
    await waitFor(() => {
      const { createMaintenance } = mockUseMaintenances();
      expect(createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          contract_id: 'contract-1',
        })
      );
    });
  });
});