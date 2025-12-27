-- ============================================================
-- MIGRAÇÃO: Padronizar colunas de timestamp nas tabelas kv_store_*
-- Objetivo: Evitar erro "column updated_at does not exist" no endpoint /api/upsert/kv_store_*
-- Ações:
--  1) Criar função de trigger para atualizar updated_at automaticamente
--  2) Adicionar colunas created_at e updated_at (IF NOT EXISTS) em todas as tabelas kv_store_%
--  3) Criar trigger BEFORE UPDATE em todas as tabelas kv_store_% para preencher updated_at
-- Compatível com bases já existentes.
-- ============================================================

-- 1) Criar função de trigger (idempotente)
DO $$
BEGIN
  -- Remove função antiga se existir com assinatura diferente (opcional, seguro)
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- Nada a fazer; mantém função existente
    NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Adicionar colunas created_at / updated_at em todas as tabelas kv_store_%
DO $$
DECLARE
  r RECORD;
  trigger_name TEXT;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'kv_store_%'
  LOOP
    -- Adicionar colunas se não existirem
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);

    -- Criar trigger BEFORE UPDATE se não existir
    trigger_name := format('trg_update_updated_at_%s', r.table_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = trigger_name
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        trigger_name, r.table_name
      );
    END IF;
  END LOOP;
END $$;

-- Fim da migração

