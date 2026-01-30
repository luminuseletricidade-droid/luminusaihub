-- CRITICAL SECURITY FIX: Secure maintenances_with_details view
-- This view currently has no RLS protection and exposes all maintenance data

-- Enable RLS on the maintenances_with_details view
ALTER TABLE public.maintenances_with_details ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to restrict access to user's own maintenance data
CREATE POLICY "Users can view their own maintenance details" 
ON public.maintenances_with_details 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  (
    -- User owns the maintenance directly
    EXISTS (
      SELECT 1 FROM maintenances m 
      WHERE m.id = maintenances_with_details.id 
      AND m.user_id = auth.uid()
    ) OR
    -- User owns the contract associated with the maintenance
    EXISTS (
      SELECT 1 FROM maintenances m 
      JOIN contracts c ON m.contract_id = c.id
      WHERE m.id = maintenances_with_details.id 
      AND c.user_id = auth.uid()
    ) OR
    -- User is admin
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix anonymous access policies that were flagged as security risks
-- Remove overly permissive policies on contract_documents if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contract_documents;
DROP POLICY IF EXISTS "Public read access" ON public.contract_documents;

-- Remove overly permissive policies on client_documents if they exist  
DROP POLICY IF EXISTS "Enable read access for all users" ON public.client_documents;
DROP POLICY IF EXISTS "Public read access" ON public.client_documents;

-- Remove overly permissive policies on maintenance_documents if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.maintenance_documents;
DROP POLICY IF EXISTS "Public read access" ON public.maintenance_documents;

-- Ensure all critical tables have proper authenticated-only policies
-- Update any policies that might allow anonymous access

-- Add logging for security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID,
  details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  -- Log security events for monitoring
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    jsonb_build_object(
      'action', event_type,
      'user_id', user_id,
      'details', details,
      'timestamp', now()
    ),
    now(),
    '127.0.0.1'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently handle logging errors to not break application flow
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;