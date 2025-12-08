-- Add new required fields to produtos table
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS qualidade text;

-- Update the produto_por_nome function to include new fields
CREATE OR REPLACE FUNCTION public.produto_por_nome(p_nome text)
RETURNS TABLE (
  nome text,
  tipo text,
  marca text,
  modelo text,
  qualidade text,
  valor_dinheiro_pix numeric(12,2),
  valor_parcelado_6x numeric(12,2),
  garantia_dias int,
  tempo_reparo_minutos int,
  observacoes text,
  disponivel boolean
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT nome, tipo, marca, modelo, qualidade,
         valor_dinheiro_pix, valor_parcelado_6x,
         garantia_dias, tempo_reparo_minutos,
         observacoes, disponivel
  FROM public.produtos
  WHERE lower(nome) = lower(p_nome)
  LIMIT 1;
$$;

-- Update the buscar_produtos function to include new fields
CREATE OR REPLACE FUNCTION public.buscar_produtos(q text, p_limit int DEFAULT 10)
RETURNS TABLE (nome text, tipo text, marca text, modelo text, qualidade text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT nome, tipo, marca, modelo, qualidade
  FROM public.produtos
  WHERE nome ilike '%' || q || '%'
  ORDER BY nome
  LIMIT p_limit;
$$;