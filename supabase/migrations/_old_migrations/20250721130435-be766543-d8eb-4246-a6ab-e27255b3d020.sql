
-- Adicionar coluna user_id à tabela ai_generated_plans
ALTER TABLE public.ai_generated_plans 
ADD COLUMN user_id UUID REFERENCES auth.users;

-- Atualizar registros existentes com um valor padrão (se houver)
-- Isso é necessário para evitar problemas com dados existentes
UPDATE public.ai_generated_plans 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Atualizar as políticas RLS para usar user_id ao invés de apenas permitir tudo
DROP POLICY IF EXISTS "Users can view all ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can insert ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can update ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can delete ai_generated_plans" ON public.ai_generated_plans;

-- Criar políticas RLS mais restritivas baseadas em user_id
CREATE POLICY "Users can view their own ai_generated_plans" 
  ON public.ai_generated_plans 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ai_generated_plans" 
  ON public.ai_generated_plans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_generated_plans" 
  ON public.ai_generated_plans 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai_generated_plans" 
  ON public.ai_generated_plans 
  FOR DELETE 
  USING (auth.uid() = user_id);
