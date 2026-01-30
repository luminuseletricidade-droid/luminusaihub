-- ================================================
-- FIX ALL RLS POLICIES FOR LUMINUS AI HUB
-- ================================================
-- This migration fixes RLS policies for all tables to ensure proper access control
-- Safe version that checks if tables exist before applying policies

-- ================================================
-- 1. CONTRACTS TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contracts') THEN
        ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
        DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
        DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
        DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

        CREATE POLICY "Users can view own contracts"
        ON contracts FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own contracts"
        ON contracts FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own contracts"
        ON contracts FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own contracts"
        ON contracts FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Contracts table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Contracts table not found';
    END IF;
END $$;

-- ================================================
-- 2. CLIENTS TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own clients" ON clients;
        DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
        DROP POLICY IF EXISTS "Users can update own clients" ON clients;
        DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

        CREATE POLICY "Users can view own clients"
        ON clients FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own clients"
        ON clients FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own clients"
        ON clients FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own clients"
        ON clients FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Clients table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Clients table not found';
    END IF;
END $$;

-- ================================================
-- 3. CONTRACT_DOCUMENTS TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_documents') THEN
        ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view contract documents" ON contract_documents;
        DROP POLICY IF EXISTS "Users can insert contract documents" ON contract_documents;
        DROP POLICY IF EXISTS "Users can update contract documents" ON contract_documents;
        DROP POLICY IF EXISTS "Users can delete contract documents" ON contract_documents;

        -- Simplified policies - check if user owns the contract
        CREATE POLICY "Users can view contract documents"
        ON contract_documents FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can insert contract documents"
        ON contract_documents FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update contract documents"
        ON contract_documents FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete contract documents"
        ON contract_documents FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ Contract_documents table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Contract_documents table not found';
    END IF;
END $$;

-- ================================================
-- 4. MAINTENANCES TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenances') THEN
        ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view maintenances" ON maintenances;
        DROP POLICY IF EXISTS "Users can insert maintenances" ON maintenances;
        DROP POLICY IF EXISTS "Users can update maintenances" ON maintenances;
        DROP POLICY IF EXISTS "Users can delete maintenances" ON maintenances;

        CREATE POLICY "Users can view maintenances"
        ON maintenances FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = maintenances.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can insert maintenances"
        ON maintenances FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = maintenances.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update maintenances"
        ON maintenances FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = maintenances.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete maintenances"
        ON maintenances FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = maintenances.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ Maintenances table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Maintenances table not found';
    END IF;
END $$;

-- ================================================
-- 5. CHAT_SESSIONS TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
        DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
        DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
        DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

        CREATE POLICY "Users can view own chat sessions"
        ON chat_sessions FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own chat sessions"
        ON chat_sessions FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own chat sessions"
        ON chat_sessions FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own chat sessions"
        ON chat_sessions FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Chat_sessions table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Chat_sessions table not found';
    END IF;
END $$;

-- ================================================
-- 6. CHAT_MESSAGES TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view chat messages" ON chat_messages;
        DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
        DROP POLICY IF EXISTS "Users can update chat messages" ON chat_messages;
        DROP POLICY IF EXISTS "Users can delete chat messages" ON chat_messages;

        CREATE POLICY "Users can view chat messages"
        ON chat_messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can insert chat messages"
        ON chat_messages FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update chat messages"
        ON chat_messages FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete chat messages"
        ON chat_messages FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ Chat_messages table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Chat_messages table not found';
    END IF;
END $$;

-- ================================================
-- 7. AI_AGENTS TABLE
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_agents') THEN
        ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own ai agents" ON ai_agents;
        DROP POLICY IF EXISTS "Users can insert own ai agents" ON ai_agents;
        DROP POLICY IF EXISTS "Users can update own ai agents" ON ai_agents;
        DROP POLICY IF EXISTS "Users can delete own ai agents" ON ai_agents;

        CREATE POLICY "Users can view own ai agents"
        ON ai_agents FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own ai agents"
        ON ai_agents FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own ai agents"
        ON ai_agents FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own ai agents"
        ON ai_agents FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Ai_agents table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Ai_agents table not found';
    END IF;
END $$;

-- ================================================
-- 8. AI_CONTRACT_DOCUMENTS TABLE (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_contract_documents') THEN
        ALTER TABLE ai_contract_documents ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can insert ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can update ai contract documents" ON ai_contract_documents;
        DROP POLICY IF EXISTS "Users can delete ai contract documents" ON ai_contract_documents;

        CREATE POLICY "Users can view ai contract documents"
        ON ai_contract_documents FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can insert ai contract documents"
        ON ai_contract_documents FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update ai contract documents"
        ON ai_contract_documents FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete ai contract documents"
        ON ai_contract_documents FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = ai_contract_documents.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ Ai_contract_documents table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Ai_contract_documents table not found - skipping';
    END IF;
END $$;

-- ================================================
-- 9. NOTIFICATIONS TABLE (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
        DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
        DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
        DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

        CREATE POLICY "Users can view own notifications"
        ON notifications FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own notifications"
        ON notifications FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own notifications"
        ON notifications FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own notifications"
        ON notifications FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Notifications table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Notifications table not found - skipping';
    END IF;
END $$;

-- ================================================
-- 10. REPORTS TABLE (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports') THEN
        ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own reports" ON reports;
        DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
        DROP POLICY IF EXISTS "Users can update own reports" ON reports;
        DROP POLICY IF EXISTS "Users can delete own reports" ON reports;

        CREATE POLICY "Users can view own reports"
        ON reports FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own reports"
        ON reports FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own reports"
        ON reports FOR UPDATE
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own reports"
        ON reports FOR DELETE
        USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Reports table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Reports table not found - skipping';
    END IF;
END $$;

-- ================================================
-- 11. GENERATED_REPORTS TABLE (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_reports') THEN
        ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view generated reports" ON generated_reports;
        DROP POLICY IF EXISTS "Users can insert generated reports" ON generated_reports;
        DROP POLICY IF EXISTS "Users can update generated reports" ON generated_reports;
        DROP POLICY IF EXISTS "Users can delete generated reports" ON generated_reports;

        -- View policy: Users can view reports from contracts they own
        CREATE POLICY "Users can view generated reports"
        ON generated_reports FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = generated_reports.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        -- Insert policy: Users can insert reports for contracts they own
        CREATE POLICY "Users can insert generated reports"
        ON generated_reports FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = generated_reports.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        -- Update policy: Users can update reports from contracts they own
        CREATE POLICY "Users can update generated reports"
        ON generated_reports FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = generated_reports.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        -- Delete policy: Users can delete reports from contracts they own
        CREATE POLICY "Users can delete generated reports"
        ON generated_reports FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM contracts
            WHERE contracts.id = generated_reports.contract_id
            AND contracts.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ Generated_reports table policies applied';
    ELSE
        RAISE NOTICE '⚠️ Generated_reports table not found - skipping';
    END IF;
END $$;

-- ================================================
-- GRANT NECESSARY PERMISSIONS
-- ================================================
-- Ensure authenticated users have proper permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================================
-- SHOW RESULTS
-- ================================================
-- This query will show all tables with RLS enabled
DO $$
DECLARE
    table_count INTEGER;
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS POLICIES APPLICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total tables in public schema: %', table_count;
    RAISE NOTICE 'Tables with RLS enabled: %', rls_count;
    RAISE NOTICE '========================================';
END $$;

-- List all tables with RLS status
SELECT
    tablename,
    CASE
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ================================================
-- END OF SAFE RLS POLICIES FIX
-- ================================================