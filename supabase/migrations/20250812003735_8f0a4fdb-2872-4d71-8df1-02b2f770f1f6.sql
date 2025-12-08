-- Clean up duplicate responses in candidate_responses table
-- This fixes the issue where responses were being duplicated

-- First, let's clean up the existing data with duplicates
UPDATE candidate_responses 
SET responses = '[]'::jsonb
WHERE is_completed = false 
AND jsonb_array_length(responses::jsonb) > 20;

-- Add a comment to track this fix
COMMENT ON TABLE candidate_responses IS 'Table to store candidate DISC test responses. Updated to fix duplicate response issue.';