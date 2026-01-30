-- ================================================
-- FIX ALL RLS POLICIES FOR LUMINUS AI HUB
-- ================================================
-- This migration fixes RLS policies for all tables to ensure proper access control

-- ================================================
-- 1. CONTRACTS TABLE
-- ================================================
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

-- ================================================
-- 2. CLIENTS TABLE
-- ================================================
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

-- ================================================
-- 3. CONTRACT_DOCUMENTS TABLE
-- ================================================
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

-- ================================================
-- 4. MAINTENANCES TABLE
-- ================================================
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

-- ================================================
-- 5. CHAT_SESSIONS TABLE
-- ================================================
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

-- ================================================
-- 6. CHAT_MESSAGES TABLE
-- ================================================
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

-- ================================================
-- 7. AI_AGENTS TABLE
-- ================================================
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

-- ================================================
-- 8. AI_CONTRACT_DOCUMENTS TABLE
-- ================================================
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
-- VERIFY POLICIES ARE ACTIVE
-- ================================================
-- This query will show all tables with RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- ================================================
-- END OF RLS POLICIES FIX
-- ================================================