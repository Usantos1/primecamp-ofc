-- Adicionar coluna updated_at nas tabelas marcas e modelos (se não existir)
ALTER TABLE public.marcas
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.modelos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar função de trigger para updated_at (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_column') THEN
        CREATE FUNCTION update_timestamp_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END
$$;

-- Criar triggers para atualizar updated_at automaticamente (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_marcas_updated_at') THEN
        CREATE TRIGGER set_marcas_updated_at
        BEFORE UPDATE ON public.marcas
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_modelos_updated_at') THEN
        CREATE TRIGGER set_modelos_updated_at
        BEFORE UPDATE ON public.modelos
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
    END IF;
END
$$;

