
-- Criar tabela para análises de contratos
CREATE TABLE IF NOT EXISTS public.contract_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  contract_summary TEXT,
  key_terms JSONB DEFAULT '[]'::jsonb,
  maintenance_requirements JSONB DEFAULT '{}'::jsonb,
  risks_identified JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  compliance_notes TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id)
);

-- Adicionar RLS
ALTER TABLE public.contract_analyses ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Users can view contract analyses" 
  ON public.contract_analyses 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert contract analyses" 
  ON public.contract_analyses 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update contract analyses" 
  ON public.contract_analyses 
  FOR UPDATE 
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_contract_analyses_updated_at
  BEFORE UPDATE ON public.contract_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_analyses_contract_id ON public.contract_analyses(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_extracted_at ON public.contract_analyses(extracted_at);
