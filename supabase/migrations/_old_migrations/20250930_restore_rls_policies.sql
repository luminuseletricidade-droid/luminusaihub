-- ================================================
-- RESTORE RLS POLICIES WITH USER FILTERING
-- ================================================
-- This migration restores RLS policies to ensure users only see their own data

-- ================================================
-- STEP 1: Enable RLS on all main tables
-- ================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: Create RLS policies for CONTRACTS table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON contracts;

CREATE POLICY "Users can view their own contracts"
    ON contracts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contracts"
    ON contracts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts"
    ON contracts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts"
    ON contracts FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- STEP 3: Create RLS policies for CLIENTS table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;

CREATE POLICY "Users can view their own clients"
    ON clients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
    ON clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
    ON clients FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
    ON clients FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- STEP 4: Create RLS policies for MAINTENANCES table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own maintenances" ON maintenances;
DROP POLICY IF EXISTS "Users can insert their own maintenances" ON maintenances;
DROP POLICY IF EXISTS "Users can update their own maintenances" ON maintenances;
DROP POLICY IF EXISTS "Users can delete their own maintenances" ON maintenances;

CREATE POLICY "Users can view their own maintenances"
    ON maintenances FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = maintenances.contract_id
        )
    );

CREATE POLICY "Users can insert their own maintenances"
    ON maintenances FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = maintenances.contract_id
        )
    );

CREATE POLICY "Users can update their own maintenances"
    ON maintenances FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = maintenances.contract_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = maintenances.contract_id
        )
    );

CREATE POLICY "Users can delete their own maintenances"
    ON maintenances FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = maintenances.contract_id
        )
    );

-- ================================================
-- STEP 5: Create RLS policies for GENERATED_REPORTS table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON generated_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON generated_reports;

CREATE POLICY "Users can view their own reports"
    ON generated_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
    ON generated_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
    ON generated_reports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
    ON generated_reports FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- STEP 6: Create RLS policies for CONTRACT_DOCUMENTS table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can insert their own contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can update their own contract documents" ON contract_documents;
DROP POLICY IF EXISTS "Users can delete their own contract documents" ON contract_documents;

CREATE POLICY "Users can view their own contract documents"
    ON contract_documents FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = contract_documents.contract_id
        )
    );

CREATE POLICY "Users can insert their own contract documents"
    ON contract_documents FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = contract_documents.contract_id
        )
    );

CREATE POLICY "Users can update their own contract documents"
    ON contract_documents FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = contract_documents.contract_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = contract_documents.contract_id
        )
    );

CREATE POLICY "Users can delete their own contract documents"
    ON contract_documents FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM contracts WHERE id = contract_documents.contract_id
        )
    );

-- ================================================
-- STEP 7: Create RLS policies for CHAT_SESSIONS table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view their own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
    ON chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- STEP 8: Create RLS policies for CHAT_MESSAGES table
-- ================================================
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;

CREATE POLICY "Users can view their own chat messages"
    ON chat_messages FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
        )
    );

CREATE POLICY "Users can insert their own chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
        )
    );

CREATE POLICY "Users can update their own chat messages"
    ON chat_messages FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
        )
    );

CREATE POLICY "Users can delete their own chat messages"
    ON chat_messages FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
        )
    );

-- ================================================
-- STEP 9: Revoke excessive permissions
-- ================================================
-- Remove the "ALL" permissions that were granted to everyone
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant only necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ================================================
-- STEP 10: Verify RLS is enabled
-- ================================================
SELECT
    tablename as "Table Name",
    CASE
        WHEN rowsecurity THEN 'ENABLED - OK'
        ELSE 'DISABLED - NEEDS FIX'
    END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'contracts', 'clients', 'maintenances', 'generated_reports',
    'contract_documents', 'chat_sessions', 'chat_messages'
)
ORDER BY tablename;

-- ================================================
-- STEP 11: Show all active policies
-- ================================================
SELECT
    tablename as "Table",
    policyname as "Policy",
    cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;