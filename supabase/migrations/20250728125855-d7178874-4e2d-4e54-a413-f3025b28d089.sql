-- Adicionar campos para selecionar colaboradores nas pesquisas NPS
ALTER TABLE nps_surveys 
ADD COLUMN allowed_respondents UUID[] DEFAULT '{}',
ADD COLUMN target_employees UUID[] DEFAULT '{}';

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN nps_surveys.allowed_respondents IS 'Array de user_ids que podem responder esta pesquisa';
COMMENT ON COLUMN nps_surveys.target_employees IS 'Array de user_ids sobre quem a pesquisa é (para avaliação de colaboradores)';