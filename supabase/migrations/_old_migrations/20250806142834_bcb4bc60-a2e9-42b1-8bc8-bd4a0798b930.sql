-- Phase 1: Critical Security Fixes

-- Create proper user roles system to prevent privilege escalation
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$;

-- Update get_current_user_role to use new system
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role(auth.uid())::TEXT, 'user');
$$;

-- Remove role column from profiles table to prevent privilege escalation
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix overly permissive RLS policies - Replace 'true' expressions with proper user restrictions

-- Fix ai_predictions policies
DROP POLICY IF EXISTS "Users can view ai predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "Users can insert ai predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "Users can update ai predictions" ON public.ai_predictions;
DROP POLICY IF EXISTS "Users can delete ai predictions" ON public.ai_predictions;

CREATE POLICY "Users can view ai predictions for their contracts" 
ON public.ai_predictions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = ai_predictions.contract_id 
      AND contracts.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can create ai predictions for their contracts" 
ON public.ai_predictions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = ai_predictions.contract_id 
      AND contracts.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can update ai predictions for their contracts" 
ON public.ai_predictions 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = ai_predictions.contract_id 
      AND contracts.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can delete ai predictions for their contracts" 
ON public.ai_predictions 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = ai_predictions.contract_id 
      AND contracts.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

-- Fix client_documents policies
DROP POLICY IF EXISTS "Users can view client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can insert client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can update client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can delete client documents" ON public.client_documents;

CREATE POLICY "Users can view client documents for their clients" 
ON public.client_documents 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = client_documents.client_id 
      AND clients.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can create client documents for their clients" 
ON public.client_documents 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = client_documents.client_id 
      AND clients.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can update client documents for their clients" 
ON public.client_documents 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = client_documents.client_id 
      AND clients.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can delete client documents for their clients" 
ON public.client_documents 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = client_documents.client_id 
      AND clients.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

-- Fix maintenance_documents policies
DROP POLICY IF EXISTS "Users can view maintenance documents" ON public.maintenance_documents;
DROP POLICY IF EXISTS "Users can insert maintenance documents" ON public.maintenance_documents;
DROP POLICY IF EXISTS "Users can update maintenance documents" ON public.maintenance_documents;
DROP POLICY IF EXISTS "Users can delete maintenance documents" ON public.maintenance_documents;

CREATE POLICY "Users can view maintenance documents for their maintenances" 
ON public.maintenance_documents 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.maintenances 
      WHERE maintenances.id = maintenance_documents.maintenance_id 
      AND maintenances.user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_documents.maintenance_id 
      AND c.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can create maintenance documents for their maintenances" 
ON public.maintenance_documents 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.maintenances 
      WHERE maintenances.id = maintenance_documents.maintenance_id 
      AND maintenances.user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_documents.maintenance_id 
      AND c.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can update maintenance documents for their maintenances" 
ON public.maintenance_documents 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.maintenances 
      WHERE maintenances.id = maintenance_documents.maintenance_id 
      AND maintenances.user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_documents.maintenance_id 
      AND c.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can delete maintenance documents for their maintenances" 
ON public.maintenance_documents 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.maintenances 
      WHERE maintenances.id = maintenance_documents.maintenance_id 
      AND maintenances.user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_documents.maintenance_id 
      AND c.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
);

-- Fix client_status and maintenance_status policies - these should be admin-controlled
DROP POLICY IF EXISTS "Users can view client status" ON public.client_status;
DROP POLICY IF EXISTS "Users can insert client status" ON public.client_status;
DROP POLICY IF EXISTS "Users can update client status" ON public.client_status;
DROP POLICY IF EXISTS "Users can delete client status" ON public.client_status;

CREATE POLICY "All users can view client status" 
ON public.client_status 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage client status" 
ON public.client_status 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view maintenance status" ON public.maintenance_status;
DROP POLICY IF EXISTS "Users can insert maintenance status" ON public.maintenance_status;
DROP POLICY IF EXISTS "Users can update maintenance status" ON public.maintenance_status;
DROP POLICY IF EXISTS "Users can delete maintenance status" ON public.maintenance_status;

CREATE POLICY "All users can view maintenance status" 
ON public.maintenance_status 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage maintenance status" 
ON public.maintenance_status 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to assign default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, 'user', NEW.id);
  RETURN NEW;
END;
$$;

-- Update the existing trigger to also assign role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_role_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();