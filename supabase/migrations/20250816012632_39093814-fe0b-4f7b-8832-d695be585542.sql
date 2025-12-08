-- Add missing columns to produtos table
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS tipo text CHECK (tipo IN ('produto', 'servico')) NOT NULL DEFAULT 'produto',
ADD COLUMN IF NOT EXISTS valor_avista_centavos integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_6x_centavos integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS garantia_dias integer NOT NULL DEFAULT 90,
ADD COLUMN IF NOT EXISTS tempo_reparo_minutos integer NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS disponivel boolean NOT NULL DEFAULT true;

-- Create unique constraint on nome (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_nome_unique 
ON public.produtos (lower(nome));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON public.produtos (tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel ON public.produtos (disponivel);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_produtos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS trigger_update_produtos_updated_at ON public.produtos;
CREATE TRIGGER trigger_update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_produtos();

-- Update RLS policies for authenticated users
DROP POLICY IF EXISTS "Users can view produtos" ON public.produtos;
DROP POLICY IF EXISTS "Users can insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "Users can update produtos" ON public.produtos;
DROP POLICY IF EXISTS "Users can delete produtos" ON public.produtos;

CREATE POLICY "Authenticated users can view produtos" 
ON public.produtos FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert produtos" 
ON public.produtos FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update produtos" 
ON public.produtos FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete produtos" 
ON public.produtos FOR DELETE 
USING (auth.role() = 'authenticated');