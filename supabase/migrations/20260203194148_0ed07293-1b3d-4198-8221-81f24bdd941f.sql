-- Drop the existing check constraint and add a new one that includes 'trial'
ALTER TABLE passes DROP CONSTRAINT IF EXISTS passes_pass_type_check;

ALTER TABLE passes ADD CONSTRAINT passes_pass_type_check 
CHECK (pass_type IN ('trial', '5_sessions', '10_sessions', 'monthly', 'annual'));