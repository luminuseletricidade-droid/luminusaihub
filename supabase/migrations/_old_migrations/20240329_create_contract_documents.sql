-- Create contract_documents table for storing additional documents as knowledge base
CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  storage_path TEXT,
  file_size BIGINT,
  content_extracted TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX idx_contract_documents_created_at ON contract_documents(created_at);

-- Enable RLS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view contract documents" ON contract_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert contract documents" ON contract_documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their contract documents" ON contract_documents
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their contract documents" ON contract_documents
  FOR DELETE USING (uploaded_by = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_contract_documents_updated_at
  BEFORE UPDATE ON contract_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_documents_updated_at();

-- Add comment on table
COMMENT ON TABLE contract_documents IS 'Stores additional documents attached to contracts for knowledge base and analysis';