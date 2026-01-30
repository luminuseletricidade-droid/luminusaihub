import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import IntegratedUploadWithAgentsEnhanced from '@/components/IntegratedUploadWithAgentsEnhanced';

// Mock de hooks customizados
vi.mock('@/hooks/useContractUpload', () => ({
  useContractUpload: () => ({
    uploadContract: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'test-contract-id', number: 'TEST-001' }
    }),
    isUploading: false,
    uploadProgress: 0,
  }),
}));

vi.mock('@/hooks/useAgentProcessing', () => ({
  useAgentProcessing: () => ({
    processWithAgents: vi.fn().mockResolvedValue({
      pdfProcessor: { success: true, data: 'PDF processado' },
      maintenancePlanner: { success: true, data: 'Plano criado' },
      reportGenerator: { success: true, data: 'Relatório gerado' },
      scheduleGenerator: { success: true, data: 'Cronograma criado' },
    }),
    isProcessing: false,
    agentStatus: {},
  }),
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

describe('Contract Upload with Agents E2E', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should upload a contract and process with all agents', async () => {
    renderWithProviders(<IntegratedUploadWithAgentsEnhanced />);

    // Verificar se o componente foi renderizado
    expect(screen.getByText(/Upload de Contrato com IA/i)).toBeInTheDocument();

    // Simular seleção de arquivo
    const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/selecione um arquivo/i);

    await user.upload(input, file);

    // Verificar se o arquivo foi carregado
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();

    // Preencher dados do formulário
    const contractNumberInput = screen.getByLabelText(/número do contrato/i);
    await user.type(contractNumberInput, 'TEST-001');

    const clientNameInput = screen.getByLabelText(/nome do cliente/i);
    await user.type(clientNameInput, 'Empresa Teste');

    const cnpjInput = screen.getByLabelText(/cnpj/i);
    await user.type(cnpjInput, '11.111.111/0001-11');

    // Submeter o formulário
    const submitButton = screen.getByRole('button', { name: /processar com agentes ia/i });
    await user.click(submitButton);

    // Aguardar processamento dos agentes
    await waitFor(() => {
      expect(screen.getByText(/processamento concluído/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verificar se todos os agentes foram processados
    expect(screen.getByText(/pdf processor/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance planner/i)).toBeInTheDocument();
    expect(screen.getByText(/report generator/i)).toBeInTheDocument();
    expect(screen.getByText(/schedule generator/i)).toBeInTheDocument();
  });

  it('should handle upload errors gracefully', async () => {
    // Mock de erro no upload
    const mockUploadError = vi.fn().mockRejectedValue(new Error('Upload failed'));
    vi.mock('@/hooks/useContractUpload', () => ({
      useContractUpload: () => ({
        uploadContract: mockUploadError,
        isUploading: false,
        uploadProgress: 0,
      }),
    }));

    renderWithProviders(<IntegratedUploadWithAgentsEnhanced />);

    const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/selecione um arquivo/i);

    await user.upload(input, file);

    const submitButton = screen.getByRole('button', { name: /processar com agentes ia/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro no upload/i)).toBeInTheDocument();
    });
  });

  it('should validate CNPJ format before submission', async () => {
    renderWithProviders(<IntegratedUploadWithAgentsEnhanced />);

    const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/selecione um arquivo/i);

    await user.upload(input, file);

    const cnpjInput = screen.getByLabelText(/cnpj/i);
    await user.type(cnpjInput, '123456789'); // CNPJ inválido

    const submitButton = screen.getByRole('button', { name: /processar com agentes ia/i });
    await user.click(submitButton);

    // Verificar mensagem de erro de validação
    expect(screen.getByText(/cnpj inválido/i)).toBeInTheDocument();
  });

  it('should show progress indicators during agent processing', async () => {
    renderWithProviders(<IntegratedUploadWithAgentsEnhanced />);

    const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/selecione um arquivo/i);

    await user.upload(input, file);

    // Preencher dados válidos
    await user.type(screen.getByLabelText(/número do contrato/i), 'TEST-002');
    await user.type(screen.getByLabelText(/nome do cliente/i), 'Cliente Teste');
    await user.type(screen.getByLabelText(/cnpj/i), '22.222.222/0001-22');

    const submitButton = screen.getByRole('button', { name: /processar com agentes ia/i });
    await user.click(submitButton);

    // Verificar indicadores de progresso
    expect(screen.getByText(/processando/i)).toBeInTheDocument();

    // Verificar status de cada agente
    await waitFor(() => {
      const agentStatuses = screen.getAllByTestId(/agent-status/i);
      expect(agentStatuses).toHaveLength(4); // 4 agentes
    });
  });

  it('should allow retry on agent processing failure', async () => {
    // Mock de falha em um agente
    const mockProcessWithFailure = vi.fn()
      .mockResolvedValueOnce({
        pdfProcessor: { success: false, error: 'Failed to process PDF' },
        maintenancePlanner: { success: true, data: 'Plano criado' },
        reportGenerator: { success: true, data: 'Relatório gerado' },
        scheduleGenerator: { success: true, data: 'Cronograma criado' },
      })
      .mockResolvedValueOnce({
        pdfProcessor: { success: true, data: 'PDF processado' },
        maintenancePlanner: { success: true, data: 'Plano criado' },
        reportGenerator: { success: true, data: 'Relatório gerado' },
        scheduleGenerator: { success: true, data: 'Cronograma criado' },
      });

    vi.mock('@/hooks/useAgentProcessing', () => ({
      useAgentProcessing: () => ({
        processWithAgents: mockProcessWithFailure,
        isProcessing: false,
        agentStatus: {},
      }),
    }));

    renderWithProviders(<IntegratedUploadWithAgentsEnhanced />);

    const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/selecione um arquivo/i);

    await user.upload(input, file);

    await user.type(screen.getByLabelText(/número do contrato/i), 'TEST-003');
    await user.type(screen.getByLabelText(/nome do cliente/i), 'Cliente Retry');
    await user.type(screen.getByLabelText(/cnpj/i), '33.333.333/0001-33');

    const submitButton = screen.getByRole('button', { name: /processar com agentes ia/i });
    await user.click(submitButton);

    // Aguardar primeira tentativa com falha
    await waitFor(() => {
      expect(screen.getByText(/falha no pdf processor/i)).toBeInTheDocument();
    });

    // Procurar e clicar no botão de retry
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    await user.click(retryButton);

    // Aguardar segunda tentativa com sucesso
    await waitFor(() => {
      expect(screen.getByText(/processamento concluído/i)).toBeInTheDocument();
    });
  });
});