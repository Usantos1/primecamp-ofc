-- ============================================
-- TABELA DE CLIENTES
-- ============================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo e SituaÃ§Ã£o
  tipo_pessoa TEXT NOT NULL DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  
  -- Dados Pessoais/Empresariais
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  rg TEXT,
  sexo TEXT CHECK (sexo IN ('M', 'F', 'Outro')),
  data_nascimento DATE,
  
  -- EndereÃ§o
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Contato
  telefone TEXT,
  telefone2 TEXT,
  email TEXT,
  whatsapp TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_situacao ON public.clientes(situacao);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON public.clientes(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_updated_at();

-- RLS Policies
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Policy: UsuÃ¡rios autenticados podem ver todos os clientes
DROP POLICY IF EXISTS  "UsuÃ¡rios autenticados podem ver clientes" ON public.clientes;
CREATE POLICY "UsuÃ¡rios autenticados podem ver clientes"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: UsuÃ¡rios autenticados podem criar clientes
DROP POLICY IF EXISTS  "UsuÃ¡rios autenticados podem criar clientes" ON public.clientes;
CREATE POLICY "UsuÃ¡rios autenticados podem criar clientes"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: UsuÃ¡rios autenticados podem atualizar clientes
DROP POLICY IF EXISTS  "UsuÃ¡rios autenticados podem atualizar clientes" ON public.clientes;
CREATE POLICY "UsuÃ¡rios autenticados podem atualizar clientes"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: UsuÃ¡rios autenticados podem deletar clientes
DROP POLICY IF EXISTS  "UsuÃ¡rios autenticados podem deletar clientes" ON public.clientes;
CREATE POLICY "UsuÃ¡rios autenticados podem deletar clientes"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (true);


