-- Migration: Add is_required column to maintenance_checklist
-- Description: Adds the is_required column to support required checklist items
-- Date: 2025-10-22

ALTER TABLE maintenance_checklist 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Update existing records to have a default value
UPDATE maintenance_checklist 
SET is_required = false 
WHERE is_required IS NULL;
