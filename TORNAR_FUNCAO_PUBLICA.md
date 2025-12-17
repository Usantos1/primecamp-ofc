# 🔧 Tornar Edge Function Pública no Supabase Dashboard

## Problema

O `config.toml` com `verify_jwt = false` só funciona localmente. Em produção, você precisa configurar no Dashboard do Supabase.

## ✅ Solução: Configurar no Dashboard

### Passo 1: Acessar o Dashboard

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/functions
2. Clique na função `telegram-webhook`

### Passo 2: Tornar a Função Pública

1. Na página da função, procure por **"Settings"** ou **"Configurações"**
2. Procure por uma opção como:
   - **"Verify JWT"** ou **"Verificar JWT"**
   - **"Require Authentication"** ou **"Exigir Autenticação"**
   - **"Public Function"** ou **"Função Pública"**
3. **Desative** a verificação de JWT (marque como `false` ou desative o toggle)
4. Salve as alterações

### Passo 3: Alternativa - Usar Anon Key

Se não encontrar a opção acima, você pode usar o `SUPABASE_ANON_KEY` na URL do webhook:

```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook?apikey=SEU_ANON_KEY
```

Mas isso não é ideal para webhooks do Telegram.

### Passo 4: Verificar

Após configurar, teste novamente:
1. Limpe os updates pendentes
2. Reconfigure o webhook
3. Teste o comando `/getchatid`

## 🔍 Se não encontrar a opção

Algumas versões do Supabase não têm essa opção no Dashboard. Nesse caso, podemos:

1. Usar uma validação de token secreto do Telegram
2. Criar uma função intermediária que valida o token
3. Usar um serviço externo como proxy

Me avise se encontrou a opção ou se precisa de uma alternativa!

