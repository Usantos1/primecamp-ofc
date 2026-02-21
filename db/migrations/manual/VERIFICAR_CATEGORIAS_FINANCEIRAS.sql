-- ============================================
-- VERIFICAR E CRIAR CATEGORIAS FINANCEIRAS
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'financial_categories'
) as tabela_existe;

-- Verificar quantas categorias existem
SELECT COUNT(*) as total_categorias
FROM financial_categories;

-- Listar todas as categorias
SELECT id, name, type, is_active
FROM financial_categories
ORDER BY type, name;

-- Se não houver categorias, execute o INSERT abaixo:
-- (As categorias já devem estar criadas pela migration 20250126000000_create_financial_tables.sql)

-- Inserir categorias padrão (se não existirem)
INSERT INTO financial_categories (name, type, description, color, icon)
SELECT * FROM (VALUES
  ('Vendas à Vista', 'entrada', 'Vendas pagas em dinheiro ou PIX', '#22c55e', 'dollar-sign'),
  ('Vendas Cartão', 'entrada', 'Vendas pagas com cartão', '#3b82f6', 'credit-card'),
  ('Outros Recebimentos', 'entrada', 'Outras entradas de dinheiro', '#8b5cf6', 'plus-circle'),
  ('Fornecedores', 'saida', 'Pagamentos a fornecedores', '#ef4444', 'truck'),
  ('Salários', 'saida', 'Pagamento de funcionários', '#f97316', 'users'),
  ('Aluguel', 'saida', 'Despesas com aluguel', '#eab308', 'home'),
  ('Energia/Água', 'saida', 'Contas de consumo', '#06b6d4', 'zap'),
  ('Internet/Telefone', 'saida', 'Telecomunicações', '#6366f1', 'wifi'),
  ('Material de Escritório', 'saida', 'Papelaria e suprimentos', '#ec4899', 'file-text'),
  ('Manutenção', 'saida', 'Reparos e manutenções', '#84cc16', 'tool'),
  ('Marketing', 'saida', 'Publicidade e marketing', '#f43f5e', 'megaphone'),
  ('Impostos', 'saida', 'Tributos e taxas', '#64748b', 'file-minus'),
  ('Outros Gastos', 'saida', 'Despesas diversas', '#94a3b8', 'more-horizontal')
) AS v(name, type, description, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM financial_categories 
  WHERE financial_categories.name = v.name 
  AND financial_categories.type = v.type::transaction_type
);

