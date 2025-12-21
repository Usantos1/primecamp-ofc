# Como Criar o Bucket para Imagem de Referência de OS

## Problema
O upload da imagem de referência falha porque o bucket `os-reference-images` não existe no Supabase Storage.

## Solução: Criar o Bucket Manualmente

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Navegue até Storage**
   - No menu lateral, clique em **"Storage"**

3. **Criar Novo Bucket**
   - Clique no botão **"New bucket"** ou **"Create bucket"**
   - Preencha os seguintes dados:
     - **Name:** `os-reference-images`
     - **Public bucket:** ✅ **SIM** (marque esta opção para permitir acesso público às imagens)
     - **File size limit:** 2 MB (ou o limite desejado)
     - **Allowed MIME types:** `image/png, image/jpeg, image/jpg` (opcional, mas recomendado)

4. **Salvar**
   - Clique em **"Create bucket"** ou **"Save"**

5. **Configurar Políticas (OBRIGATÓRIO para funcionar)**

   ⚠️ **PROBLEMA ATUAL:** Você está recebendo erro 403 porque as políticas existentes não estão permitindo upload corretamente.
   
   Na tela de **"Policies"** que você está vendo:
   
   **Opção A: Editar Política de INSERT Existente (RECOMENDADO)**
   
   Você já tem uma política de INSERT ("Give access to a folder 9ed50j_0"), mas ela pode estar restringindo uploads. Vamos corrigir:
   
   1. Clique nos **três pontos (⋮)** ao lado da política de INSERT ("Give access to a folder 9ed50j_0")
   2. Selecione **"Edit"** ou **"Edit policy"**
   3. **IMPORTANTE:** Verifique e ajuste os campos:
      
      **Policy definition (USING expression):**
      ```sql
      (bucket_id = 'os-reference-images'::text)
      ```
      
      **With check expression (WITH CHECK) - DEVE estar assim:**
      ```sql
      (
        bucket_id = 'os-reference-images'::text AND
        auth.role() = 'authenticated'
      )
      ```
      
      ⚠️ **CUIDADO:** Se a política tiver algo como `folder = 'alguma-pasta'` ou `name LIKE 'algum-padrao%'`, **REMOVA** essas condições, pois elas estão bloqueando o upload!
      
      A política deve permitir upload em **qualquer lugar** do bucket, não apenas em uma pasta específica.
   
   4. Clique em **"Save"** ou **"Save policy"**
   
   **Se a política não puder ser editada ou continuar dando erro:**
   - Delete a política antiga (três pontos → Delete)
   - Crie uma nova seguindo a Opção B abaixo
   
   **Opção B: Criar Nova Política de INSERT (se a existente não funcionar)**
   
   ⚠️ **IMPORTANTE:** A política precisa ter AMBAS as expressões: USING e WITH CHECK!
   
   1. Clique em **"New policy"** ao lado de "OS-REFERENCE-IMAGES"
   2. Escolha **"For full customization"** ou **"Create policy from scratch"**
   3. Preencha:
      - **Policy name:** `Permitir upload autenticado`
      - **Allowed operation:** `INSERT`
      - **Target roles:** Selecione `authenticated`
      
      **CRÍTICO - Você precisa preencher AMBOS os campos:**
      
      - **USING expression (ou Policy definition):**
        ```sql
        (bucket_id = 'os-reference-images'::text)
        ```
      
      - **WITH CHECK expression:**
        ```sql
        (
          bucket_id = 'os-reference-images'::text AND
          auth.role() = 'authenticated'
        )
        ```
      
      ⚠️ **Se você só preencheu o WITH CHECK, a política não funciona!** Você precisa ter AMBAS as expressões.
   
   4. Clique em **"Review"** e depois **"Save policy"**
   
   **Se ainda não funcionar, tente esta política mais permissiva:**
   
   - **USING expression:**
     ```sql
     true
     ```
   
   - **WITH CHECK expression:**
     ```sql
     (
       bucket_id = 'os-reference-images'::text AND
       auth.role() = 'authenticated'
     )
     ```
   
   **Nota:** Se o bucket está marcado como **PUBLIC**, a política de SELECT pode não ser necessária, mas a de INSERT é **OBRIGATÓRIA** para permitir uploads.

   **Opção C: Usar Interface do Supabase (RECOMENDADO - Mais Confiável)**
   
   ⚠️ **O SQL direto pode não funcionar por falta de permissões.** Use a interface:
   
   1. No Supabase Dashboard, vá em **"Storage"** → **"Policies"**
   2. Encontre o bucket **"OS-REFERENCE-IMAGES"**
   3. Clique em **"New policy"**
   4. Escolha **"For full customization"** ou **"Create policy from scratch"**
   5. Preencha EXATAMENTE assim:
      
      - **Policy name:** `Permitir upload autenticado`
      - **Allowed operation:** `INSERT`
      - **Target roles:** Selecione `authenticated`
      
      **USING expression (ou Policy definition):**
      ```sql
      (bucket_id = 'os-reference-images'::text)
      ```
      
      **WITH CHECK expression:**
      ```sql
      (bucket_id = 'os-reference-images'::text AND auth.role() = 'authenticated'::text)
      ```
   
   6. Clique em **"Review"** e depois **"Save policy"**
   7. Teste o upload novamente
   
   **Se ainda não funcionar, tente uma política mais simples:**
   
   - **USING expression:** `true`
   - **WITH CHECK expression:** `(bucket_id = 'os-reference-images'::text)`

### Verificação

Após criar/ajustar a política, tente fazer upload novamente na página **"Config. Status OS"**.

**Se ainda não funcionar:**
- Verifique se você está logado como admin no Supabase Dashboard
- Tente fazer upload diretamente pelo Supabase Dashboard (Storage > os-reference-images > Upload files) para testar se o problema é na política ou no código
- Se funcionar pelo dashboard mas não pelo código, o problema pode estar na autenticação do cliente Supabase

## Nota Técnica

O bucket precisa ser criado manualmente porque:
- A criação de buckets via código cliente requer permissões de administrador do Supabase
- É mais seguro criar buckets manualmente para controlar permissões e configurações
- Uma vez criado, o bucket pode ser reutilizado para todas as imagens de referência

## Estrutura Esperada

Após a criação, o bucket `os-reference-images` deve conter:
- Arquivos de imagem com nomes como: `celular-referencia-1234567890.png`
- Apenas uma imagem ativa por vez (a mais recente substitui a anterior)

