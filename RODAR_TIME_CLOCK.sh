#!/bin/bash
# Script para executar na VPS
# Uso: bash RODAR_TIME_CLOCK.sh

cd /root/primecamp-ofc || exit 1

echo "=========================================="
echo "Criando tabela time_clock"
echo "=========================================="

# Método 1: Tentar com sudo -u postgres
if sudo -u postgres psql -d banco_gestao -f CRIAR_TIME_CLOCK_SIMPLES.sql 2>&1; then
    echo ""
    echo "✅ Sucesso! Verificando tabela..."
    sudo -u postgres psql -d banco_gestao -c "\d time_clock"
    exit 0
fi

echo ""
echo "❌ Erro ao executar. Tentando método alternativo..."

# Método 2: Executar SQL diretamente
sudo -u postgres psql -d banco_gestao << 'SQL'
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

ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS lunch_start TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS lunch_end TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS break_start TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS break_end TIMESTAMPTZ;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON public.time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON public.time_clock(date);
CREATE INDEX IF NOT EXISTS idx_time_clock_user_date ON public.time_clock(user_id, date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_time_clock ON public.time_clock;
CREATE TRIGGER set_updated_at_time_clock
    BEFORE UPDATE ON public.time_clock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Tabela time_clock criada com sucesso!' AS resultado;
SQL

echo ""
echo "✅ Concluído!"

