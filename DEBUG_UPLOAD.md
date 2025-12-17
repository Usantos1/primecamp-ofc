# Debug: Erro "Failed to send a request to the Edge Function"

## 🔍 Diagnóstico

O erro `FunctionsFetchError: Failed to send a request to the Edge Function` na linha 125 do `driveUpload.ts` indica que a requisição não está chegando à Edge Function.

## ✅ Verificações Feitas

1. ✅ Edge Function está deployada (`upload-to-drive` versão 1)
2. ✅ Secret `GOOGLE_SERVICE_ACCOUNT_JSON` está configurado
3. ✅ Código de chamada está correto (igual ao `ativa-crm-api` que funciona)

## 🔧 Correções Aplicadas

1. **Verificação de autenticação antes de chamar a função**
   - Agora verifica se o usuário está autenticado antes de fazer o upload
   - Se não estiver autenticado, retorna erro claro

2. **Logs mais detalhados**
   - Loga o ID do usuário antes de chamar a função
   - Loga quando está chamando a Edge Function

## 🧪 Como Testar

1. **Abra o console do navegador (F12)**
2. **Tente fazer upload de uma foto**
3. **Verifique os logs:**
   - Deve aparecer: `[driveUpload] Usuário autenticado: {userId}`
   - Deve aparecer: `[driveUpload] Chamando Edge Function upload-to-drive...`
   - Se aparecer erro de autenticação, faça logout/login

## 🔍 Possíveis Causas Restantes

### 1. Problema de Rede/CORS
Se a função está deployada mas não responde, pode ser:
- Bloqueio de firewall
- Problema de CORS (mas já está configurado na função)
- Timeout da requisição

**Solução:** Verifique os logs da Edge Function no Supabase Dashboard

### 2. Edge Function com Erro Interno
A função pode estar crashando antes de responder.

**Solução:**
1. Acesse Supabase Dashboard
2. Vá em "Edge Functions" > "upload-to-drive"
3. Clique em "Logs"
4. Tente fazer upload novamente
5. Veja se há erros nos logs

### 3. Problema de Autenticação
O token pode não estar sendo enviado corretamente.

**Solução:** 
- Faça logout e login novamente
- Verifique se o token está sendo enviado (veja no Network tab do DevTools)

## 📝 Próximos Passos

1. **Teste novamente** com os logs melhorados
2. **Compartilhe os logs do console** que aparecem quando tenta fazer upload
3. **Verifique os logs da Edge Function** no Supabase Dashboard
4. **Teste se outras Edge Functions funcionam** (ex: `ativa-crm-api`)

Se o erro persistir, compartilhe:
- Os logs completos do console
- Os logs da Edge Function no Supabase Dashboard
- Uma captura de tela do erro no Network tab (F12 > Network)

