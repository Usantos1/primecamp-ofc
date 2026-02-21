-- Correção: trigger/função de update está tentando usar NEW.updated_at
-- mas a tabela public.user_position_departments não possui essa coluna.
-- Isso causa: "record \"new\" has no field \"updated_at\"" em UPDATEs.

ALTER TABLE public.user_position_departments
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Backfill defensivo (caso existam linhas antigas sem valores)
UPDATE public.user_position_departments
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;


