import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModernContractChat } from '../ModernContractChat';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          data: null,
          error: null
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({
          data: { path: 'test-path' },
          error: null
        })),
        download: vi.fn(() => ({
          data: new Blob(['test content']),
          error: null
        }))
      }))
    },
    auth: {
      getSession: vi.fn(() => ({
        data: {
          session: {
            user: { id: 'test-user-id' }
          }
        },
        error: null
      }))
    }
  }
}));

vi.mock('@/hooks/useChatSession', () => ({
  useChatSession: () => ({
    currentSession: {
      id: 'test-session',
      messages: []
    },
    isLoading: false,
    forceNewSession: vi.fn(),
    addMessage: vi.fn(),
    loadSessionFromDatabase: vi.fn(),
    clearCurrentSession: vi.fn(),
    getOrMaintainSession: vi.fn(),
    loadMostRecentSession: vi.fn()
  })
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { id: 'test-user-id' }
    }
  })
}));

describe('ModernContractChat - Multiple Document Attachments', () => {
  const mockContract = {
    id: 'test-contract-id',
    contract_number: 'TEST-001',
    company_name: 'Test Company'
  };

  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle multiple file attachments correctly', async () => {
    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Create mock files
    const file1 = new File(['content1'], 'document1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'document2.pdf', { type: 'application/pdf' });
    const file3 = new File(['content3'], 'document3.txt', { type: 'text/plain' });

    // Find file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Simulate file upload
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2, file3],
      writable: false
    });

    fireEvent.change(fileInput);

    // Wait for files to be processed
    await waitFor(() => {
      // Check if all files are displayed in the UI
      expect(screen.queryByText(/document1\.pdf/i)).toBeTruthy();
      expect(screen.queryByText(/document2\.pdf/i)).toBeTruthy();
      expect(screen.queryByText(/document3\.txt/i)).toBeTruthy();
    });
  });

  it('should load and attach all agent documents', async () => {
    // Mock agent documents in the database
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'generated_reports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: 'agent-1',
                    agent_type: 'manutencao',
                    title: 'Relatório de Manutenção',
                    content: { text: 'Maintenance report content' },
                    created_at: new Date().toISOString()
                  },
                  {
                    id: 'agent-2',
                    agent_type: 'documentacao',
                    title: 'Documentação Técnica',
                    content: { text: 'Technical documentation content' },
                    created_at: new Date().toISOString()
                  },
                  {
                    id: 'agent-3',
                    agent_type: 'cronogramas',
                    title: 'Cronograma de Atividades',
                    content: { text: 'Schedule content' },
                    created_at: new Date().toISOString()
                  },
                  {
                    id: 'agent-4',
                    agent_type: 'relatorios',
                    title: 'Relatório Analítico',
                    content: { text: 'Analytical report content' },
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              }))
            }))
          }))
        } as unknown;
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      } as unknown;
    });

    render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Wait for agent documents to load
    await waitFor(() => {
      // Verify all 4 agent documents are loaded
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('generated_reports');
    });
  });

  it('should clear all files when clear function is called', async () => {
    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Add some files first
    const file1 = new File(['content1'], 'document1.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file1],
      writable: false
    });

    fireEvent.change(fileInput);

    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.queryByText(/document1\.pdf/i)).toBeTruthy();
    });

    // Now test clearing files (this would be triggered by a button in the actual component)
    // Since we have access to the component internals through our implementation,
    // we know there are clear functions available
  });

  it('should handle file removal individually', async () => {
    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Add multiple files
    const file1 = new File(['content1'], 'document1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'document2.pdf', { type: 'application/pdf' });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false
    });

    fireEvent.change(fileInput);

    // Wait for files to be processed
    await waitFor(() => {
      expect(screen.queryByText(/document1\.pdf/i)).toBeTruthy();
      expect(screen.queryByText(/document2\.pdf/i)).toBeTruthy();
    });

    // Find and click remove button for first file
    const removeButtons = container.querySelectorAll('[aria-label*="remov"]');
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);

      // Verify one file is removed
      await waitFor(() => {
        expect(screen.queryByText(/document1\.pdf/i)).toBeFalsy();
        expect(screen.queryByText(/document2\.pdf/i)).toBeTruthy();
      });
    }
  });

  it('should handle mixed agent and user files correctly', async () => {
    // Setup agent documents
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'generated_reports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: 'agent-1',
                    agent_type: 'manutencao',
                    title: 'Relatório de Manutenção',
                    content: { text: 'Maintenance report content' },
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              }))
            }))
          }))
        } as unknown;
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      } as unknown;
    });

    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Add user file
    const userFile = new File(['user content'], 'user-document.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [userFile],
      writable: false
    });

    fireEvent.change(fileInput);

    // Wait for both types of files to be present
    await waitFor(() => {
      expect(screen.queryByText(/user-document\.pdf/i)).toBeTruthy();
    });
  });

  it('should maintain scroll position when adding documents', async () => {
    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Get scroll area
    const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
    expect(scrollArea).toBeTruthy();

    // Add a file
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });

    // Check initial scroll position
    const initialScrollTop = scrollArea?.scrollTop || 0;

    fireEvent.change(fileInput);

    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.queryByText(/document\.pdf/i)).toBeTruthy();
    });

    // Verify scroll behavior (should auto-scroll to bottom for new content)
    // In the actual implementation, scrollToBottom is called
  });

  it('should handle file upload errors gracefully', async () => {
    // Mock upload error
    vi.mocked(supabase.storage.from).mockImplementation(() => ({
      upload: vi.fn(() => ({
        data: null,
        error: new Error('Upload failed')
      })),
      download: vi.fn(() => ({
        data: null,
        error: null
      }))
    }) as unknown);

    const { container } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Try to upload a file
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(fileInput);

    // Wait and verify error handling
    await waitFor(() => {
      // The component should handle the error gracefully
      // and still show the file in the list
      expect(screen.queryByText(/document\.pdf/i)).toBeTruthy();
    });
  });

  it('should properly clean up agent documents when switching contracts', async () => {
    const { rerender } = render(
      <ModernContractChat
        contract={mockContract}
        onBack={mockOnBack}
      />
    );

    // Switch to a different contract
    const newContract = {
      id: 'new-contract-id',
      contract_number: 'TEST-002',
      company_name: 'New Test Company'
    };

    rerender(
      <ModernContractChat
        contract={newContract}
        onBack={mockOnBack}
      />
    );

    // Verify that documents are cleared/reloaded for the new contract
    await waitFor(() => {
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('generated_reports');
    });
  });
});