-- ================================================
-- FORCE DISABLE ALL RLS - COMPLETE REMOVAL (FIXED)
-- ================================================
-- This script forcefully disables ALL RLS on ALL tables in public schema

-- ================================================
-- STEP 1: Generate and execute DISABLE RLS for ALL tables
-- ================================================
DO $$
DECLARE
    tbl RECORD;
    disable_count INTEGER := 0;
BEGIN
    -- Loop through ALL tables in public schema
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Disable RLS for each table
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
        disable_count := disable_count + 1;
        RAISE NOTICE 'Disabled RLS for table: %', tbl.tablename;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Total tables with RLS disabled: %', disable_count;
END $$;

-- ================================================
-- STEP 2: Drop ALL policies from ALL tables
-- ================================================
DO $$
DECLARE
    pol RECORD;
    drop_count INTEGER := 0;
BEGIN
    -- Loop through ALL policies in public schema
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

    RAISE NOTICE '';
    RAISE NOTICE 'Total policies dropped: %', drop_count;
END $$;

-- ================================================
-- STEP 3: Grant FULL permissions to everyone
-- ================================================
DO $$
BEGIN
    -- Grant to authenticated users
    GRANT ALL ON SCHEMA public TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

    -- Grant to anon users (public access)
    GRANT ALL ON SCHEMA public TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

    -- Grant to service_role (admin access)
    GRANT ALL ON SCHEMA public TO service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

    RAISE NOTICE 'Granted full permissions to all roles';
END $$;

-- ================================================
-- STEP 4: Verify ALL tables have RLS disabled
-- ================================================
SELECT 'VERIFICATION: RLS STATUS FOR ALL TABLES' as title;

-- Show ALL tables and their RLS status
SELECT
    tablename,
    CASE
        WHEN rowsecurity = true THEN 'RLS STILL ENABLED - ERROR!'
        ELSE 'RLS Disabled'
    END as rls_status,
    CASE
        WHEN rowsecurity = true THEN 'MANUAL FIX REQUIRED'
        ELSE 'OK'
    END as action
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY
    CASE WHEN rowsecurity = true THEN 0 ELSE 1 END,  -- Show problems first
    tablename;

-- ================================================
-- STEP 5: Count remaining problems
-- ================================================
DO $$
DECLARE
    enabled_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count tables with RLS still enabled
    SELECT COUNT(*) INTO enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;

    -- Count remaining policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL RESULTS';
    RAISE NOTICE '========================================';

    IF enabled_count = 0 AND policy_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All RLS disabled and policies removed!';
        RAISE NOTICE 'The database is now COMPLETELY OPEN.';
    ELSE
        RAISE NOTICE 'WARNING: Some issues remain:';
        RAISE NOTICE '   - Tables with RLS enabled: %', enabled_count;
        RAISE NOTICE '   - Policies still active: %', policy_count;
        RAISE NOTICE '';
        RAISE NOTICE 'Run this query to see problems:';
        RAISE NOTICE 'SELECT * FROM pg_tables WHERE schemaname = ''public'' AND rowsecurity = true;';
        RAISE NOTICE 'SELECT * FROM pg_policies WHERE schemaname = ''public'';';
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- ================================================
-- STEP 6: Show any remaining policies (should be empty)
-- ================================================
SELECT 'REMAINING POLICIES (Should be empty)' as title;

SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    'STILL EXISTS - NEEDS MANUAL REMOVAL' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- If no rows returned above, all policies are removed

-- ================================================
-- STEP 7: Alternative force disable for specific tables
-- ================================================
-- If some tables still have RLS enabled, try this manual approach
DO $$
DECLARE
    problem_tables TEXT[] := ARRAY[
        'contracts', 'clients', 'contract_documents',
        'maintenances', 'chat_sessions', 'chat_messages',
        'ai_agents', 'generated_reports', 'notifications',
        'reports', 'ai_contract_documents'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY problem_tables
    LOOP
        BEGIN
            -- Try to disable RLS
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'Force disabled RLS for: %', tbl;
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist, skip
                NULL;
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not disable RLS for %: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;

-- ================================================
-- FINAL CHECK
-- ================================================
SELECT 'FINAL CHECK - ALL PUBLIC TABLES' as title;

-- Final status of all tables
SELECT
    tablename as "Table Name",
    CASE
        WHEN rowsecurity THEN 'ENABLED - ERROR'
        ELSE 'DISABLED - OK'
    END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;