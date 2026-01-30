-- Create client documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client status table for custom statuses
CREATE TABLE public.client_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance documents table
CREATE TABLE public.maintenance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL REFERENCES public.maintenances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance status table for custom statuses
CREATE TABLE public.maintenance_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI predictions table
CREATE TABLE public.ai_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id),
  equipment_id UUID REFERENCES public.equipment(id),
  prediction_type TEXT NOT NULL, -- 'maintenance_schedule', 'failure_prediction', etc.
  predicted_date DATE,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  reasoning TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN status_id UUID REFERENCES public.client_status(id),
ADD COLUMN notes TEXT,
ADD COLUMN contact_person TEXT,
ADD COLUMN secondary_phone TEXT,
ADD COLUMN website TEXT;

-- Add status_id column to maintenances table
ALTER TABLE public.maintenances
ADD COLUMN status_id UUID REFERENCES public.maintenance_status(id),
ADD COLUMN scheduled_time TIME DEFAULT '09:00:00',
ADD COLUMN estimated_duration INTEGER DEFAULT 120, -- minutes
ADD COLUMN priority TEXT DEFAULT 'medium'; -- 'low', 'medium', 'high', 'urgent'

-- Enable RLS on new tables
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_documents
CREATE POLICY "Users can view client documents" ON public.client_documents FOR SELECT USING (true);
CREATE POLICY "Users can insert client documents" ON public.client_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update client documents" ON public.client_documents FOR UPDATE USING (true);
CREATE POLICY "Users can delete client documents" ON public.client_documents FOR DELETE USING (true);

-- Create RLS policies for client_status
CREATE POLICY "Users can view client status" ON public.client_status FOR SELECT USING (true);
CREATE POLICY "Users can insert client status" ON public.client_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update client status" ON public.client_status FOR UPDATE USING (true);
CREATE POLICY "Users can delete client status" ON public.client_status FOR DELETE USING (true);

-- Create RLS policies for maintenance_documents
CREATE POLICY "Users can view maintenance documents" ON public.maintenance_documents FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenance documents" ON public.maintenance_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenance documents" ON public.maintenance_documents FOR UPDATE USING (true);
CREATE POLICY "Users can delete maintenance documents" ON public.maintenance_documents FOR DELETE USING (true);

-- Create RLS policies for maintenance_status
CREATE POLICY "Users can view maintenance status" ON public.maintenance_status FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenance status" ON public.maintenance_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenance status" ON public.maintenance_status FOR UPDATE USING (true);
CREATE POLICY "Users can delete maintenance status" ON public.maintenance_status FOR DELETE USING (true);

-- Create RLS policies for ai_predictions
CREATE POLICY "Users can view ai predictions" ON public.ai_predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert ai predictions" ON public.ai_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update ai predictions" ON public.ai_predictions FOR UPDATE USING (true);
CREATE POLICY "Users can delete ai predictions" ON public.ai_predictions FOR DELETE USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_status_updated_at
  BEFORE UPDATE ON public.client_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_documents_updated_at
  BEFORE UPDATE ON public.maintenance_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_status_updated_at
  BEFORE UPDATE ON public.maintenance_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_predictions_updated_at
  BEFORE UPDATE ON public.ai_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default client statuses
INSERT INTO public.client_status (name, color, description) VALUES
('Ativo', '#10b981', 'Cliente ativo'),
('Inativo', '#ef4444', 'Cliente inativo'),
('Potencial', '#f59e0b', 'Cliente potencial'),
('Suspenso', '#6b7280', 'Cliente suspenso');

-- Insert default maintenance statuses
INSERT INTO public.maintenance_status (name, color, description) VALUES
('Agendado', '#3b82f6', 'Manutenção agendada'),
('Em Andamento', '#f59e0b', 'Manutenção em andamento'),
('Concluído', '#10b981', 'Manutenção concluída'),
('Cancelado', '#ef4444', 'Manutenção cancelada'),
('Atrasado', '#dc2626', 'Manutenção atrasada');

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', true);

-- Create storage bucket for maintenance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-documents', 'maintenance-documents', true);

-- Create storage policies for client documents
CREATE POLICY "Client documents are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'client-documents');

CREATE POLICY "Users can upload client documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Users can update client documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'client-documents');

CREATE POLICY "Users can delete client documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'client-documents');

-- Create storage policies for maintenance documents
CREATE POLICY "Maintenance documents are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "Users can upload maintenance documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'maintenance-documents');

CREATE POLICY "Users can update maintenance documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "Users can delete maintenance documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'maintenance-documents');