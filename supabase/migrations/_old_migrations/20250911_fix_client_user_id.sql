-- Fix missing user_id in existing clients
-- This migration assigns user_id to clients based on their contracts

-- Update clients with user_id from their first contract
UPDATE public.clients 
SET user_id = contracts.user_id
FROM (
  SELECT DISTINCT c.client_id, c.user_id
  FROM public.contracts c
  WHERE c.client_id IS NOT NULL 
  AND c.user_id IS NOT NULL
) contracts
WHERE clients.id = contracts.client_id 
AND clients.user_id IS NULL;

-- For clients without contracts, we need to assign them to the first admin user or a default user
-- First, let's find admin users
DO $$
DECLARE
    admin_user_id UUID;
    first_user_id UUID;
BEGIN
    -- Try to find the first admin user
    SELECT user_id INTO admin_user_id 
    FROM public.user_roles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If no admin found, get the first user from auth.users
    IF admin_user_id IS NULL THEN
        SELECT id INTO first_user_id 
        FROM auth.users 
        ORDER BY created_at 
        LIMIT 1;
        
        -- Use the first user as fallback
        admin_user_id := first_user_id;
    END IF;
    
    -- Update remaining clients without user_id
    IF admin_user_id IS NOT NULL THEN
        UPDATE public.clients 
        SET user_id = admin_user_id
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Add comment about the fix
COMMENT ON COLUMN public.clients.user_id IS 'User ID of the client owner - required for RLS policies';