-- ============================================
-- ADICIONAR CAMPOS DE CHECKLIST DE SAÍDA
-- ============================================

-- Adicionar campo para indicar se o aparelho foi aprovado no checklist de saída
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS checklist_saida_aprovado BOOLEAN;

-- Adicionar campo para observações do checklist de saída (ressalvas)
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS observacoes_checklist_saida TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.ordens_servico.checklist_saida_aprovado IS 'Indica se o aparelho foi aprovado (true) ou reprovado (false) no checklist de saída. NULL significa que o checklist ainda não foi finalizado.';
COMMENT ON COLUMN public.ordens_servico.observacoes_checklist_saida IS 'Observações e ressalvas do checklist de saída, especialmente quando o aparelho foi reprovado.';

