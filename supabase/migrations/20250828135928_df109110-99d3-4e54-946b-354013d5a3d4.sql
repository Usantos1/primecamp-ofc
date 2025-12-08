-- Função para corrigir nomes que foram salvos como emails na tabela candidate_responses
-- Esta migração identifica registros onde o campo 'name' contém um email e tenta corrigi-los

-- Primeiro, vamos criar uma função para limpar nomes inválidos
CREATE OR REPLACE FUNCTION fix_candidate_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar registros onde o campo 'name' contém '@' (email)
  -- Definir como 'Nome não informado' temporariamente para esses casos
  UPDATE candidate_responses 
  SET name = 'Nome não informado',
      updated_at = now()
  WHERE name LIKE '%@%'
    AND name != 'Nome não informado';
    
  -- Log da operação
  RAISE NOTICE 'Nomes inválidos (emails) foram corrigidos na tabela candidate_responses';
END;
$$;

-- Executar a função de correção
SELECT fix_candidate_names();

-- Remover a função após uso (opcional)
DROP FUNCTION IF EXISTS fix_candidate_names();