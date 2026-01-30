// Common types used throughout the application

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contract extends BaseEntity {
  contract_number?: string;
  client_id?: string;
  client_name?: string;
  company_name?: string;
  cnpj?: string;
  start_date?: string;
  end_date?: string;
  contract_value?: number;
  monthly_value?: number;
  status?: string;
  contract_type?: string;
  description?: string;
  payment_due_day?: number;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  notes?: string;
  file_url?: string;
  extracted_data?: Record<string, unknown>;
}

export interface Client extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  address?: string;
  neighborhood?: string;
  number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

export interface Maintenance extends BaseEntity {
  contract_id?: string;
  equipment_id?: string;
  equipment_name?: string;
  maintenance_type?: string;
  scheduled_date?: string;
  completed_date?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  description?: string;
  technician?: string;
  notes?: string;
  cost?: number;
  next_maintenance_date?: string;
}

export interface Document extends BaseEntity {
  contract_id?: string;
  document_type?: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  extracted_text?: string;
  metadata?: Record<string, unknown>;
}

export interface ContractDocument extends BaseEntity {
  contract_id: string;
  file_name?: string;
  file_path: string;
  file_size?: number;
  storage_path?: string;
  document_name?: string;
  document_type?: string;
  file_type?: string;
  metadata?: Record<string, unknown>;
}

export interface OriginalDocument extends BaseEntity {
  contract_id: string;
  file_name: string;
  file_url?: string;
  storage_path?: string;
  file_path?: string;
  extracted_text?: string;
  extracted_data?: Record<string, unknown>;
  document_type?: string;
  mime_type?: string;
}

export interface Service extends BaseEntity {
  contract_id?: string;
  service_name?: string;
  description?: string;
  frequency?: string;
  value?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  notes?: string;
}

export interface Equipment extends BaseEntity {
  contract_id?: string;
  name?: string;
  type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  type?: string;
  description?: string;
  resource?: unknown;
  allDay?: boolean;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    url?: string;
    path?: string;
    size?: number;
    type?: string;
  };
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

// Extended contract interface with additional properties used in components
export interface ExtendedContract extends Contract {
  value?: number; // Alias for contract_value
  // 🔧 FIX: Add missing critical fields
  duration_months?: number;
  observations?: string;
  equipment?: {
    type?: string;
    model?: string;
    brand?: string;
    serial_number?: string;
    power?: string;
    voltage?: string;
    location?: string;
    year?: string;
    condition?: string;
  };
  clients?: {
    phone?: string;
    contact_person?: string;
    emergency_contact?: string;
    name?: string;
    cnpj?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  client?: Client;
  maintenance_count?: number;
  operational_status?: 'on_schedule' | 'delayed' | 'pending';
  maintenance_frequency?: string;
  services?: string[];
  equipment_type?: string;
  equipment_model?: string;
  equipment_serial?: string;
  equipment_location?: string;
  equipment_power?: string;
  equipment_voltage?: string;
  equipment_brand?: string;
  equipment_year?: string;
  equipment_condition?: string;
  client_legal_name?: string;
  client_cnpj?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_neighborhood?: string;
  client_number?: string;
  client_city?: string;
  client_state?: string;
  client_zip_code?: string;
  client_contact_person?: string;
  technical_notes?: string;
  payment_terms?: string;
  special_conditions?: string;
  warranty_terms?: string;
}

// File context for chat features
export interface FileContext {
  file?: File;
  extractedText?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

// Contract context for chat with enriched data
export interface ContractChatContext extends ExtendedContract {
  extractedData?: Record<string, unknown>;
  fileContext?: FileContext;
}

// Agent-related types
export interface UploadedFile {
  name: string;
  type: string;
  content: string | ArrayBuffer;
  size?: number;
}

export interface ProcessedImage {
  fileName: string;
  analysis: string;
}

export interface ProcessedDocument {
  fileName: string;
  type: 'pdf' | 'text' | 'other';
  analysis: string;
}

export interface AgentAnalysis {
  hasContractContext: boolean;
  hasFiles: boolean;
  messageType: 'maintenance' | 'contract' | 'equipment' | 'report' | 'general';
  requiresSpecialization: boolean;
  processedImages?: ProcessedImage[];
  processedDocuments?: ProcessedDocument[];
  transcriptions?: string[];
}

export interface AgentState {
  message: string;
  files?: UploadedFile[];
  contractContext?: ExtendedContract | null;
  agentType: string;
  response?: string;
  analysis?: AgentAnalysis;
}

export interface AgentInvokeResult extends AgentState {
  response: string;
  timestamp?: string;
}

export interface SmartChatResponse {
  response: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface VisionProcessorResponse {
  success: boolean;
  analysis: string;
  confidence?: number;
}

export interface LangExtractResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface AudioTranscriptionResponse {
  success: boolean;
  transcription: string;
  language?: string;
  duration?: number;
}

// =============================================
// CONTRACT ADDENDUMS TYPES
// =============================================

export interface ContractAddendum extends BaseEntity {
  contract_id: string;
  addendum_number: number;
  title?: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  content_extracted?: string;
  extracted_insights?: AddendumInsights;
  extraction_method?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  processing_error?: string;
  status: 'uploaded' | 'analyzed' | 'applied' | 'rejected';
  applied_at?: string;
  user_id?: string;
}

export interface AddendumInsights {
  summary: string;
  detected_changes: DetectedChange[];
  error?: string;
}

export interface DetectedChange {
  type: 'date_change' | 'value_change' | 'service_add' | 'service_remove' |
        'maintenance_add' | 'equipment_update' | 'condition_change' | 'other';
  field_name?: string;
  current_value?: string;
  suggested_value?: string;
  description: string;
  confidence_score: number;
  maintenance_data?: MaintenanceData;
}

export interface MaintenanceData {
  title?: string;
  description?: string;
  frequency?: string;
  equipment_type?: string;
  scheduled_date?: string;
}

export interface PendingContractChange extends BaseEntity {
  addendum_id: string;
  contract_id: string;
  change_type: string;
  field_name?: string;
  current_value?: string;
  suggested_value?: string;
  change_description?: string;
  confidence_score?: number;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  approved_at?: string;
  rejected_reason?: string;
  maintenance_data?: MaintenanceData;
  // Joined fields from addendum
  addendum_number?: number;
  addendum_title?: string;
}