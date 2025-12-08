-- Clean up duplicate candidate test sessions with 0 responses
-- This prevents confusion with multiple sessions for the same candidate

DELETE FROM candidate_responses 
WHERE is_completed = false 
  AND jsonb_array_length(responses) = 0 
  AND whatsapp = '+55 (19) 98737-176722'
  AND id != 'cfa9535f-967c-4568-aa47-cc45b12dc581';