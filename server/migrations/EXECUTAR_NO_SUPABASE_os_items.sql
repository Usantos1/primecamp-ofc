-- Execute este SQL no BANCO DE DADOS que a API usa (api.primecamp.cloud).
-- Não é Supabase: é o PostgreSQL (ou outro) conectado ao seu backend/API.
-- Se você tem acesso ao servidor da API, rode isso no cliente do banco (psql, DBeaver, etc.).

-- Erro: "column fornecedor_nome of relation os_items does not exist"

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID;

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS fornecedor_nome VARCHAR(255);

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS com_aro VARCHAR(20);
