#!/bin/bash
# Script para executar na VPS - Banco: postgres, Host: 72.62.106.76
# Uso: bash RODAR_TIME_CLOCK_VPS.sh

cd /root/primecamp-ofc || exit 1

echo "=========================================="
echo "Criando tabela time_clock no banco postgres"
echo "=========================================="

# Usar variáveis de ambiente do .env se disponível
DB_HOST=${DB_HOST:-72.62.106.76}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-AndinhoSurf2015@}
DB_PORT=${DB_PORT:-5432}

# Método 1: Usar PGPASSWORD
export PGPASSWORD="$DB_PASSWORD"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f CRIAR_TIME_CLOCK_VPS.sql 2>&1; then
    echo ""
    echo "✅ Sucesso! Verificando tabela..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d time_clock"
    exit 0
fi

echo ""
echo "❌ Erro ao executar arquivo. Tentando SQL direto..."

# Método 2: Executar SQL diretamente
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
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

