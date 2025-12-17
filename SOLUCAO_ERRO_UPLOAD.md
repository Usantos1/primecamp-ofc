# Solução para Erro "Failed to send a request to the Edge Function"

## 🔍 Diagnóstico

O erro `FunctionsFetchError: Failed to send a request to the Edge Function` pode ter várias causas:

### 1. ✅ Edge Function está deployada
A função `upload-to-drive` está listada e está **ACTIVE** (versão 1).

### 2. ⚠️ Possíveis Causas

#### A) Secret `GOOGLE_SERVICE_ACCOUNT_JSON` não configurado
**Solução:**
```bash
# No Supabase Dashboard:
# Project Settings > Edge Functions > Secrets
# Adicione: GOOGLE_SERVICE_ACCOUNT_JSON
# Cole o JSON completo da Service Account
```

#### B) Problema de rede/CORS
A Edge Function pode estar bloqueando requisições.

**Solução:** Verifique se a função tem CORS configurado (já está configurado no código).

#### C) Problema de autenticação
O usuário pode não estar autenticado corretamente.

**Solução:** Verifique se está logado e tente fazer logout/login novamente.

#### D) Edge Function com erro interno
A função pode estar crashando ao processar a requisição.

**Solução:** Verifique os logs da função no Supabase Dashboard.

## 🛠️ Passos para Resolver

### Passo 1: Verificar Secret
```bash
supabase secrets list
```

Se `GOOGLE_SERVICE_ACCOUNT_JSON` não aparecer, configure:
1. Acesse Supabase Dashboard
2. Vá em "Project Settings" > "Edge Functions" > "Secrets"
3. Clique em "Add new secret"
4. Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
5. Value: Cole o JSON completo da Service Account
6. Salve

### Passo 2: Verificar Logs da Edge Function
1. Acesse Supabase Dashboard
2. Vá em "Edge Functions" > "upload-to-drive"
3. Clique em "Logs"
4. Tente fazer upload novamente
5. Veja se há erros nos logs

### Passo 3: Testar Localmente (Opcional)
```bash
# Iniciar Supabase localmente
supabase start

# Servir Edge Functions localmente
supabase functions serve upload-to-drive

# Em outro terminal, testar
curl -X POST http://localhost:54321/functions/v1/upload-to-drive \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file":"test","fileName":"test.jpg","osNumero":1,"tipo":"entrada"}'
```

### Passo 4: Verificar Autenticação
No console do navegador (F12), execute:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Usuário autenticado:', user);
```

Se `user` for `null`, faça login novamente.

## 📝 Logs Melhorados

Adicionei logs mais detalhados no código. Agora você verá no console:
- `[driveUpload] Iniciando upload:` - Dados do upload
- `[driveUpload] Resposta da Edge Function:` - Resposta completa
- `[driveUpload] Erro ao chamar Edge Function:` - Detalhes do erro

## 🎯 Próximos Passos

1. **Verifique o console do navegador** (F12) para ver os logs detalhados
2. **Verifique os logs da Edge Function** no Supabase Dashboard
3. **Confirme que o secret está configurado**
4. **Teste novamente o upload**

Se o erro persistir, compartilhe:
- Os logs do console do navegador
- Os logs da Edge Function no Supabase Dashboard
- Uma captura de tela do erro

