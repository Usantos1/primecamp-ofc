-- Remover política insegura que permite acesso público total
DROP POLICY IF EXISTS "Allow public access to job responses for DISC test" ON job_responses;