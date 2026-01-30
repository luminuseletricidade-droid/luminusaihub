-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id),
  contract_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  value DECIMAL(15,2),
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id),
  type TEXT NOT NULL,
  model TEXT,
  location TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenances table
CREATE TABLE public.maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id),
  equipment_id UUID REFERENCES public.equipment(id),
  type TEXT NOT NULL, -- 'preventive' or 'corrective'
  frequency TEXT, -- 'mensal', 'trimestral', etc.
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  description TEXT,
  technician TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Users can insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Users can delete clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Users can view all contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Users can insert contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contracts" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "Users can delete contracts" ON public.contracts FOR DELETE USING (true);

CREATE POLICY "Users can view all equipment" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Users can insert equipment" ON public.equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update equipment" ON public.equipment FOR UPDATE USING (true);
CREATE POLICY "Users can delete equipment" ON public.equipment FOR DELETE USING (true);

CREATE POLICY "Users can view all maintenances" ON public.maintenances FOR SELECT USING (true);
CREATE POLICY "Users can insert maintenances" ON public.maintenances FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update maintenances" ON public.maintenances FOR UPDATE USING (true);
CREATE POLICY "Users can delete maintenances" ON public.maintenances FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenances_updated_at
  BEFORE UPDATE ON public.maintenances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();