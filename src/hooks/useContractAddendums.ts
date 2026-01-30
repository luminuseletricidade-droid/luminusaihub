/**
 * Hook for managing contract addendums
 * Handles upload, listing, and change management for contract addendums
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api.config';
import { ContractAddendum, PendingContractChange } from '@/types';
import { useToast } from '@/hooks/use-toast';

export type ProcessingStep = 'idle' | 'uploading' | 'validating' | 'extracting' | 'analyzing' | 'completed' | 'error';

interface UseContractAddendumsReturn {
  // State
  addendums: ContractAddendum[];
  pendingChanges: PendingContractChange[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isProcessing: boolean;
  processingStep: ProcessingStep;
  selectedAddendum: ContractAddendum | null;

  // Actions
  loadAddendums: () => Promise<void>;
  uploadAddendum: (file: File, title?: string, description?: string) => Promise<ContractAddendum | null>;
  deleteAddendum: (addendumId: string) => Promise<boolean>;
  loadPendingChanges: (addendumId: string) => Promise<void>;
  approveChange: (changeId: string) => Promise<boolean>;
  rejectChange: (changeId: string, reason?: string) => Promise<boolean>;
  applyAllApproved: (addendumId: string) => Promise<boolean>;
  setSelectedAddendum: (addendum: ContractAddendum | null) => void;
  refreshAddendum: (addendumId: string) => Promise<ContractAddendum | null>;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export function useContractAddendums(contractId: string): UseContractAddendumsReturn {
  const { toast } = useToast();
  const [addendums, setAddendums] = useState<ContractAddendum[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingContractChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [selectedAddendum, setSelectedAddendum] = useState<ContractAddendum | null>(null);

  // Load all addendums for the contract
  const loadAddendums = useCallback(async () => {
    if (!contractId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/addendums`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load addendums');
      }

      const data = await response.json();
      setAddendums(data);
    } catch (error) {
      console.error('Error loading addendums:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os anexos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractId, toast]);

  // Upload a new addendum
  const uploadAddendum = useCallback(async (
    file: File,
    title?: string,
    description?: string
  ): Promise<ContractAddendum | null> => {
    if (!contractId) return null;

    setIsUploading(true);
    setUploadProgress(10);
    setProcessingStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      // Upload file - backend returns immediately, processing happens in background
      const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/addendums`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload addendum');
      }

      const addendum = await response.json();
      setUploadProgress(100);

      toast({
        title: 'Upload concluído',
        description: 'Arquivo enviado! Processando OCR e análise com IA...',
      });

      // Add to list
      setAddendums(prev => [...prev, addendum]);

      // Start polling immediately - backend processes in background
      // Status flow: uploading → extracting → validating → analyzing → completed
      setIsUploading(false);
      setUploadProgress(0);
      pollAddendumStatus(addendum.id);

      return addendum;
    } catch (error) {
      console.error('Error uploading addendum:', error);
      setProcessingStep('error');
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o anexo',
        variant: 'destructive'
      });
      setIsUploading(false);
      setUploadProgress(0);
      return null;
    }
  }, [contractId, toast]);

  // Map backend processing_status to frontend ProcessingStep
  const mapBackendStatusToStep = (status: string): ProcessingStep => {
    switch (status) {
      case 'uploading': return 'uploading';
      case 'extracting': return 'extracting';
      case 'validating': return 'validating';
      case 'analyzing': return 'analyzing';
      case 'processing': return 'analyzing'; // Legacy status
      case 'completed': return 'completed';
      case 'error': return 'error';
      default: return 'uploading';
    }
  };

  // Poll addendum status until processing is complete
  const pollAddendumStatus = useCallback(async (addendumId: string) => {
    setIsProcessing(true);
    const maxAttempts = 90; // ~3 minutes of polling at 2 second intervals
    let attempts = 0;
    let validationWarningShown = false; // Track if we've shown validation warning

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/addendums/${addendumId}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) return;

        const addendum = await response.json();

        // Update in list
        setAddendums(prev => prev.map(a =>
          a.id === addendumId ? addendum : a
        ));

        // Map backend status to frontend step
        const currentStep = mapBackendStatusToStep(addendum.processing_status);
        setProcessingStep(currentStep);

        // Check for validation warning (only show once)
        if (addendum.identity_validation && !validationWarningShown) {
          try {
            const validation = typeof addendum.identity_validation === 'string'
              ? JSON.parse(addendum.identity_validation)
              : addendum.identity_validation;

            if (validation.validation_status === 'warning' || validation.validation_status === 'alert') {
              validationWarningShown = true;
              toast({
                title: 'Aviso de Validação',
                description: validation.message || 'O documento pode não pertencer a este contrato',
                variant: 'destructive'
              });
            }
          } catch (parseError) {
            console.warn('Error parsing validation result:', parseError);
          }
        }

        if (addendum.processing_status === 'completed') {
          setIsProcessing(false);
          toast({
            title: 'Processamento concluído',
            description: `Anexo analisado! ${addendum.extracted_insights?.detected_changes?.length || 0} alterações identificadas.`,
          });
          // Reset step after a brief delay
          setTimeout(() => setProcessingStep('idle'), 3000);
          return;
        }

        if (addendum.processing_status === 'error') {
          setIsProcessing(false);
          toast({
            title: 'Erro no processamento',
            description: addendum.processing_error || 'Erro ao processar o anexo',
            variant: 'destructive'
          });
          // Reset step after a brief delay
          setTimeout(() => setProcessingStep('idle'), 5000);
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsProcessing(false);
          setProcessingStep('idle');
          toast({
            title: 'Timeout',
            description: 'O processamento está demorando mais que o esperado. Verifique o status do anexo.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error polling addendum status:', error);
        setIsProcessing(false);
        setProcessingStep('error');
        setTimeout(() => setProcessingStep('idle'), 5000);
      }
    };

    poll();
  }, [toast]);

  // Refresh a single addendum
  const refreshAddendum = useCallback(async (addendumId: string): Promise<ContractAddendum | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/addendums/${addendumId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) return null;

      const addendum = await response.json();

      // Update in list
      setAddendums(prev => prev.map(a =>
        a.id === addendumId ? addendum : a
      ));

      // Update selected if same
      if (selectedAddendum?.id === addendumId) {
        setSelectedAddendum(addendum);
      }

      return addendum;
    } catch (error) {
      console.error('Error refreshing addendum:', error);
      return null;
    }
  }, [selectedAddendum]);

  // Delete an addendum
  const deleteAddendum = useCallback(async (addendumId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/addendums/${addendumId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete addendum');
      }

      setAddendums(prev => prev.filter(a => a.id !== addendumId));

      toast({
        title: 'Sucesso',
        description: 'Anexo excluído com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Error deleting addendum:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o anexo',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Load pending changes for an addendum
  const loadPendingChanges = useCallback(async (addendumId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/addendums/${addendumId}/changes`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load changes');
      }

      const data = await response.json();
      setPendingChanges(data);
    } catch (error) {
      console.error('Error loading pending changes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as alterações',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Approve a single change
  const approveChange = useCallback(async (changeId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/changes/${changeId}/approve`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve change');
      }

      const updatedChange = await response.json();

      setPendingChanges(prev => prev.map(c =>
        c.id === changeId ? updatedChange : c
      ));

      toast({
        title: 'Alteração aprovada',
        description: 'A alteração foi aprovada e está pronta para aplicar',
      });

      return true;
    } catch (error) {
      console.error('Error approving change:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar a alteração',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Reject a single change
  const rejectChange = useCallback(async (changeId: string, reason?: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/changes/${changeId}/reject`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject change');
      }

      const updatedChange = await response.json();

      setPendingChanges(prev => prev.map(c =>
        c.id === changeId ? updatedChange : c
      ));

      toast({
        title: 'Alteração rejeitada',
        description: 'A alteração foi rejeitada',
      });

      return true;
    } catch (error) {
      console.error('Error rejecting change:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar a alteração',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Apply all approved changes
  const applyAllApproved = useCallback(async (addendumId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/addendums/${addendumId}/apply`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to apply changes');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Alterações aplicadas',
          description: `${result.applied_count} alteração(ões) aplicada(s) ao contrato`,
        });

        // Refresh addendum and changes
        await refreshAddendum(addendumId);
        await loadPendingChanges(addendumId);

        return true;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível aplicar as alterações',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, refreshAddendum, loadPendingChanges]);

  // Load addendums on mount
  useEffect(() => {
    if (contractId) {
      loadAddendums();
    }
  }, [contractId, loadAddendums]);

  return {
    addendums,
    pendingChanges,
    isLoading,
    isUploading,
    uploadProgress,
    isProcessing,
    processingStep,
    selectedAddendum,
    loadAddendums,
    uploadAddendum,
    deleteAddendum,
    loadPendingChanges,
    approveChange,
    rejectChange,
    applyAllApproved,
    setSelectedAddendum,
    refreshAddendum
  };
}
