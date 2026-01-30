import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CepInput } from '@/components/ui/cep-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from '@/hooks/useAuthSession';
import { API_BASE_URL } from '@/config/api.config';
import { Save, Edit3, X, Check, Calendar, DollarSign, User, FileText, Settings, MapPin, Hash, Building, Eye, Download, Plus, Trash2 } from 'lucide-react';
import { ExtendedContract, Client, ContractDocument, OriginalDocument, Equipment } from '@/types';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { toBRDateString } from '@/utils/dateUtils';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';
import ContractEditor from '@/components/ContractEditor';
import { isUuid } from '@/lib/contractNormalizer';

interface ContractDataEditProps {
  contractId: string;
  initialData?: ExtendedContract;
  onUpdate?: () => void;
}

const ContractDataEdit: React.FC<ContractDataEditProps> = ({ 
  contractId, 
  initialData,
  onUpdate 
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(!initialData); // Start loading if no initial data
  const [contractData, setContractData] = useState<ExtendedContract | null>(null);
  const [editedData, setEditedData] = useState<ExtendedContract>({} as ExtendedContract);
  const [originalDocument, setOriginalDocument] = useState<OriginalDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState('');
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [equipmentRecord, setEquipmentRecord] = useState<Equipment | null>(null);
  const [servicesInput, setServicesInput] = useState('');
  const servicesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [editingServiceText, setEditingServiceText] = useState('');

  const parseServicesField = useCallback((servicesField: string[] | string | null): string[] => {
    if (!servicesField) {
      return [];
    }

    if (Array.isArray(servicesField)) {
      return servicesField
        .map(service => typeof service === 'string' ? service.trim() : '')
        .filter(service => service.length > 0);
    }

    if (typeof servicesField === 'string') {
      const trimmed = servicesField.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(service => typeof service === 'string' ? service.trim() : '')
            .filter(service => service.length > 0);
        }
      } catch {
        // Not JSON, treat as newline separated
        return trimmed
          .split('\n')
          .map(service => service.trim())
          .filter(service => service.length > 0);
      }
    }

    return [];
  }, []);

  const loadContractData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [ContractDataEdit] Carregando dados do contrato ID via Backend API:', contractId);

      if (!isUuid(contractId)) {
        console.warn('⚠️ ContractDataEdit: contractId não é UUID, abortando load. id=', contractId);
        setLoading(false);
        return;
      }

      // Get session for authentication - with fallback for token loss
      let accessToken: string | null = null;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && session?.access_token) {
          accessToken = session.access_token;
        } else {
          // Fallback: try to get token from localStorage (set by auth provider)
          const stored = localStorage.getItem('supabase.auth.token');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              accessToken = parsed.access_token || parsed.token;
            } catch {
              console.warn('⚠️ [ContractDataEdit] Could not parse stored token');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ [ContractDataEdit] Error getting session:', error);
      }

      if (!accessToken) {
        // 🔧 FIX: If token is missing, try one more alternative: use Supabase client directly
        // This handles cases where auth context is temporarily unavailable after save
        console.warn('⚠️ [ContractDataEdit] No auth token via standard methods, attempting direct Supabase query');

        try {
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', contractId)
            .single();

          if (!supabaseError && supabaseData) {
            console.log('✅ [ContractDataEdit] Loaded contract directly from Supabase:', supabaseData);

            const parsedServices = parseServicesField(supabaseData.services);
            const formattedData: ExtendedContract = {
              ...supabaseData,
              contract_number: supabaseData.contract_number || '',
              status: supabaseData.status || 'active',
              contract_type: supabaseData.contract_type || 'maintenance',
              value: supabaseData.value || 0,
              duration_months: supabaseData.duration_months || null,
              monthly_value: supabaseData.monthly_value || null,
              client_zip_code: supabaseData.client_zip_code || '',
              client_address: supabaseData.client_address || '',
              client_neighborhood: supabaseData.client_neighborhood || '',
              client_number: supabaseData.client_number || '',
              client_city: supabaseData.client_city || '',
              client_state: supabaseData.client_state || '',
              payment_terms: supabaseData.payment_terms || '',
              technical_notes: supabaseData.technical_notes || '',
              special_conditions: supabaseData.special_conditions || '',
              warranty_terms: supabaseData.warranty_terms || '',
              services: parsedServices,
              description: supabaseData.description || '',
              observations: supabaseData.observations || supabaseData.description || ''
            };

            console.log('📋 [ContractDataEdit] Dados atualizados do Supabase:', formattedData);
            setContractData(formattedData);
            setEditedData(formattedData);
            setServicesInput(parsedServices.join('\n'));
            setLoading(false);
            return;
          } else {
            console.warn('⚠️ [ContractDataEdit] Supabase direct query also failed:', supabaseError);
          }
        } catch (supabaseQueryError) {
          console.warn('⚠️ [ContractDataEdit] Exception during direct Supabase query:', supabaseQueryError);
        }

        // If we get here, all reload methods failed - but that's OK, data was saved
        console.warn('⚠️ [ContractDataEdit] Could not reload data, but changes were saved. User should reload page (F5) to see latest data.');
        setLoading(false);
        return;
      }

      // Fetch contract from Backend API (returns pre-consolidated data)
      const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contrato não encontrado');
        }
        if (response.status === 401) {
          console.warn('⚠️ [ContractDataEdit] Authentication failed, skipping reload');
          setLoading(false);
          return;
        }
        throw new Error(`Erro ao carregar contrato: ${response.statusText}`);
      }

      const contractData = await response.json();

      console.log('📄 [ContractDataEdit] Dados do contrato carregados da API:', contractData);

      // Parse services from consolidated data
      const parsedServices = parseServicesField(contractData.services);

      // Load dedicated equipment record for updates
      let equipmentData: Equipment | null = null;
      try {
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('*')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: true })
          .maybeSingle();

        if (!equipmentError && equipment) {
          equipmentData = equipment;
          setEquipmentRecord(equipment);
          console.log('🔧 [ContractDataEdit] Equipamento dedicado carregado:', equipmentData);
        }
      } catch (error) {
        console.warn('⚠️ [ContractDataEdit] Falha ao buscar equipamento dedicado:', error);
      }

      // Format data - API returns pre-consolidated, but use equipment record as primary source
      const formattedData: ExtendedContract = {
        ...contractData,

        // 🔧 EXPLICIT MAPPING: Contract basic fields
        contract_number: contractData.contract_number || '',
        status: contractData.status || 'active',
        contract_type: contractData.contract_type || 'maintenance',
        value: contractData.value || 0,

        // 🔧 EXPLICIT MAPPING: Client address fields (from COALESCE in API)
        client_zip_code: contractData.client_zip_code || '',
        client_address: contractData.client_address || '',
        client_neighborhood: contractData.client_neighborhood || '',
        client_number: contractData.client_number || '',
        client_city: contractData.client_city || '',
        client_state: contractData.client_state || '',

        // 🔧 EXPLICIT MAPPING: Commercial fields
        payment_terms: contractData.payment_terms || '',
        technical_notes: contractData.technical_notes || '',
        special_conditions: contractData.special_conditions || '',
        warranty_terms: contractData.warranty_terms || '',

        // Use dedicated equipment record if available, otherwise use consolidated data from API
        equipment_type: equipmentData?.type || contractData.equipment_type || '',
        equipment_model: equipmentData?.model || contractData.equipment_model || '',
        equipment_brand: equipmentData?.manufacturer || contractData.equipment_brand || '',
        equipment_serial: equipmentData?.serial_number || contractData.equipment_serial || '',
        equipment_power: equipmentData?.power || contractData.equipment_power || '',
        equipment_voltage: equipmentData?.voltage || contractData.equipment_voltage || '',
        equipment_location: equipmentData?.location || contractData.equipment_location || '',
        equipment_year: equipmentData?.year || contractData.equipment_year || '',
        equipment_condition: equipmentData?.condition || contractData.equipment_condition || '',

        services: parsedServices,
        description: contractData.description || '',
        observations: contractData.observations || contractData.description || ''
      };

      console.log('📋 [ContractDataEdit] Dados formatados FINAIS para exibição:', formattedData);

      setContractData(formattedData);
      setEditedData(formattedData);
      setServicesInput(parsedServices.join('\n'));
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados do contrato",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [contractId, toast, parseServicesField]);

  // Memoized callbacks para AddressFormWithCep para evitar re-renders desnecessários
  const handleCepChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_zip_code: value}));
  }, []);

  const handleAddressChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_address: value}));
  }, []);

  const handleNeighborhoodChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_neighborhood: value}));
  }, []);

  const handleNumberChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_number: value}));
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_city: value}));
  }, []);

  const handleStateChange = useCallback((value: string) => {
    setEditedData(prev => ({...prev, client_state: value}));
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    autoResizeTextarea(servicesTextareaRef.current);
  }, [isEditing, servicesInput]);

  useEffect(() => {
    console.log('🚀 [ContractDataEdit] useEffect disparado:', { contractId, initialData });

    // 🔧 FIX: Only use initialData if we don't have contractData loaded yet
    // This prevents overriding freshly loaded data from the database
    if (initialData && !contractData) {
      console.log('📋 [ContractDataEdit] Usando initialData (primeira carga):', initialData);

      // Transformar dados para o formato esperado pelo componente
      const transformedData: ExtendedContract = {
        ...initialData,
        // Mapear dados do cliente aninhado para campos planos
        // CORREÇÃO: Nome fantasia vem da IA, Razão social vem do banco
        client_name: initialData.client_name || '', // Nome fantasia (da IA)
        client_legal_name: initialData.client?.name || initialData.client_legal_name || '', // Razão social (do banco)
        client_cnpj: initialData.client?.cnpj || initialData.client_cnpj || '',
        client_email: initialData.client?.email || initialData.client_email || '',
        client_phone: initialData.client?.phone || initialData.client_phone || '',
        client_address: initialData.client?.address || initialData.client_address || '',
        client_city: initialData.client?.city || initialData.client_city || '',
        client_state: initialData.client?.state || initialData.client_state || '',
        client_zip_code: initialData.client?.zip_code || initialData.client_zip_code || '',
        client_contact_person: initialData.client?.contact_person || initialData.client_contact_person || '',

        // Mapear dados do equipamento
        equipment_type: initialData.equipment?.type || initialData.equipment_type || '',
        equipment_model: initialData.equipment?.model || initialData.equipment_model || '',
        equipment_brand: initialData.equipment?.brand || initialData.equipment_brand || '',
        equipment_serial: initialData.equipment?.serial_number || initialData.equipment_serial || '',
        equipment_power: initialData.equipment?.power || initialData.equipment_power || '',
        equipment_voltage: initialData.equipment?.voltage || initialData.equipment_voltage || '',
        equipment_location: initialData.equipment?.location || initialData.equipment_location || '',
        equipment_year: initialData.equipment?.year || initialData.equipment_year || '',
        equipment_condition: initialData.equipment?.condition || initialData.equipment_condition || '',

        // Mapear serviços - garantir que é sempre um array
        services: initialData.services || [],

        // Mapear observações e notas técnicas
        description: initialData.description || initialData.observations || '',
        technical_notes: initialData.technical_notes || '',
        payment_terms: initialData.payment_terms || '',
        special_conditions: initialData.special_conditions || '',
        warranty_terms: initialData.warranty_terms || '',
        maintenance_frequency: initialData.maintenance_frequency || initialData.contract?.maintenance_frequency || ''
      };

      console.log('🔄 [ContractDataEdit] Dados transformados:', transformedData);

      setContractData(transformedData);
      setEditedData(transformedData);

      // Buscar registro dedicado do equipamento para obter ID e manter sincronização
      (async () => {
        try {
          const { data: equipment, error: equipmentError } = await supabase
            .from('equipment')
            .select('*')
            .eq('contract_id', contractId)
            .order('created_at', { ascending: true })
            .maybeSingle();

          if (equipmentError) {
            console.error('⚠️ [ContractDataEdit] Erro ao buscar equipamento (initialData):', equipmentError);
          } else if (equipment) {
            setEquipmentRecord(equipment);
            setContractData(prev => prev ? {
              ...prev,
              equipment_type: equipment.type || prev.equipment_type || '',
              equipment_model: equipment.model || prev.equipment_model || '',
              equipment_brand: equipment.manufacturer || prev.equipment_brand || '',
              equipment_serial: equipment.serial_number || prev.equipment_serial || '',
              equipment_power: equipment.power || prev.equipment_power || '',
              equipment_voltage: equipment.voltage || prev.equipment_voltage || '',
              equipment_location: equipment.location || prev.equipment_location || '',
              equipment_year: equipment.year || prev.equipment_year || '',
              equipment_condition: equipment.condition || prev.equipment_condition || ''
            } : prev);
            setEditedData(prev => prev ? {
              ...prev,
              equipment_type: equipment.type || prev.equipment_type || '',
              equipment_model: equipment.model || prev.equipment_model || '',
              equipment_brand: equipment.manufacturer || prev.equipment_brand || '',
              equipment_serial: equipment.serial_number || prev.equipment_serial || '',
              equipment_power: equipment.power || prev.equipment_power || '',
              equipment_voltage: equipment.voltage || prev.equipment_voltage || '',
              equipment_location: equipment.location || prev.equipment_location || '',
              equipment_year: equipment.year || prev.equipment_year || '',
              equipment_condition: equipment.condition || prev.equipment_condition || ''
            } : prev);
          }
        } catch (error) {
          console.error('❌ [ContractDataEdit] Falha ao buscar equipamento (initialData):', error);
        }
      })();
    } else if (contractData) {
      // 🔧 FIX: If we already have contractData, don't override it with stale initialData
      console.log('📋 [ContractDataEdit] Já temos contractData carregado, não sobrescrevendo com initialData');
    } else {
      console.log('🔄 [ContractDataEdit] Carregando dados da API...');
      loadContractData();
    }
  }, [contractId, initialData, loadContractData]);

  // Manter o campo de "novo serviço" sempre vazio ao entrar em edição.
  // O usuário adiciona novos itens sem pré-popular com a lista existente.
  useEffect(() => {
    if (isEditing) {
      setServicesInput('');
    }
  }, [isEditing]);

  // Carregar documento original do contrato
  useEffect(() => {
    const fetchOriginalDoc = async () => {
      if (!contractId) return;

      setLoadingDoc(true);
      try {
        // Buscar documento com metadata.category = 'original'
        const { data, error } = await supabase
          .from('contract_documents')
          .select('*')
          .eq('contract_id', contractId);

        if (error) {
          console.error('Erro ao buscar documento original:', error);
        } else if (data && data.length > 0) {
          // Filtrar pelo metadata.category = 'original' ou 'contrato_original' (retrocompatibilidade)
          const originalDoc = data.find(doc =>
            doc.metadata?.category === 'original' ||
            doc.metadata?.category === 'contrato_original' ||
            doc.description?.includes('original')
          );

          if (originalDoc) {
            console.log('✅ Documento original encontrado:', originalDoc);
            setOriginalDocument(originalDoc);
          } else {
            console.log('⚠️ Nenhum documento original encontrado');
            console.log('📄 Documentos disponíveis:', data);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar documento:', err);
      } finally {
        setLoadingDoc(false);
      }
    };

    fetchOriginalDoc();
  }, [contractId]);

  const handlePreviewPDF = async (doc: ContractDocument | OriginalDocument) => {
    try {
      console.log('📄 [PREVIEW] Documento completo recebido:', JSON.stringify(doc, null, 2));

      // Tentar encontrar o file_path - pode estar em diferentes campos
      let filePath = doc.file_path || doc.storage_path;

      console.log('🔍 [PREVIEW] file_path inicial:', filePath);
      console.log('📋 [PREVIEW] file_name do documento:', doc.file_name);

      if (!filePath) {
        console.error('❌ file_path não encontrado no documento:', doc);

        // Tentar buscar o documento correto no storage
        // O documento pode ter sido salvo mas o registro no banco está incompleto
        const { data: storageFiles } = await supabase.storage
          .from('contract-documents')
          .list(`contracts/temp/`, {
            limit: 100
          });

        console.log('📂 Arquivos encontrados no storage:', storageFiles);

        if (storageFiles && storageFiles.length > 0) {
          // Procurar arquivo que contenha parte do nome do contrato
          const searchTerm = doc.file_name || doc.document_name || '';
          const pdfFile = storageFiles.find(f =>
            f.name.endsWith('.pdf') &&
            (searchTerm ? f.name.includes(searchTerm.split('.')[0]) : true)
          );

          if (pdfFile) {
            const foundPath = `contracts/temp/${pdfFile.name}`;
            console.log('✅ Encontrado PDF no storage:', foundPath);

            const { data } = supabase.storage
              .from('contract-documents')
              .getPublicUrl(foundPath);

            setPreviewPDFUrl(data.publicUrl);
            setPreviewDocumentName(doc.file_name || doc.document_name || pdfFile.name);
            setIsPDFPreviewOpen(true);
            return;
          }
        }

        toast({
          title: "Arquivo não encontrado",
          description: "O caminho do arquivo não foi encontrado no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se o filePath já tem o prefixo correto
      // Se não tiver, adicionar
      console.log('🔍 [PREVIEW] Verificando se começa com contracts/:', filePath.startsWith('contracts/'));
      if (!filePath.startsWith('contracts/')) {
        // Pode ser apenas o nome do arquivo
        const oldPath = filePath;
        filePath = `contracts/temp/${filePath}`;
        console.log('🔧 [PREVIEW] Corrigido file_path de:', oldPath, 'para:', filePath);
      } else {
        console.log('✅ [PREVIEW] file_path já está correto:', filePath);
      }

      console.log('📤 [PREVIEW] Gerando URL pública para:', filePath);
      const { data } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(filePath);

      console.log('🔗 [PREVIEW] URL pública gerada:', data.publicUrl);

      setPreviewPDFUrl(data.publicUrl);
      setPreviewDocumentName(doc.file_name || doc.document_name || doc.name || 'Documento Original');
      setIsPDFPreviewOpen(true);
    } catch (error) {
      console.error('❌ Erro ao abrir preview:', error);
      toast({
        title: "Erro ao abrir preview",
        description: "Não foi possível carregar o documento.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = async (doc: ContractDocument | OriginalDocument) => {
    try {
      console.log('⬇️ Iniciando download do documento:', doc);

      // Tentar encontrar o file_path - pode estar em diferentes campos
      let filePath = doc.file_path || doc.storage_path;

      console.log('🔍 file_path encontrado para download:', filePath);

      if (!filePath) {
        console.error('❌ file_path não encontrado no documento:', doc);

        // Tentar buscar o documento correto no storage
        const { data: storageFiles } = await supabase.storage
          .from('contract-documents')
          .list(`contracts/temp/`, {
            limit: 100
          });

        if (storageFiles && storageFiles.length > 0) {
          const searchTerm = doc.file_name || doc.document_name || '';
          const pdfFile = storageFiles.find(f =>
            f.name.endsWith('.pdf') &&
            (searchTerm ? f.name.includes(searchTerm.split('.')[0]) : true)
          );

          if (pdfFile) {
            const foundPath = `contracts/temp/${pdfFile.name}`;
            console.log('✅ Encontrado PDF no storage:', foundPath);

            const { data, error } = await supabase.storage
              .from('contract-documents')
              .download(foundPath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.file_name || doc.document_name || pdfFile.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
              title: "Download iniciado",
              description: "O documento está sendo baixado."
            });
            return;
          }
        }

        toast({
          title: "Arquivo não encontrado",
          description: "O caminho do arquivo não foi encontrado.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se o filePath já tem o prefixo correto
      if (!filePath.startsWith('contracts/')) {
        filePath = `contracts/temp/${filePath}`;
        console.log('🔧 Corrigido file_path para download:', filePath);
      }

      const { data, error } = await supabase.storage
        .from('contract-documents')
        .download(filePath);

      if (error) {
        console.error('❌ Erro no download:', error);
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || doc.document_name || doc.name || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O documento está sendo baixado."
      });
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = () => {
    console.log('🔧 [ContractDataEdit] Entrando em modo de edição');
    console.log('📋 [ContractDataEdit] Dados do contrato antes de editar:', contractData);

    // Inicializar editedData com TODOS os dados atuais do contractData
    if (contractData) {
      setEditedData({
        ...contractData,

        // 🔧 EXPLICIT MAPPING: Contract basic fields
        contract_number: contractData.contract_number || '',
        status: contractData.status || 'active',
        contract_type: contractData.contract_type || 'maintenance',
        value: contractData.value || 0,

        // 🔧 EXPLICIT MAPPING: Client address fields
        client_zip_code: contractData.client_zip_code || '',
        client_address: contractData.client_address || '',
        client_neighborhood: contractData.client_neighborhood || '',
        client_number: contractData.client_number || '',
        client_city: contractData.client_city || '',
        client_state: contractData.client_state || '',

        // 🔧 EXPLICIT MAPPING: Equipment fields
        equipment_type: contractData.equipment_type || '',
        equipment_model: contractData.equipment_model || '',
        equipment_brand: contractData.equipment_brand || '',
        equipment_serial: contractData.equipment_serial || '',
        equipment_power: contractData.equipment_power || '',
        equipment_voltage: contractData.equipment_voltage || '',
        equipment_location: contractData.equipment_location || '',
        equipment_year: contractData.equipment_year || '',
        equipment_condition: contractData.equipment_condition || '',

        // 🔧 EXPLICIT MAPPING: Commercial fields
        payment_terms: contractData.payment_terms || '',
        technical_notes: contractData.technical_notes || '',
        special_conditions: contractData.special_conditions || '',
        warranty_terms: contractData.warranty_terms || ''
      });

      console.log('✅ [ContractDataEdit] editedData inicializado:', {
        equipment_serial: contractData.equipment_serial,
        equipment_brand: contractData.equipment_brand,
        equipment_power: contractData.equipment_power,
        payment_terms: contractData.payment_terms,
        technical_notes: contractData.technical_notes,
        special_conditions: contractData.special_conditions,
        warranty_terms: contractData.warranty_terms
      });
    }

    setIsEditing(true);
  };

  const sanitizeString = (raw?: string | null) => {
    if (raw === undefined || raw === null) {
      return null;
    }
    const trimmed = raw.toString().trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const pickClientDisplayName = (data: ExtendedContract) => {
    return sanitizeString(data.client_name) ?? sanitizeString(data.client_legal_name);
  };

  const parseNumericField = (value?: unknown, fallback: number | null = null) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/\./g, '').replace(',', '.');
      const parsed = Number.parseFloat(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return fallback;
  };

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleAddService = () => {
    const trimmed = newServiceInput.trim();
    if (!trimmed) return;

    const currentServices = Array.isArray(editedData.services) ? editedData.services : [];
    setEditedData(prev => ({
      ...prev,
      services: [...currentServices, trimmed]
    }));
    setNewServiceInput('');
  };

  const handleRemoveService = (index: number) => {
    const currentServices = Array.isArray(editedData.services) ? editedData.services : [];
    setEditedData(prev => ({
      ...prev,
      services: currentServices.filter((_, i) => i !== index)
    }));
  };

  const handleStartEditService = (index: number, currentText: string) => {
    setEditingServiceIndex(index);
    setEditingServiceText(currentText);
  };

  const handleSaveEditService = () => {
    if (editingServiceIndex === null) return;
    const trimmed = editingServiceText.trim();
    if (!trimmed) return;

    const currentServices = Array.isArray(editedData.services) ? editedData.services : [];
    const updatedServices = [...currentServices];
    updatedServices[editingServiceIndex] = trimmed;

    setEditedData(prev => ({
      ...prev,
      services: updatedServices
    }));
    setEditingServiceIndex(null);
    setEditingServiceText('');
  };

  const handleCancelEditService = () => {
    setEditingServiceIndex(null);
    setEditingServiceText('');
  };

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Valida CNPJ brasileiro
   * Aceita formatos: 00.000.000/0001-00 ou 00000000000100
   */
  const validateCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return true; // Campo opcional

    // Remove caracteres especiais
    const cleaned = cnpj.replace(/[^\d]/g, '');

    // CNPJ deve ter exatamente 14 dígitos
    if (cleaned.length !== 14) return false;

    // Verifica se todos os dígitos são iguais (CNPJ inválido)
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validação dos dígitos verificadores
    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned.charAt(i)) * pos;
      pos = pos === 2 ? 9 : pos - 1;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(cleaned.charAt(12))) return false;

    sum = 0;
    pos = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned.charAt(i)) * pos;
      pos = pos === 2 ? 9 : pos - 1;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(cleaned.charAt(13))) return false;

    return true;
  };

  /**
   * Valida telefone brasileiro
   * Aceita formatos: (11) 99999-9999, (11) 9999-9999, 11999999999, etc.
   */
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Campo opcional

    // Remove caracteres especiais
    const cleaned = phone.replace(/[^\d]/g, '');

    // Telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular com 9)
    if (cleaned.length < 10 || cleaned.length > 11) return false;

    // Validar DDD (deve estar entre 11 e 99)
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    return true;
  };

  /**
   * Valida CEP brasileiro
   * Aceita formatos: 12345-678 ou 12345678
   */
  const validateCEP = (cep: string): boolean => {
    if (!cep) return true; // Campo opcional

    // Remove caracteres especiais
    const cleaned = cep.replace(/[^\d]/g, '');

    // CEP deve ter exatamente 8 dígitos
    if (cleaned.length !== 8) return false;

    // Verifica se não é um CEP inválido (todos os dígitos iguais)
    if (/^(\d)\1+$/.test(cleaned)) return false;

    return true;
  };

  /**
   * Valida email
   */
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Campo opcional

    // Regex simples mas eficaz para validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Valida datas
   * Verifica se as datas são válidas e se start_date <= end_date
   */
  const validateDates = (startDate?: string, endDate?: string): { valid: boolean; error?: string } => {
    // Ambas as datas são opcionais
    if (!startDate && !endDate) return { valid: true };

    // Se apenas uma data está preenchida, é válido
    if (!startDate || !endDate) return { valid: true };

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Verifica se as datas são válidas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Datas inválidas' };
      }

      // Verifica se start_date <= end_date
      if (start > end) {
        return { valid: false, error: 'A data de início não pode ser posterior à data de término' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Erro ao validar datas' };
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      console.log('💾 [ContractDataEdit] Salvando dados editados...');
      console.log('📊 [ContractDataEdit] equipment_serial no editedData:', editedData.equipment_serial);

      // 🔍 DIAGNOSTIC: Log all edited data before sanitization
      console.log('🔍 [DIAGNOSTIC] editedData BEFORE sanitization:', {
        client_zip_code: editedData.client_zip_code,
        client_address: editedData.client_address,
        client_neighborhood: editedData.client_neighborhood,
        client_number: editedData.client_number,
        client_city: editedData.client_city,
        client_state: editedData.client_state,
        payment_terms: editedData.payment_terms,
        technical_notes: editedData.technical_notes,
        special_conditions: editedData.special_conditions,
        warranty_terms: editedData.warranty_terms
      });

      // ============================================
      // VALIDAÇÕES DE CAMPOS
      // ============================================

      // 1. Validar campos obrigatórios
      const normalizedClientName = pickClientDisplayName(editedData) ?? (contractData ? pickClientDisplayName(contractData) : null);

      if (!normalizedClientName) {
        toast({
          title: "Campo obrigatório",
          description: "Informe a razão social ou nome fantasia do cliente.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!editedData.contract_number?.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Informe o número do contrato.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // 2. Validar formato do CNPJ
      if (editedData.client_cnpj && !validateCNPJ(editedData.client_cnpj)) {
        toast({
          title: "CNPJ inválido",
          description: "O CNPJ informado não é válido. Formato esperado: 00.000.000/0001-00 (14 dígitos).",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // 3. Validar formato do telefone
      if (editedData.client_phone && !validatePhone(editedData.client_phone)) {
        toast({
          title: "Telefone inválido",
          description: "O telefone informado não é válido. Formato esperado: (11) 99999-9999 (10 ou 11 dígitos com DDD).",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // 4. Validar formato do CEP
      if (editedData.client_zip_code && !validateCEP(editedData.client_zip_code)) {
        toast({
          title: "CEP inválido",
          description: "O CEP informado não é válido. Formato esperado: 12345-678 (8 dígitos).",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // 5. Validar formato do email
      if (editedData.client_email && !validateEmail(editedData.client_email)) {
        toast({
          title: "Email inválido",
          description: "O email informado não é válido. Exemplo: usuario@empresa.com.br",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // 6. Validar datas (start_date e end_date)
      const dateValidation = validateDates(editedData.start_date, editedData.end_date);
      if (!dateValidation.valid) {
        toast({
          title: "Erro nas datas",
          description: dateValidation.error || "As datas do contrato são inválidas.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // ============================================
      // NORMALIZAÇÃO E PREPARAÇÃO DOS DADOS
      // ============================================

      const normalizeServices = () => {
        const rawServices = editedData.services;

        if (!rawServices) {
          // 🔧 FIX: Return empty array instead of null to preserve empty services list
          return [];
        }

        if (Array.isArray(rawServices)) {
          const cleaned = rawServices
            .map(service => typeof service === 'string' ? service.trim() : '')
            .filter(service => service.length > 0);
          // 🔧 FIX: Return empty array instead of null
          return cleaned.length > 0 ? cleaned : [];
        }

        if (typeof rawServices === 'string') {
          const trimmed = rawServices.trim();
          if (!trimmed) {
            // 🔧 FIX: Return empty array instead of null
            return [];
          }

          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              const cleaned = parsed
                .map(service => typeof service === 'string' ? service.trim() : '')
                .filter(service => service.length > 0);
              // 🔧 FIX: Return empty array instead of null
              return cleaned.length > 0 ? cleaned : [];
            }
          } catch {
            const split = trimmed.split('\n')
              .map(service => service.trim())
              .filter(service => service.length > 0);
            // 🔧 FIX: Return empty array instead of null
            return split.length > 0 ? split : [];
          }

          // 🔧 FIX: Return empty array instead of null
          return [];
        }

        // 🔧 FIX: Return empty array instead of null
        return [];
      };

      const sanitizeTextBlock = (value?: string | null) => sanitizeString(value);
      const normalizedServices = normalizeServices();

      const contractValue = parseNumericField(editedData.value, contractData?.value ?? 0) ?? 0;
      const startDate = sanitizeString(editedData.start_date) ?? sanitizeString(contractData?.start_date);
      const endDate = sanitizeString(editedData.end_date) ?? sanitizeString(contractData?.end_date);
      const contractStatus = editedData.status || contractData?.status || 'active';
      const contractKind = editedData.contract_type || contractData?.contract_type || 'maintenance';
      const maintenanceFrequency = editedData.maintenance_frequency || contractData?.maintenance_frequency || 'monthly';

      const updateData = {
        contract_number: editedData.contract_number,
        client_name: normalizedClientName,
        client_legal_name: sanitizeString(editedData.client_legal_name),
        client_cnpj: sanitizeString(editedData.client_cnpj),
        client_email: sanitizeString(editedData.client_email),
        client_phone: sanitizeString(editedData.client_phone),
        // 🔧 FIX: Preserve address fields properly - don't sanitize to null
        client_address: editedData.client_address?.trim() || null,
        client_neighborhood: editedData.client_neighborhood?.trim() || null,
        client_number: editedData.client_number?.trim() || null,
        client_city: editedData.client_city?.trim() || null,
        client_state: editedData.client_state?.trim() || null,
        client_zip_code: editedData.client_zip_code?.trim() || null,
        client_contact_person: sanitizeString(editedData.client_contact_person),
        value: contractValue,
        // 🔧 FIX: CRITICAL - Include duration_months that was previously missing
        duration_months: parseNumericField(editedData.duration_months, contractData?.duration_months ?? 0) || null,
        // 🔧 FIX: CRITICAL - Include monthly_value that was previously missing
        monthly_value: parseNumericField(editedData.monthly_value, contractData?.monthly_value ?? 0) || null,
        start_date: startDate,
        end_date: endDate,
        status: contractStatus,
        contract_type: contractKind,
        // 🔧 FIX: Equipment fields are NO LONGER stored in contracts table
        // Equipment is now managed exclusively via the dedicated equipment table
        // This eliminates duplication and ensures single source of truth
        maintenance_frequency: maintenanceFrequency,
        services: normalizedServices,
        description: sanitizeTextBlock(editedData.description),
        // 🔧 FIX: Preserve commercial information fields properly - don't sanitize to null
        payment_terms: editedData.payment_terms?.trim() || null,
        technical_notes: editedData.technical_notes?.trim() || null,
        special_conditions: editedData.special_conditions?.trim() || null,
        warranty_terms: editedData.warranty_terms?.trim() || null,
        updated_at: new Date().toISOString()
      };
      
      // 🔍 DIAGNOSTIC: Log updateData after sanitization
      console.log('🔍 [DIAGNOSTIC] updateData AFTER sanitization:', {
        duration_months: updateData.duration_months,
        monthly_value: updateData.monthly_value,
        services: updateData.services,
        client_zip_code: updateData.client_zip_code,
        client_address: updateData.client_address,
        client_neighborhood: updateData.client_neighborhood,
        client_number: updateData.client_number,
        client_city: updateData.client_city,
        client_state: updateData.client_state,
        payment_terms: updateData.payment_terms,
        technical_notes: updateData.technical_notes,
        special_conditions: updateData.special_conditions,
        warranty_terms: updateData.warranty_terms,
        description: updateData.description
      });

      if (contractData?.client_id) {
        const clientUpdateData = {
          name: normalizedClientName,
          cnpj: sanitizeString(editedData.client_cnpj),
          email: sanitizeString(editedData.client_email),
          phone: sanitizeString(editedData.client_phone),
          // 🔧 FIX: Remove ?? undefined pattern - use direct values
          address: editedData.client_address?.trim() || null,
          neighborhood: editedData.client_neighborhood?.trim() || null,
          number: editedData.client_number?.trim() || null,
          city: editedData.client_city?.trim() || null,
          state: editedData.client_state?.trim() || null,
          zip_code: editedData.client_zip_code?.trim() || null,
          contact_person: sanitizeString(editedData.client_contact_person),
          updated_at: new Date().toISOString()
        };
        
        // 🔍 DIAGNOSTIC: Log client update data
        console.log('🔍 [DIAGNOSTIC] clientUpdateData:', {
          address: clientUpdateData.address,
          neighborhood: clientUpdateData.neighborhood,
          number: clientUpdateData.number,
          city: clientUpdateData.city,
          state: clientUpdateData.state,
          zip_code: clientUpdateData.zip_code
        });

        console.log('Atualizando cliente:', contractData.client_id, clientUpdateData);

        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update(clientUpdateData)
          .eq('id', contractData.client_id);
        
        if (clientUpdateError) {
          console.error('Erro ao atualizar cliente:', clientUpdateError);
        }
      }

      const { data: updatedContract, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId)
        .select('*')
        .single();

      if (error) throw error;

      // 🔍 DIAGNOSTIC: Log what Supabase returned
      console.log('🔍 [DIAGNOSTIC] updatedContract from Supabase:', {
        client_zip_code: updatedContract?.client_zip_code,
        client_address: updatedContract?.client_address,
        client_neighborhood: updatedContract?.client_neighborhood,
        client_number: updatedContract?.client_number,
        client_city: updatedContract?.client_city,
        client_state: updatedContract?.client_state,
        payment_terms: updatedContract?.payment_terms,
        technical_notes: updatedContract?.technical_notes,
        special_conditions: updatedContract?.special_conditions,
        warranty_terms: updatedContract?.warranty_terms
      });

      if (updatedContract) {
        // Garantir que os dados salvos sejam refletidos corretamente
        const mergedData = {
          ...contractData,
          ...updatedContract,
          // Explicitamente garantir que todos os campos sejam salvos
          // 🔧 FIX: Include duration_months and monthly_value in merge
          duration_months: updatedContract.duration_months ?? editedData.duration_months,
          monthly_value: updatedContract.monthly_value ?? editedData.monthly_value,
          // 🔧 FIX: Include services array properly
          services: updatedContract.services ?? editedData.services,
          client_zip_code: updatedContract.client_zip_code ?? editedData.client_zip_code,
          client_neighborhood: updatedContract.client_neighborhood ?? editedData.client_neighborhood,
          client_number: updatedContract.client_number ?? editedData.client_number,
          client_state: updatedContract.client_state ?? editedData.client_state,
          client_city: updatedContract.client_city ?? editedData.client_city,
          client_address: updatedContract.client_address ?? editedData.client_address,
          payment_terms: updatedContract.payment_terms ?? editedData.payment_terms,
          technical_notes: updatedContract.technical_notes ?? editedData.technical_notes,
          special_conditions: updatedContract.special_conditions ?? editedData.special_conditions,
          warranty_terms: updatedContract.warranty_terms ?? editedData.warranty_terms,
          description: updatedContract.description ?? editedData.description
        };
        
        // 🔍 DIAGNOSTIC: Log final merged data
        console.log('🔍 [DIAGNOSTIC] mergedData after merge:', {
          duration_months: mergedData.duration_months,
          monthly_value: mergedData.monthly_value,
          services: mergedData.services,
          client_zip_code: mergedData.client_zip_code,
          client_address: mergedData.client_address,
          client_neighborhood: mergedData.client_neighborhood,
          client_number: mergedData.client_number,
          client_city: mergedData.client_city,
          client_state: mergedData.client_state,
          payment_terms: mergedData.payment_terms,
          technical_notes: mergedData.technical_notes,
          special_conditions: mergedData.special_conditions,
          warranty_terms: mergedData.warranty_terms,
          description: mergedData.description
        });
        
        console.log('💾 [ContractDataEdit] Dados salvos e mergeados:', mergedData);
        setContractData(mergedData);
        setEditedData(mergedData as ExtendedContract);
      }

      const sanitizeEquipmentField = (value?: string | null) => {
        if (value === null || value === undefined) return null;
        const trimmed = value.toString().trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const equipmentPayload = {
        type: sanitizeEquipmentField(editedData.equipment_type),
        model: sanitizeEquipmentField(editedData.equipment_model),
        manufacturer: sanitizeEquipmentField(editedData.equipment_brand),
        serial_number: sanitizeEquipmentField(editedData.equipment_serial),
        location: sanitizeEquipmentField(editedData.equipment_location),
        year: sanitizeEquipmentField(editedData.equipment_year),
        condition: sanitizeEquipmentField(editedData.equipment_condition),
        power: sanitizeEquipmentField(editedData.equipment_power),
        voltage: sanitizeEquipmentField(editedData.equipment_voltage)
      };

      const hasEquipmentValues = Object.values(equipmentPayload).some(value => value !== null);

      if (equipmentRecord?.id) {
        const { data: updatedEquipment, error: equipmentUpdateError } = await supabase
          .from('equipment')
          .update({
            ...equipmentPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', equipmentRecord.id)
          .select()
          .maybeSingle();

        if (equipmentUpdateError) {
          console.error('Erro ao atualizar equipamento dedicado:', equipmentUpdateError);
        } else if (updatedEquipment) {
          setEquipmentRecord(updatedEquipment);
        }
      } else if (hasEquipmentValues) {
        const equipmentInsertPayload = {
          contract_id: contractId,
          user_id: contractData?.user_id || null,
          quantity: 1,
          observations: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...equipmentPayload
        };

        const { data: newEquipment, error: equipmentInsertError } = await supabase
          .from('equipment')
          .insert(equipmentInsertPayload)
          .select()
          .maybeSingle();

        if (equipmentInsertError) {
          console.error('Erro ao criar equipamento dedicado:', equipmentInsertError);
        } else if (newEquipment) {
          setEquipmentRecord(newEquipment);
        }
      }

      setIsEditing(false);

      await loadContractData();

      toast({
        title: "Dados salvos!",
        description: "As informações do contrato foram atualizadas com sucesso",
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving contract data:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    setEditedData(contractData);
    setIsEditing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string | null | undefined): string => {
    const formatted = toBRDateString(date);
    return formatted || 'Não definido';
  };

  if (loading && !contractData) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  // Loading skeleton
  if (loading && !contractData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum dado encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Dados do Contrato
        </h2>
        {!isEditing ? (
          <Button onClick={handleEdit} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Editor Unificado durante edição */}
      {isEditing ? (
        <>
          <ContractEditor
            mode="edit"
            value={{
              contract_number: editedData.contract_number,
              value: editedData.value,
              monthly_value: editedData.monthly_value,
              duration_months: editedData.duration_months,
              start_date: editedData.start_date,
              end_date: editedData.end_date,
              contract_type: editedData.contract_type,
              client_name: pickClientDisplayName(editedData) || editedData.client_name,
              client_legal_name: editedData.client_legal_name,
              client_cnpj: editedData.client_cnpj,
              client_email: editedData.client_email,
              client_phone: editedData.client_phone,
              client_address: editedData.client_address,
              client_neighborhood: editedData.client_neighborhood,
              client_number: editedData.client_number,
              client_city: editedData.client_city,
              client_state: editedData.client_state,
              client_zip_code: editedData.client_zip_code,
              client_contact_person: editedData.client_contact_person,
              equipment_type: editedData.equipment_type,
              equipment_model: editedData.equipment_model,
              equipment_brand: editedData.equipment_brand,
              equipment_serial: editedData.equipment_serial,
              equipment_power: editedData.equipment_power,
              equipment_voltage: editedData.equipment_voltage,
              equipment_year: editedData.equipment_year,
              equipment_condition: editedData.equipment_condition,
              equipment_location: editedData.equipment_location,
              observations: editedData.description,
              payment_terms: editedData.payment_terms,
              technical_notes: editedData.technical_notes,
              special_conditions: editedData.special_conditions,
              warranty_terms: editedData.warranty_terms,
              services: Array.isArray(editedData.services) ? editedData.services : []
            }}
            onChange={(patch) => {
              // 🔧 FIX: Map 'observations' field from ContractEditor back to 'description' in state
              // ContractEditor uses 'observations' as the field name, but editedData uses 'description'
              const mapped = { ...patch };
              if ('observations' in mapped && !('description' in mapped)) {
                mapped.description = mapped.observations;
                delete (mapped as any).observations;
                console.log('🔧 [ContractDataEdit] Observações mapeadas para description:', { novo_valor: mapped.description });
              }
              setEditedData(prev => ({ ...prev, ...mapped }));
            }}
            servicesInput={servicesInput}
            onServicesInputChange={setServicesInput}
            onAddService={(text) => {
              // 🔧 FIX: Read from prev state, not editedData (avoids race condition)
              setEditedData(prev => {
                const current = Array.isArray(prev.services) ? prev.services : [];
                const updated = [...current, text];
                console.log('✅ [ContractDataEdit] Serviço adicionado:', { novo: text, lista_completa: updated });
                return { ...prev, services: updated };
              });
              setServicesInput('');
            }}
            onRemoveService={(index) => {
              // 🔧 FIX: Read from prev state, not editedData (avoids race condition)
              setEditedData(prev => {
                const current = Array.isArray(prev.services) ? prev.services : [];
                const updated = current.filter((_, i) => i !== index);
                console.log('✅ [ContractDataEdit] Serviço removido:', { indice: index, lista_completa: updated });
                return { ...prev, services: updated };
              });
            }}
          />
        </>
      ) : (
        <>
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Número do Contrato</Label>
            {isEditing ? (
              <Input
                value={editedData.contract_number || ''}
                onChange={(e) => setEditedData({...editedData, contract_number: e.target.value})}
                placeholder="CONT-2025-001"
              />
            ) : (
              <p className="font-medium">{contractData.contract_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            {isEditing ? (
              <Select 
                value={editedData.status || 'active'} 
                onValueChange={(value) => setEditedData({...editedData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="renewal">Em Renovação</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${contractData.status === 'active' ? 'bg-green-100 text-green-800' : 
                    contractData.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    contractData.status === 'expired' ? 'bg-red-100 text-red-800' :
                    contractData.status === 'renewal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'}`}>
                  {contractData.status === 'active' ? 'Ativo' :
                   contractData.status === 'inactive' ? 'Inativo' :
                   contractData.status === 'expired' ? 'Expirado' :
                   contractData.status === 'renewal' ? 'Em Renovação' :
                   'Rascunho'}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            {isEditing ? (
              <Select 
                value={editedData.contract_type || 'maintenance'} 
                onValueChange={(value) => setEditedData({...editedData, contract_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="rental">Locação</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium">
                {contractData.contract_type === 'maintenance' ? 'Manutenção' :
                 contractData.contract_type === 'rental' ? 'Locação' :
                 'Híbrido'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Valor do Contrato</Label>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={editedData.value || ''}
                onChange={(e) => setEditedData({...editedData, value: e.target.value})}
                placeholder="0.00"
              />
            ) : (
              <p className="font-medium text-lg text-green-600">
                {formatCurrency(contractData.value)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Razão Social</Label>
            {isEditing ? (
              <Input
                value={editedData.client_legal_name || ''}
                onChange={(e) => setEditedData({...editedData, client_legal_name: e.target.value})}
                placeholder="Razão social completa"
              />
            ) : (
              <p className="font-medium">{contractData.client_legal_name || 'Não informado'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>CNPJ</Label>
            {isEditing ? (
              <Input
                value={editedData.client_cnpj || ''}
                onChange={(e) => setEditedData({...editedData, client_cnpj: e.target.value})}
                placeholder="00.000.000/0001-00"
              />
            ) : (
              <p className="font-medium">{contractData.client_cnpj || 'Não informado'}</p>
            )}
          </div>

          <div className="space-y-2">
            {isEditing ? (
              <AddressFormWithCep
                cep={editedData.client_zip_code || ''}
                address={editedData.client_address || ''}
                neighborhood={editedData.client_neighborhood || ''}
                number={editedData.client_number || ''}
                city={editedData.client_city || ''}
                state={editedData.client_state || ''}
                onCepChange={handleCepChange}
                onAddressChange={handleAddressChange}
                onNeighborhoodChange={handleNeighborhoodChange}
                onNumberChange={handleNumberChange}
                onCityChange={handleCityChange}
                onStateChange={handleStateChange}
                showLabels={true}
                required={false}
              />
            ) : (
              <div className="space-y-2">
                <div>
                  <Label>Logradouro</Label>
                  <p className="font-medium">{contractData.client_address || 'Não informado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bairro</Label>
                    <p className="font-medium">{contractData.client_neighborhood || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label>Número</Label>
                    <p className="font-medium">{contractData.client_number || 'Não informado'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cidade</Label>
                    <p className="font-medium">{contractData.client_city || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <p className="font-medium">{contractData.client_state || 'Não informado'}</p>
                  </div>
                </div>
                {contractData.client_zip_code && (
                  <div>
                    <Label>CEP</Label>
                    <p className="font-medium">{contractData.client_zip_code}</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Responsável pelo Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Responsável pelo Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            {isEditing ? (
              <Input
                type="email"
                value={editedData.client_email || ''}
                onChange={(e) => setEditedData({...editedData, client_email: e.target.value})}
                placeholder="email@empresa.com"
              />
            ) : (
              <p className="font-medium">{contractData.client_email || 'Não informado'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            {isEditing ? (
              <Input
                value={editedData.client_phone || ''}
                onChange={(e) => setEditedData({...editedData, client_phone: e.target.value})}
                placeholder="(00) 0000-0000"
              />
            ) : (
              <p className="font-medium">{contractData.client_phone || 'Não informado'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Período do Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Início</Label>
            {isEditing ? (
              <DatePicker
                value={editedData.start_date || ''}
                onChangeString={(date) => setEditedData({...editedData, start_date: date})}
                allowWeekends={true}
                placeholder="Selecione a data de início"
              />
            ) : (
              <p className="font-medium">{formatDate(contractData.start_date)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data de Término</Label>
            {isEditing ? (
              <DatePicker
                value={editedData.end_date || ''}
                onChangeString={(date) => setEditedData({...editedData, end_date: date})}
                allowWeekends={true}
                placeholder="Selecione a data de término"
              />
            ) : (
              <p className="font-medium">{formatDate(contractData.end_date)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Frequência de Manutenção</Label>
            {isEditing ? (
              <Select 
                value={editedData.maintenance_frequency || 'monthly'} 
                onValueChange={(value) => setEditedData({...editedData, maintenance_frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium">
                {contractData.maintenance_frequency === 'weekly' ? 'Semanal' :
                 contractData.maintenance_frequency === 'biweekly' ? 'Quinzenal' :
                 contractData.maintenance_frequency === 'monthly' ? 'Mensal' :
                 contractData.maintenance_frequency === 'quarterly' ? 'Trimestral' :
                 contractData.maintenance_frequency === 'semiannual' ? 'Semestral' :
                 contractData.maintenance_frequency === 'annual' ? 'Anual' :
                 'Mensal'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações do Equipamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Informações do Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Equipamento</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_type || ''}
                onChange={(e) => setEditedData({...editedData, equipment_type: e.target.value})}
                placeholder="Ex: Gerador"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_type || 'Não informado'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_model || ''}
                onChange={(e) => setEditedData({...editedData, equipment_model: e.target.value})}
                placeholder="Ex: GMG 150"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_model || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Marca</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_brand || ''}
                onChange={(e) => setEditedData({...editedData, equipment_brand: e.target.value})}
                placeholder="Ex: Cummins"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_brand || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Número de Série</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_serial || ''}
                onChange={(e) => setEditedData({...editedData, equipment_serial: e.target.value})}
                placeholder="Ex: SN2024BR789456"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_serial || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Potência</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_power || ''}
                onChange={(e) => setEditedData({...editedData, equipment_power: e.target.value})}
                placeholder="Ex: 150 kVA"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_power || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Tensão</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_voltage || ''}
                onChange={(e) => setEditedData({...editedData, equipment_voltage: e.target.value})}
                placeholder="Ex: 380V"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_voltage || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Ano</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_year || ''}
                onChange={(e) => setEditedData({...editedData, equipment_year: e.target.value})}
                placeholder="Ex: 2024"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_year || 'Não informado'}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Condição</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_condition || ''}
                onChange={(e) => setEditedData({...editedData, equipment_condition: e.target.value})}
                placeholder="Ex: Novo, Usado, Seminovo"
              />
            ) : (
              <p className="font-medium">{contractData.equipment_condition || 'Não informado'}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Localização</Label>
            {isEditing ? (
              <Input
                value={editedData.equipment_location || ''}
                onChange={(e) => setEditedData({...editedData, equipment_location: e.target.value})}
                placeholder="Endereço onde o equipamento está instalado"
              />
            ) : (
              <p className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {contractData.equipment_location || 'Não informado'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Serviços Inclusos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isEditing ? (
              <>
                {/* Lista de serviços existentes */}
                <div className="space-y-2">
                  {Array.isArray(editedData.services) && editedData.services.length > 0 ? (
                    editedData.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
                        {editingServiceIndex === index ? (
                          <>
                            <Input
                              value={editingServiceText}
                              onChange={(e) => setEditingServiceText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditService();
                                } else if (e.key === 'Escape') {
                                  handleCancelEditService();
                                }
                              }}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveEditService}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEditService}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="flex-1">{service}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditService(index, service)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveService(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum serviço adicionado ainda</p>
                  )}
                </div>

                {/* Campo para adicionar novo serviço */}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    value={newServiceInput}
                    onChange={(e) => setNewServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    placeholder="Digite um novo serviço e pressione Enter ou clique em Adicionar"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddService}
                    disabled={!newServiceInput.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Parse services - pode vir como string JSON ou array
                  let servicesList = [];

                  console.log('🔍 [SERVICES DEBUG] contractData.services:', contractData.services);
                  console.log('🔍 [SERVICES DEBUG] tipo:', typeof contractData.services);

                  if (typeof contractData.services === 'string' && contractData.services.trim()) {
                    console.log('🔍 [SERVICES DEBUG] É string, tentando parse...');
                    try {
                      servicesList = JSON.parse(contractData.services);
                      console.log('✅ [SERVICES DEBUG] Parse bem-sucedido:', servicesList);
                    } catch (e) {
                      console.log('⚠️ [SERVICES DEBUG] Falha no parse, tratando como texto:', e);
                      // Se não for JSON, tratar como lista separada por quebra de linha
                      servicesList = contractData.services.split('\n').filter(s => s.trim());
                    }
                  } else if (Array.isArray(contractData.services)) {
                    console.log('🔍 [SERVICES DEBUG] Já é array:', contractData.services);
                    servicesList = contractData.services;
                  } else {
                    console.log('⚠️ [SERVICES DEBUG] Tipo não reconhecido ou vazio');
                  }

                  console.log('📋 [SERVICES DEBUG] servicesList final:', servicesList);

                  if (servicesList.length > 0) {
                    return servicesList.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>
                          {typeof service === 'string'
                            ? service
                            : service.description || service.name || service.type || JSON.stringify(service)
                          }
                        </span>
                      </div>
                    ));
                  }

                  return <p className="text-muted-foreground">Nenhum serviço especificado</p>;
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Comerciais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Comerciais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Termos de Pagamento</Label>
              {isEditing ? (
                <AutoResizeTextarea
                  value={editedData.payment_terms || ''}
                  onChange={(e) => setEditedData({ ...editedData, payment_terms: e.target.value })}
                  placeholder="Detalhe as condições de pagamento (ex: 30/60/90 dias, desconto, multa, etc.)"
                  className="whitespace-pre-wrap"
                  minHeight={100}
                  maxHeight={300}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-muted-foreground min-h-[100px]">
                  {contractData.payment_terms || 'Não informado'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas Técnicas</Label>
              {isEditing ? (
                <AutoResizeTextarea
                  value={editedData.technical_notes || ''}
                  onChange={(e) => setEditedData({ ...editedData, technical_notes: e.target.value })}
                  placeholder="Notas técnicas relevantes sobre o contrato ou equipamento"
                  className="whitespace-pre-wrap"
                  minHeight={100}
                  maxHeight={300}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-muted-foreground min-h-[100px]">
                  {contractData.technical_notes || 'Não informado'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Condições Especiais</Label>
              {isEditing ? (
                <AutoResizeTextarea
                  value={editedData.special_conditions || ''}
                  onChange={(e) => setEditedData({ ...editedData, special_conditions: e.target.value })}
                  placeholder="Regras adicionais, cláusulas específicas ou particularidades do contrato"
                  className="whitespace-pre-wrap"
                  minHeight={100}
                  maxHeight={300}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-muted-foreground min-h-[100px]">
                  {contractData.special_conditions || 'Não informado'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Termos de Garantia</Label>
              {isEditing ? (
                <AutoResizeTextarea
                  value={editedData.warranty_terms || ''}
                  onChange={(e) => setEditedData({ ...editedData, warranty_terms: e.target.value })}
                  placeholder="Cobertura de garantia, prazos e responsabilidades"
                  className="whitespace-pre-wrap"
                  minHeight={100}
                  maxHeight={300}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-muted-foreground min-h-[100px]">
                  {contractData.warranty_terms || 'Não informado'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isEditing ? (
              <AutoResizeTextarea
                value={editedData.description || ''}
                onChange={(e) => setEditedData({...editedData, description: e.target.value})}
                placeholder="Observações adicionais sobre o contrato..."
                className="whitespace-pre-wrap"
                minHeight={100}
                maxHeight={300}
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap break-words">
                {contractData.description || 'Sem observações'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}
      {/* Documento Original */}
      {!isEditing && originalDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento Original
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{originalDocument.file_name || originalDocument.name || 'Documento.pdf'}</p>
                  <p className="text-sm text-muted-foreground">
                    Enviado em {originalDocument.uploaded_at ? formatDate(originalDocument.uploaded_at) : 'Data não disponível'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPDF(originalDocument)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      {!isEditing && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Criado em:</span> {contractData.created_at ? formatDate(contractData.created_at) : 'Não definido'}
              </div>
              <div>
                <span className="font-medium">Última atualização:</span> {contractData.updated_at ? formatDate(contractData.updated_at) : contractData.created_at ? formatDate(contractData.created_at) : 'Não definido'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        isOpen={isPDFPreviewOpen}
        onClose={() => setIsPDFPreviewOpen(false)}
        pdfUrl={previewPDFUrl}
        documentName={previewDocumentName}
      />
    </div>
  );
};

export default ContractDataEdit;
