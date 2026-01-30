-- Enable RLS for all tables to ensure proper access control
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
CREATE POLICY "Users can view all clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

-- Create RLS policies for contracts table  
CREATE POLICY "Users can view all contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (true);

-- Create RLS policies for maintenances table
CREATE POLICY "Users can view all maintenances" ON public.maintenances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert maintenances" ON public.maintenances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update maintenances" ON public.maintenances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete maintenances" ON public.maintenances FOR DELETE TO authenticated USING (true);

-- Create RLS policies for contract_documents table
CREATE POLICY "Users can view all contract_documents" ON public.contract_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert contract_documents" ON public.contract_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update contract_documents" ON public.contract_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete contract_documents" ON public.contract_documents FOR DELETE TO authenticated USING (true);

-- Create a table for AI generated plans
CREATE TABLE public.ai_generated_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('technical_analysis', 'operational_calendar', 'technical_schedules', 'excel_calendar')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected', 'modified')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ai_generated_plans
ALTER TABLE public.ai_generated_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_generated_plans table
CREATE POLICY "Users can view all ai_generated_plans" ON public.ai_generated_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert ai_generated_plans" ON public.ai_generated_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ai_generated_plans" ON public.ai_generated_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete ai_generated_plans" ON public.ai_generated_plans FOR DELETE TO authenticated USING (true);

-- Create updated_at trigger for ai_generated_plans
CREATE TRIGGER update_ai_generated_plans_updated_at
    BEFORE UPDATE ON public.ai_generated_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();