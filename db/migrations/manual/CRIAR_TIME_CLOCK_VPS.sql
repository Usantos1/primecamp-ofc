-- Script para criar tabela time_clock no banco postgres
-- Execute: psql -h 72.62.106.76 -U postgres -d postgres -f CRIAR_TIME_CLOCK_VPS.sql

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.time_clock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    lunch_start TIMESTAMPTZ,
    lunch_end TIMESTAMPTZ,
    total_hours TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    location TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas faltantes (ignora erro se já existir)
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS lunch_start TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS lunch_end TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS break_start TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS break_end TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Converter total_hours para TEXT se necessário
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_clock' 
        AND column_name = 'total_hours'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE public.time_clock ALTER COLUMN total_hours TYPE TEXT USING total_hours::TEXT;
    END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON public.time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON public.time_clock(date);
CREATE INDEX IF NOT EXISTS idx_time_clock_user_date ON public.time_clock(user_id, date);

-- Criar função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS set_updated_at_time_clock ON public.time_clock;
CREATE TRIGGER set_updated_at_time_clock
    BEFORE UPDATE ON public.time_clock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar resultado
SELECT 'Tabela time_clock criada com sucesso!' AS resultado;

