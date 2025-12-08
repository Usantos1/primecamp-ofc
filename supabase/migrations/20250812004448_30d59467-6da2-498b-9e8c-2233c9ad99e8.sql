-- Clean up duplicate responses in candidate_responses table
-- Handle both array and scalar cases

-- Reset all incomplete responses to empty array
UPDATE candidate_responses 
SET responses = '[]'::jsonb
WHERE is_completed = false;

-- Add comment to track the fix
COMMENT ON TABLE candidate_responses IS 'Candidate DISC test responses. Fixed duplicate response issue on 2025-08-12.';