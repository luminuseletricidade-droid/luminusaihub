
-- Create a table for contract documents
CREATE TABLE public.contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for contract documents
CREATE POLICY "Users can view contract documents" 
  ON public.contract_documents 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create contract documents" 
  ON public.contract_documents 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update contract documents" 
  ON public.contract_documents 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete contract documents" 
  ON public.contract_documents 
  FOR DELETE 
  USING (true);

-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', true);

-- Create storage policies for contract documents
CREATE POLICY "Users can view contract documents in storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-documents');

CREATE POLICY "Users can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Users can update contract documents in storage"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contract-documents');

CREATE POLICY "Users can delete contract documents in storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-documents');

-- Create trigger for updating updated_at column
CREATE TRIGGER update_contract_documents_updated_at
  BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
