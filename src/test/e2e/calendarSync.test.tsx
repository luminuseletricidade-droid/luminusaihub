import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dos hooks do calendário
const mockUseCalendarEvents = vi.fn(() => ({
  events: [
    {
      id: '1',
      title: 'Manutenção Preventiva',
      start: new Date('2024-01-15T10:00:00'),
      end: new Date('2024-01-15T12:00:00'),
      status: 'scheduled',
      type: 'maintenance',
      maintenance_id: 'maint-1',
    },
    {
      id: '2',
      title: 'Visita Técnica',
      start: new Date('2024-01-16T14:00:00'),
      end: new Date('2024-01-16T16:00:00'),
      status: 'in_progress',
      type: 'maintenance',
      maintenance_id: 'maint-2',
    },
  ],
  isLoading: false,
  refetch: vi.fn(),
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock('@/hooks/useCalendarEvents', () => ({
  useCalendarEvents: mockUseCalendarEvents,
}));

const mockUseMaintenances = vi.fn(() => ({
  maintenances: [
    {
      id: 'maint-1',
      title: 'Manutenção Preventiva',
      scheduled_date: '2024-01-15T10:00:00Z',
      status: 'scheduled',
      duration_hours: 2,
    },
    {
      id: 'maint-2',
      title: 'Visita Técnica',
      scheduled_date: '2024-01-16T14:00:00Z',
      status: 'in_progress',
      duration_hours: 2,
    },
  ],
  createMaintenance: vi.fn(),
  updateMaintenance: vi.fn(),
}));

vi.mock('@/hooks/useMaintenances', () => ({
  useMaintenances: mockUseMaintenances,
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

describe('Calendar Synchronization Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should sync maintenance creation with calendar', async () => {
    const CalendarWithMaintenance = () => {
      const { createMaintenance } = mockUseMaintenances();
      const { addEvent, events } = mockUseCalendarEvents();

      const handleCreateMaintenance = async () => {
        const newMaintenance = {
          id: 'maint-3',
          title: 'Nova Manutenção',
          scheduled_date: '2024-01-20T10:00:00Z',
          status: 'scheduled',
          duration_hours: 3,
        };

        // Criar manutenção
        await createMaintenance(newMaintenance);

        // Adicionar ao calendário
        await addEvent({
          title: newMaintenance.title,
          start: new Date(newMaintenance.scheduled_date),
          end: new Date(new Date(newMaintenance.scheduled_date).getTime() + newMaintenance.duration_hours * 3600000),
          type: 'maintenance',
          maintenance_id: newMaintenance.id,
          status: newMaintenance.status,
        });
      };

      return (
        <div>
          <button onClick={handleCreateMaintenance}>
            Criar Manutenção com Calendário
          </button>
          <div data-testid="calendar-events">
            {events.map(event => (
              <div key={event.id} data-testid={`event-${event.id}`}>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<CalendarWithMaintenance />);

    // Clicar para criar manutenção
    const createButton = screen.getByRole('button', { name: /criar manutenção com calendário/i });
    await user.click(createButton);

    // Verificar se as funções foram chamadas
    await waitFor(() => {
      const { createMaintenance } = mockUseMaintenances();
      const { addEvent } = mockUseCalendarEvents();

      expect(createMaintenance).toHaveBeenCalled();
      expect(addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nova Manutenção',
          type: 'maintenance',
        })
      );
    });
  });

  it('should update calendar when maintenance status changes', async () => {
    const MaintenanceWithCalendarUpdate = () => {
      const { updateMaintenance, maintenances } = mockUseMaintenances();
      const { updateEvent, events } = mockUseCalendarEvents();

      const handleStatusUpdate = async (maintenanceId: string, newStatus: string) => {
        // Atualizar manutenção
        await updateMaintenance(maintenanceId, { status: newStatus });

        // Atualizar evento no calendário
        const event = events.find(e => e.maintenance_id === maintenanceId);
        if (event) {
          await updateEvent(event.id, { status: newStatus });
        }
      };

      return (
        <div>
          {maintenances.map(maintenance => (
            <div key={maintenance.id} data-testid={`maintenance-${maintenance.id}`}>
              <h3>{maintenance.title}</h3>
              <p>Status: {maintenance.status}</p>
              <button
                onClick={() => handleStatusUpdate(maintenance.id, 'completed')}
              >
                Marcar como Concluída
              </button>
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<MaintenanceWithCalendarUpdate />);

    // Encontrar e clicar no botão da primeira manutenção
    const maintenanceCard = screen.getByTestId('maintenance-maint-1');
    const completeButton = within(maintenanceCard).getByRole('button', { name: /marcar como concluída/i });

    await user.click(completeButton);

    // Verificar se ambas as funções foram chamadas
    await waitFor(() => {
      const { updateMaintenance } = mockUseMaintenances();
      const { updateEvent } = mockUseCalendarEvents();

      expect(updateMaintenance).toHaveBeenCalledWith('maint-1', { status: 'completed' });
      expect(updateEvent).toHaveBeenCalledWith('1', { status: 'completed' });
    });
  });

  it('should display correct status colors in calendar events', async () => {
    const CalendarEventDisplay = () => {
      const { events } = mockUseCalendarEvents();

      const getStatusColor = (status: string) => {
        const colors = {
          scheduled: 'blue',
          in_progress: 'yellow',
          completed: 'green',
          cancelled: 'red',
        };
        return colors[status as keyof typeof colors] || 'gray';
      };

      return (
        <div data-testid="calendar">
          {events.map(event => (
            <div
              key={event.id}
              data-testid={`calendar-event-${event.id}`}
              style={{ backgroundColor: getStatusColor(event.status) }}
              className="calendar-event"
            >
              <span>{event.title}</span>
              <span data-testid={`status-${event.id}`}>{event.status}</span>
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<CalendarEventDisplay />);

    // Verificar cor do primeiro evento (scheduled)
    const event1 = screen.getByTestId('calendar-event-1');
    expect(event1).toHaveStyle({ backgroundColor: 'blue' });
    expect(screen.getByTestId('status-1')).toHaveTextContent('scheduled');

    // Verificar cor do segundo evento (in_progress)
    const event2 = screen.getByTestId('calendar-event-2');
    expect(event2).toHaveStyle({ backgroundColor: 'yellow' });
    expect(screen.getByTestId('status-2')).toHaveTextContent('in_progress');
  });

  it('should remove event from calendar when maintenance is deleted', async () => {
    const CalendarWithDelete = () => {
      const { maintenances } = mockUseMaintenances();
      const { deleteEvent, events } = mockUseCalendarEvents();
      const [localEvents, setLocalEvents] = React.useState(events);

      const handleDeleteMaintenance = async (maintenanceId: string) => {
        // Encontrar evento correspondente
        const event = localEvents.find(e => e.maintenance_id === maintenanceId);
        if (event) {
          await deleteEvent(event.id);
          setLocalEvents(prev => prev.filter(e => e.id !== event.id));
        }
      };

      return (
        <div>
          <div data-testid="maintenance-list">
            {maintenances.map(maintenance => (
              <div key={maintenance.id}>
                <span>{maintenance.title}</span>
                <button
                  onClick={() => handleDeleteMaintenance(maintenance.id)}
                >
                  Deletar
                </button>
              </div>
            ))}
          </div>
          <div data-testid="calendar-events">
            {localEvents.map(event => (
              <div key={event.id} data-testid={`event-${event.id}`}>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<CalendarWithDelete />);

    // Verificar eventos iniciais
    expect(screen.getByTestId('event-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-2')).toBeInTheDocument();

    // Deletar primeira manutenção
    const deleteButtons = screen.getAllByRole('button', { name: /deletar/i });
    await user.click(deleteButtons[0]);

    // Verificar se o evento foi removido
    await waitFor(() => {
      const { deleteEvent } = mockUseCalendarEvents();
      expect(deleteEvent).toHaveBeenCalledWith('1');
      expect(screen.queryByTestId('event-1')).not.toBeInTheDocument();
    });
  });

  it('should refresh calendar after CRUD operations', async () => {
    const CalendarWithRefresh = () => {
      const { refetch } = mockUseCalendarEvents();
      const { createMaintenance, updateMaintenance } = mockUseMaintenances();

      const handleOperation = async (operation: 'create' | 'update') => {
        if (operation === 'create') {
          await createMaintenance({
            title: 'Nova',
            scheduled_date: '2024-01-25T10:00:00Z',
          });
        } else {
          await updateMaintenance('maint-1', { status: 'completed' });
        }

        // Atualizar calendário
        await refetch();
      };

      return (
        <div>
          <button onClick={() => handleOperation('create')}>
            Criar e Atualizar Calendário
          </button>
          <button onClick={() => handleOperation('update')}>
            Atualizar e Sincronizar
          </button>
        </div>
      );
    };

    renderWithProviders(<CalendarWithRefresh />);

    // Testar criação
    const createButton = screen.getByRole('button', { name: /criar e atualizar calendário/i });
    await user.click(createButton);

    await waitFor(() => {
      const { refetch } = mockUseCalendarEvents();
      expect(refetch).toHaveBeenCalled();
    });

    // Limpar mock
    vi.clearAllMocks();

    // Testar atualização
    const updateButton = screen.getByRole('button', { name: /atualizar e sincronizar/i });
    await user.click(updateButton);

    await waitFor(() => {
      const { refetch } = mockUseCalendarEvents();
      expect(refetch).toHaveBeenCalled();
    });
  });
});