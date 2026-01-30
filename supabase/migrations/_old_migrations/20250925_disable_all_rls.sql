-- ================================================
-- DISABLE ALL RLS POLICIES - EMERGENCY SCRIPT
-- ================================================
-- This script disables RLS on all tables to allow full access
-- Use this only for testing/emergency situations

-- ================================================
-- STEP 1: Disable RLS on all known tables
-- ================================================

-- Core tables
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents DISABLE ROW LEVEL SECURITY;

-- Optional tables (if they exist)
DO $$
BEGIN
    -- ai_contract_documents
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_contract_documents') THEN
        ALTER TABLE ai_contract_documents DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled for ai_contract_documents';
    END IF;

    -- generated_reports
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_reports') THEN
        ALTER TABLE generated_reports DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled for generated_reports';
    END IF;

    -- notifications
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled for notifications';
    END IF;

    -- reports
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports') THEN
        ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled for reports';
    END IF;
END $$;

-- ================================================
-- STEP 2: Drop all existing policies (cleanup)
-- ================================================
DO $$
DECLARE
    pol RECORD;
    drop_count INTEGER := 0;
BEGIN
    -- Loop through all policies in public schema
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
        drop_count := drop_count + 1;
        RAISE NOTICE 'Dropped policy: % on table: %', pol.policyname, pol.tablename;
    END LOOP;

    RAISE NOTICE 'Total policies dropped: %', drop_count;
END $$;

-- ================================================
-- STEP 3: Grant full permissions to authenticated users
-- ================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Also grant to anon role for public access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- ================================================
-- STEP 4: Verify RLS status
-- ================================================
SELECT
    '========================================' as separator;

SELECT
    'RLS STATUS AFTER DISABLING' as title;

SELECT
    '========================================' as separator;

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '❌ RLS STILL ENABLED (ERROR!)'
        ELSE '✅ RLS DISABLED (OK)'
    END as rls_status,
    CASE
        WHEN rowsecurity THEN 'NEEDS MANUAL FIX'
        ELSE 'Ready for use'
    END as action_needed
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ================================================
-- STEP 5: Check for any remaining policies
-- ================================================
SELECT
    '========================================' as separator;

SELECT
    'REMAINING POLICIES (should be empty)' as title;

SELECT
    '========================================' as separator;

SELECT
    tablename,
    policyname,
    'POLICY STILL EXISTS - NEEDS REMOVAL' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- FINAL MESSAGE
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS DISABLE SCRIPT COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All RLS policies have been disabled.';
    RAISE NOTICE 'The database is now in OPEN ACCESS mode.';
    RAISE NOTICE '⚠️  WARNING: This is for emergency/testing only!';
    RAISE NOTICE '⚠️  Re-enable RLS with proper policies for production!';
    RAISE NOTICE '========================================';
END $$;