-- =====================================================
-- ADICIONAR CAMPOS DE AUDITORIA DO CHECKLIST (ENTRADA/SAÍDA)
-- =====================================================
-- Execute no banco (PostgreSQL/Supabase) para permitir salvar
-- quem realizou o checklist e quando.
--
-- Campos:
-- - checklist_entrada_realizado_por_id / _nome / _em
-- - checklist_saida_realizado_por_id / _nome / _em
-- =====================================================

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS checklist_entrada_realizado_por_id UUID,
  ADD COLUMN IF NOT EXISTS checklist_entrada_realizado_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS checklist_entrada_realizado_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checklist_saida_realizado_por_id UUID,
  ADD COLUMN IF NOT EXISTS checklist_saida_realizado_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS checklist_saida_realizado_em TIMESTAMP WITH TIME ZONE;



