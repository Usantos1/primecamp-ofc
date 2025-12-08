-- Limpar registros duplicados na tabela disc_responses
DELETE FROM disc_responses a
USING disc_responses b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.test_id = b.test_id
  AND a.is_completed = b.is_completed;