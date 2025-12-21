-- ============================================
-- CRIAR BUCKET PARA IMAGENS DE REFERÊNCIA DE OS
-- ============================================

-- Criar bucket para armazenar imagens de referência do aparelho
-- Nota: A criação do bucket via SQL pode não funcionar em todos os casos
-- Se necessário, crie manualmente no Supabase Dashboard > Storage

-- Verificar se o bucket já existe e criar se não existir
-- (Isso requer permissões de administrador do Supabase)

-- Política de acesso: público para leitura (apenas visualização)
-- Upload apenas para administradores (via RLS)

-- Comentário: Este bucket armazena a imagem única de referência
-- (frente e verso do aparelho) que é exibida em todas as OS

