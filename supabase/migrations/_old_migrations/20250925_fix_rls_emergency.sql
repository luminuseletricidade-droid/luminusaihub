-- ================================================
-- EMERGENCY RLS FIX - DISABLE AND RE-ENABLE
-- ================================================
-- This will temporarily disable RLS to allow operations, then re-enable with correct policies

-- STEP 1: Temporarily disable RLS on all tables
ALTER TABLE IF EXISTS contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_agents DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- STEP 3: Re-enable RLS with new simple policies

-- CONTRACTS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on contracts"
ON contracts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on clients"
ON clients FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CONTRACT_DOCUMENTS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on contract_documents"
ON contract_documents FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM contracts
        WHERE contracts.id = contract_documents.contract_id
        AND contracts.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM contracts
        WHERE contracts.id = contract_documents.contract_id
        AND contracts.user_id = auth.uid()
    )
);

-- MAINTENANCES
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on maintenances"
ON maintenances FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM contracts
        WHERE contracts.id = maintenances.contract_id
        AND contracts.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM contracts
        WHERE contracts.id = maintenances.contract_id
        AND contracts.user_id = auth.uid()
    )
);

-- CHAT_SESSIONS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on chat_sessions"
ON chat_sessions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CHAT_MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on chat_messages"
ON chat_messages FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
);

-- AI_AGENTS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on ai_agents"
ON ai_agents FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- GENERATED_REPORTS (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_reports') THEN
        ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Enable all for authenticated users on generated_reports"
        ON generated_reports FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM contracts
                WHERE contracts.id = generated_reports.contract_id
                AND contracts.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM contracts
                WHERE contracts.id = generated_reports.contract_id
                AND contracts.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- STEP 4: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- STEP 5: Verify RLS is enabled
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'contracts', 'clients', 'contract_documents',
    'maintenances', 'chat_sessions', 'chat_messages',
    'ai_agents', 'generated_reports'
)
ORDER BY tablename;

-- STEP 6: List all active policies
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;