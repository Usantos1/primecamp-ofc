-- Coluna "apenas orçamento" na OS (cupom sem valor total)
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS apenas_orcamento BOOLEAN DEFAULT false;

COMMENT ON COLUMN ordens_servico.apenas_orcamento IS 'Se true, o cupom térmico exibe "Apenas orçamento" em vez do valor total';

-- Coluna "com aro / sem aro" nos itens da OS (controle interno, não sai no cupom)
ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS com_aro VARCHAR(20) CHECK (com_aro IS NULL OR com_aro IN ('com_aro', 'sem_aro'));

COMMENT ON COLUMN os_items.com_aro IS 'Controle interno: com aro ou sem aro (não exibido no cupom)';
