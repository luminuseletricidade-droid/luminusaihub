-- Add observations column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN observations TEXT;