#!/bin/bash
# Script para executar CRIAR_TABELA_TIME_CLOCK.sql na VPS

echo "=========================================="
echo "Criando/Atualizando tabela time_clock"
echo "=========================================="

# Tentar diferentes métodos de conexão
# Método 1: Usar sudo -u postgres
if sudo -u postgres psql -d banco_gestao -f CRIAR_TABELA_TIME_CLOCK.sql 2>/dev/null; then
    echo "✅ Script executado com sucesso usando sudo -u postgres"
    exit 0
fi

# Método 2: Usar localhost (força autenticação TCP)
if psql -h localhost -U postgres -d banco_gestao -f CRIAR_TABELA_TIME_CLOCK.sql 2>/dev/null; then
    echo "✅ Script executado com sucesso usando localhost"
    exit 0
fi

# Método 3: Usar PGPASSWORD se disponível
if [ ! -z "$PGPASSWORD" ]; then
    if PGPASSWORD=$PGPASSWORD psql -h localhost -U postgres -d banco_gestao -f CRIAR_TABELA_TIME_CLOCK.sql 2>/dev/null; then
        echo "✅ Script executado com sucesso usando PGPASSWORD"
        exit 0
    fi
fi

# Método 4: Executar SQL diretamente via sudo
echo "Tentando executar SQL diretamente..."
sudo -u postgres psql -d banco_gestao << 'EOF'
-- Criar tabela time_clock se não existir
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

-- Adicionar colunas que podem estar faltando
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'lunch_start') THEN
        ALTER TABLE public.time_clock ADD COLUMN lunch_start TIMESTAMPTZ;
        RAISE NOTICE 'Coluna lunch_start adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'lunch_end') THEN
        ALTER TABLE public.time_clock ADD COLUMN lunch_end TIMESTAMPTZ;
        RAISE NOTICE 'Coluna lunch_end adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'break_start') THEN
        ALTER TABLE public.time_clock ADD COLUMN break_start TIMESTAMPTZ;
        RAISE NOTICE 'Coluna break_start adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'break_end') THEN
        ALTER TABLE public.time_clock ADD COLUMN break_end TIMESTAMPTZ;
        RAISE NOTICE 'Coluna break_end adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'location') THEN
        ALTER TABLE public.time_clock ADD COLUMN location TEXT;
        RAISE NOTICE 'Coluna location adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'time_clock' 
                   AND column_name = 'ip_address') THEN
        ALTER TABLE public.time_clock ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Coluna ip_address adicionada';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'time_clock' 
               AND column_name = 'total_hours'
               AND data_type != 'text') THEN
        ALTER TABLE public.time_clock ALTER COLUMN total_hours TYPE TEXT USING total_hours::TEXT;
        RAISE NOTICE 'Coluna total_hours convertida para TEXT';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'time_clock' 
               AND column_name = 'status') THEN
        ALTER TABLE public.time_clock ALTER COLUMN status SET DEFAULT 'pending';
        RAISE NOTICE 'Default de status atualizado para pending';
    END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON public.time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON public.time_clock(date);
CREATE INDEX IF NOT EXISTS idx_time_clock_user_date ON public.time_clock(user_id, date);

-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS set_updated_at_time_clock ON public.time_clock;
CREATE TRIGGER set_updated_at_time_clock
    BEFORE UPDATE ON public.time_clock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Tabela time_clock criada/atualizada com sucesso!' AS resultado;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Script executado com sucesso!"
    echo ""
    echo "Verificando estrutura da tabela:"
    sudo -u postgres psql -d banco_gestao -c "\d time_clock"
else
    echo "❌ Erro ao executar script"
    echo ""
    echo "Tente executar manualmente:"
    echo "sudo -u postgres psql -d banco_gestao -f CRIAR_TABELA_TIME_CLOCK.sql"
    exit 1
fi

