-- Simplificar tabela produtos - remover colunas desnecessárias
ALTER TABLE produtos
  DROP COLUMN IF EXISTS quantidade,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS garantia_dias,
  DROP COLUMN IF EXISTS tempo_reparo_minutos,
  DROP COLUMN IF EXISTS observacoes,
  DROP COLUMN IF EXISTS disponivel;

-- Garantir que colunas essenciais não sejam nulas
ALTER TABLE produtos
  ALTER COLUMN marca SET NOT NULL,
  ALTER COLUMN modelo SET NOT NULL,
  ALTER COLUMN qualidade SET NOT NULL;

-- Comentário para documentação
COMMENT ON TABLE produtos IS 'Tabela simplificada de produtos - contém apenas informações essenciais: nome, marca, modelo, qualidade e valores';