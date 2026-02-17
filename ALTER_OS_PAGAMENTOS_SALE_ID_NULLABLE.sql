-- ============================================
-- Permitir sale_id NULL em os_pagamentos (adiantamentos sem venda separada)
-- Execute no Supabase SQL Editor UMA VEZ. Sem isso, registrar adiantamento pode travar/falhar.
-- ============================================

ALTER TABLE public.os_pagamentos
  ALTER COLUMN sale_id DROP NOT NULL;

-- Com sale_id NULL: adiantamentos ficam só em os_pagamentos (não criam venda #1030).
-- No faturamento da OS, uma única venda terá "Adiantamento OS" + restante (sem duplicar 100+200).
