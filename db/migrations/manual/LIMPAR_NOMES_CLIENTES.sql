-- Script para limpar caracteres indesejados nos nomes de clientes
-- Exemplos: "ANTONIA NORCHET () ()" -> "ANTONIA NORCHET"
--           "CICERO LUIS DA SILVA (19) (19)" -> "CICERO LUIS DA SILVA"

-- 1. Ver quantos registros serão afetados
SELECT COUNT(*) as total_afetados
FROM clientes 
WHERE nome ~ '\(\d*\)\s*\(\d*\)$'  -- Padrão (XX) (XX) ou () () no final
   OR nome ~ '\(\)\s*\(\)$'
   OR nome ~ '\(\d+\)\s*$'  -- Padrão (XX) no final
   OR nome ~ '\(\)\s*$';    -- Padrão () no final

-- 2. Ver exemplos dos nomes que serão limpos
SELECT id, nome as nome_atual,
       TRIM(REGEXP_REPLACE(
           REGEXP_REPLACE(
               REGEXP_REPLACE(nome, '\(\d*\)\s*\(\d*\)$', ''),
               '\(\)\s*\(\)$', ''
           ),
           '\s+', ' ', 'g'
       )) as nome_limpo
FROM clientes 
WHERE nome ~ '\(\d*\)\s*\(\d*\)$'
   OR nome ~ '\(\)\s*\(\)$'
   OR nome ~ '\(\d+\)\s*$'
   OR nome ~ '\(\)\s*$'
LIMIT 20;

-- 3. EXECUTAR A LIMPEZA (descomente para executar)
/*
UPDATE clientes
SET nome = TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(nome, '\(\d*\)\s*\(\d*\)$', ''),
            '\(\)\s*\(\)$', ''
        ),
        '\(\d+\)\s*$', ''
    ),
    '\s+', ' ', 'g'
))
WHERE nome ~ '\(\d*\)\s*\(\d*\)$'
   OR nome ~ '\(\)\s*\(\)$'
   OR nome ~ '\(\d+\)\s*$'
   OR nome ~ '\(\)\s*$';
*/

-- 4. Versão mais agressiva - remove QUALQUER coisa entre parênteses no final do nome
-- CUIDADO: Pode remover informações importantes como apelidos
/*
UPDATE clientes
SET nome = TRIM(REGEXP_REPLACE(nome, '\s*\([^)]*\)\s*$', '', 'g'))
WHERE nome ~ '\([^)]*\)\s*$';
*/

