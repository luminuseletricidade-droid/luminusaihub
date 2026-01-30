-- Fase 2: Corrigir Políticas RLS - Remover Acesso Anônimo Desnecessário
-- Manter funcionalidade existente mas garantir que apenas usuários autenticados tenham acesso

-- 1. Tabela ai_generated_plans - Já está correta, apenas verificar usuário autenticado
DROP POLICY IF EXISTS "Users can view their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can create their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can update their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can delete their own ai_generated_plans" ON public.ai_generated_plans;

CREATE POLICY "Users can view their own ai_generated_plans" ON public.ai_generated_plans
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own ai_generated_plans" ON public.ai_generated_plans
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_generated_plans" ON public.ai_generated_plans
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai_generated_plans" ON public.ai_generated_plans
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Tabela chat_messages - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view their own chat messages" ON public.chat_messages
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" ON public.chat_messages
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON public.chat_messages
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Tabela chat_sessions - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. Tabela contract_services - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can insert their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can update their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can delete their own contract services" ON public.contract_services;

CREATE POLICY "Users can view their own contract services" ON public.contract_services
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own contract services" ON public.contract_services
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own contract services" ON public.contract_services
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own contract services" ON public.contract_services
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5. Tabela contracts - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;

CREATE POLICY "Users can view their own contracts" ON public.contracts
FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR get_current_user_role() = 'admin'));

CREATE POLICY "Users can insert their own contracts" ON public.contracts
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts" ON public.contracts
FOR UPDATE USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR get_current_user_role() = 'admin'));

CREATE POLICY "Users can delete their own contracts" ON public.contracts
FOR DELETE USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR get_current_user_role() = 'admin'));

-- 6. Tabela generated_reports - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can create their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can update their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can delete their own generated reports" ON public.generated_reports;

CREATE POLICY "Users can view their own generated reports" ON public.generated_reports
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own generated reports" ON public.generated_reports
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own generated reports" ON public.generated_reports
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated reports" ON public.generated_reports
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 7. Tabela profiles - Garantir usuário autenticado
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = id);