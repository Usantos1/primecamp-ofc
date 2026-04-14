-- Opcional: limpa preferências legadas de "avaliação Google" (a app não usa mais).
-- Rodar após atualizar a API que força esses campos a false no save.

UPDATE public.os_pos_venda_followup_settings
SET solicitar_avaliacao_google = false,
    texto_avaliacao_google = '',
    updated_at = now()
WHERE solicitar_avaliacao_google IS DISTINCT FROM false
   OR texto_avaliacao_google IS DISTINCT FROM '';
