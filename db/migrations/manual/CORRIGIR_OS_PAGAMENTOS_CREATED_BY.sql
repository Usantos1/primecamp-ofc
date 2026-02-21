-- ============================================
-- CORRIGIR: remover FK de created_by e cancelled_by em os_pagamentos
-- O ID do usuário logado vem da API (não necessariamente de auth.users).
-- Execute no Supabase/pgAdmin (SQL Editor) para resolver o erro:
--   "violates foreign key constraint os_pagamentos_created_by_fkey"
-- ============================================

ALTER TABLE public.os_pagamentos
  DROP CONSTRAINT IF EXISTS os_pagamentos_created_by_fkey;

ALTER TABLE public.os_pagamentos
  DROP CONSTRAINT IF EXISTS os_pagamentos_cancelled_by_fkey;

-- Colunas created_by e cancelled_by continuam como UUID para rastreabilidade;
-- apenas não exige mais que o valor exista em auth.users.
