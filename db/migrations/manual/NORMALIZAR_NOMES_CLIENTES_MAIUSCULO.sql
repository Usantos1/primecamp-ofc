-- Normaliza nomes de clientes para maiúsculo no histórico.
-- Rode uma vez no banco de produção depois de subir o código.

BEGIN;

-- Cadastro principal de clientes
UPDATE clientes
SET nome = UPPER(TRIM(nome))
WHERE nome IS NOT NULL
  AND nome <> UPPER(TRIM(nome));

-- Snapshot do nome salvo nas ordens de serviço
UPDATE ordens_servico
SET cliente_nome = UPPER(TRIM(cliente_nome))
WHERE cliente_nome IS NOT NULL
  AND cliente_nome <> UPPER(TRIM(cliente_nome));

COMMIT;
