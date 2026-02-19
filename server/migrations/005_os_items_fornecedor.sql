-- Colunas de fornecedor em os_items (controle interno; erro "fornecedor_nome does not exist" sem esta migration)
ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID;

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS fornecedor_nome VARCHAR(255);

COMMENT ON COLUMN os_items.fornecedor_id IS 'Fornecedor da peça (controle interno, não sai no cupom)';
COMMENT ON COLUMN os_items.fornecedor_nome IS 'Nome do fornecedor (desnormalizado, controle interno)';
