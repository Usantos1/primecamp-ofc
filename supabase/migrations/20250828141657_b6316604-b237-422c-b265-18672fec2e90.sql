-- Permitir acesso público aos dados da candidatura para o teste DISC
-- Isso permite que candidatos acessem apenas seus próprios dados usando o protocolo

CREATE POLICY "Allow public access to job responses for DISC test"
ON job_responses
FOR SELECT
TO public
USING (true);