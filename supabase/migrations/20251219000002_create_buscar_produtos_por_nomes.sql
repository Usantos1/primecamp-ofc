-- Função auxiliar para buscar produtos por lista de nomes (case-insensitive)
CREATE OR REPLACE FUNCTION public.buscar_produtos_por_nomes(
  nomes TEXT[]
)
RETURNS TABLE (
  nome TEXT
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT nome
  FROM public.produtos
  WHERE lower(nome) = ANY(SELECT lower(unnest(nomes)))
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.buscar_produtos_por_nomes(TEXT[]) IS 'Busca produtos por lista de nomes (case-insensitive). Retorna apenas os nomes encontrados.';

