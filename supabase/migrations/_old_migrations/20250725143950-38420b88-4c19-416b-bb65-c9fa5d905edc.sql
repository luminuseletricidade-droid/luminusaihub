-- Create additional tables for enhanced functionality

-- Client status table
CREATE TABLE IF NOT EXISTS public.client_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance status table  
CREATE TABLE IF NOT EXISTS public.maintenance_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client documents table
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance documents table
CREATE TABLE IF NOT EXISTS public.maintenance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI predictions table
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID,
  equipment_id UUID,
  prediction_type TEXT NOT NULL,
  predicted_date DATE,
  confidence_score NUMERIC,
  reasoning TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_status
CREATE POLICY "Users can view client status" ON public.client_status FOR SELECT USING (true);
CREATE POLICY "Users can insert client status" ON public.client_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update client status" ON public.client_status FOR UPDATE USING (true);
CREATE POLICY "Users can delete client status" ON public.client_status FOR DELETE USING (true);

-- Create RLS policies for maintenance_status
CREATE POLICY "Users can view maintenance status" ON public.maintenance_status FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenance status" ON public.maintenance_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenance status" ON public.maintenance_status FOR UPDATE USING (true);
CREATE POLICY "Users can delete maintenance status" ON public.maintenance_status FOR DELETE USING (true);

-- Create RLS policies for client_documents
CREATE POLICY "Users can view client documents" ON public.client_documents FOR SELECT USING (true);
CREATE POLICY "Users can insert client documents" ON public.client_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update client documents" ON public.client_documents FOR UPDATE USING (true);
CREATE POLICY "Users can delete client documents" ON public.client_documents FOR DELETE USING (true);

-- Create RLS policies for maintenance_documents
CREATE POLICY "Users can view maintenance documents" ON public.maintenance_documents FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenance documents" ON public.maintenance_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenance documents" ON public.maintenance_documents FOR UPDATE USING (true);
CREATE POLICY "Users can delete maintenance documents" ON public.maintenance_documents FOR DELETE USING (true);

-- Create RLS policies for ai_predictions
CREATE POLICY "Users can view ai predictions" ON public.ai_predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert ai predictions" ON public.ai_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update ai predictions" ON public.ai_predictions FOR UPDATE USING (true);
CREATE POLICY "Users can delete ai predictions" ON public.ai_predictions FOR DELETE USING (true);

-- Insert default client status
INSERT INTO public.client_status (name, color, description) VALUES 
('Ativo', '#10b981', 'Cliente ativo com contratos vigentes'),
('Inativo', '#6b7280', 'Cliente temporariamente inativo'),
('Pendente', '#f59e0b', 'Cliente com pendências'),
('Suspenso', '#ef4444', 'Cliente com contrato suspenso')
ON CONFLICT DO NOTHING;

-- Insert default maintenance status
INSERT INTO public.maintenance_status (name, color, description) VALUES 
('Agendada', '#3b82f6', 'Manutenção agendada'),
('Em Andamento', '#f59e0b', 'Manutenção em execução'),
('Concluída', '#10b981', 'Manutenção finalizada com sucesso'),
('Cancelada', '#ef4444', 'Manutenção cancelada'),
('Atrasada', '#dc2626', 'Manutenção com atraso')
ON CONFLICT DO NOTHING;

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
('client-documents', 'client-documents', true),
('maintenance-documents', 'maintenance-documents', true)
ON CONFLICT DO NOTHING;

-- Create storage policies for client documents
CREATE POLICY "Client documents are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'client-documents');
CREATE POLICY "Users can upload client documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "Users can update client documents" ON storage.objects FOR UPDATE USING (bucket_id = 'client-documents');
CREATE POLICY "Users can delete client documents" ON storage.objects FOR DELETE USING (bucket_id = 'client-documents');

-- Create storage policies for maintenance documents  
CREATE POLICY "Maintenance documents are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'maintenance-documents');
CREATE POLICY "Users can upload maintenance documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'maintenance-documents');
CREATE POLICY "Users can update maintenance documents" ON storage.objects FOR UPDATE USING (bucket_id = 'maintenance-documents');
CREATE POLICY "Users can delete maintenance documents" ON storage.objects FOR DELETE USING (bucket_id = 'maintenance-documents');

-- Update existing tables to link with new status tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.client_status(id);
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.maintenance_status(id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_client_status_updated_at
    BEFORE UPDATE ON public.client_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_status_updated_at
    BEFORE UPDATE ON public.maintenance_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_documents_updated_at
    BEFORE UPDATE ON public.client_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_documents_updated_at
    BEFORE UPDATE ON public.maintenance_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_predictions_updated_at
    BEFORE UPDATE ON public.ai_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();