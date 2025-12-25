# 🧪 GUIA DE TESTES - INTEGRAÇÃO FRONTEND ↔ BACKEND

**Data:** $(date)
**Objetivo:** Testar os 7 endpoints implementados manualmente

---

## 📋 PRÉ-REQUISITOS

1. ✅ Backend rodando em `http://localhost:3000`
2. ✅ Frontend rodando (ex: `http://localhost:5173`)
3. ✅ Usuário admin logado no frontend
4. ✅ Banco de dados PostgreSQL conectado
5. ✅ Tabelas existentes: `users`, `profiles`, `candidate_responses`

---

## 🔍 TESTE 1: UPLOAD DE IMAGEM

### Objetivo
Testar `POST /api/storage/upload`

### Passos:
1. Acessar página que usa `useOSImageReference` (ex: página de configurações)
2. Clicar em "Upload de imagem"
3. Selecionar uma imagem PNG ou JPG (< 2MB)
4. Confirmar upload

### Verificações:
- [ ] Upload bem-sucedido
- [ ] URL retornada no formato: `http://localhost:3000/uploads/...`
- [ ] Arquivo salvo em `server/uploads/`
- [ ] Imagem exibida no frontend

### Logs Esperados (Console):
```
[API] Upload realizado: {
  originalName: "...",
  filename: "...",
  path: "...",
  size: ...,
  bucket: "os-reference-images"
}
```

### Erros Possíveis:
- ❌ **401 Unauthorized:** Token não enviado ou inválido
- ❌ **400 Bad Request:** Arquivo não fornecido ou tipo inválido
- ❌ **413 Payload Too Large:** Arquivo > 10MB

### Correções Aplicadas:
- ✅ Nenhuma correção necessária (contrato já estava correto)

---

## 🔍 TESTE 2: LISTAR USUÁRIOS (admin-get-user)

### Objetivo
Testar `POST /api/functions/admin-get-user` ao listar usuários

### Passos:
1. Acessar página de gerenciamento de usuários
2. Verificar se lista de usuários carrega
3. Verificar se emails são exibidos corretamente

### Verificações:
- [ ] Lista de usuários carrega sem erros
- [ ] Emails são exibidos corretamente
- [ ] Sem erros no console

### Logs Esperados (Console):
```
Fetching user email for user_id: uuid
```

### Erros Possíveis:
- ❌ **401 Unauthorized:** Token não enviado
- ❌ **403 Forbidden:** Usuário não é admin
- ❌ **404 Not Found:** Usuário não encontrado

### Correções Aplicadas:
- ✅ Nenhuma correção necessária (contrato já estava correto)

---

## 🔍 TESTE 3: EDITAR USUÁRIO (admin-update-user)

### Objetivo
Testar `POST /api/functions/admin-update-user`

### Passos:
1. Na lista de usuários, clicar em "Editar" em um usuário
2. Alterar email (ex: `novo@email.com`)
3. Alterar senha (ex: `novaSenha123`)
4. Salvar alterações

### Verificações:
- [ ] Email atualizado com sucesso
- [ ] Senha atualizada (testar login com nova senha)
- [ ] Mensagem de sucesso exibida
- [ ] Sem erros no console

### Logs Esperados (Backend):
```
[API] Usuário atualizado: { userId: "...", updatedFields: 2 }
```

### Erros Possíveis:
- ❌ **400 Bad Request:** Email já em uso
- ❌ **400 Bad Request:** Senha < 6 caracteres
- ❌ **403 Forbidden:** Usuário não é admin
- ❌ **404 Not Found:** Usuário não encontrado

### Correções Aplicadas:
- ✅ **ANTES:** `{ body: { userId, ... } }`
- ✅ **DEPOIS:** `{ userId, ... }`
- ✅ Wrapper `body:` removido

---

## 🔍 TESTE 4: DELETAR USUÁRIO (admin-delete-user)

### Objetivo
Testar `POST /api/functions/admin-delete-user`

### Passos:
1. Na lista de usuários, clicar em "Deletar" em um usuário
2. Confirmar deleção
3. Verificar se usuário foi removido

### Verificações:
- [ ] Usuário deletado com sucesso
- [ ] Usuário removido da lista
- [ ] Profile também deletado (foreign key cascade)
- [ ] Mensagem de sucesso exibida

### Logs Esperados (Backend):
```
[API] Usuário deletado: { userId: "...", email: "..." }
```

### Erros Possíveis:
- ❌ **400 Bad Request:** Tentativa de auto-deleção
- ❌ **403 Forbidden:** Usuário não é admin
- ❌ **404 Not Found:** Usuário não encontrado
- ❌ **400 Bad Request:** Foreign key constraint (usuário tem registros relacionados)

### Correções Aplicadas:
- ✅ **ANTES:** `{ body: { userId } }`
- ✅ **DEPOIS:** `{ userId }`
- ✅ Wrapper `body:` removido

---

## 🔍 TESTE 5: DISC - RESPONDER PERGUNTA (disc-answer)

### Objetivo
Testar `POST /api/functions/disc-answer`

### Passos:
1. Acessar página de teste DISC
2. Iniciar teste (preencher dados do candidato)
3. Responder primeira pergunta (selecionar D, I, S ou C)
4. Responder segunda pergunta
5. Responder terceira pergunta

### Verificações:
- [ ] Respostas salvas com sucesso
- [ ] Progresso atualizado no frontend
- [ ] Sem erros no console

### Logs Esperados (Backend):
```
[API] Resposta DISC salva: { sessionId: "...", questionId: 1, selectedType: "D" }
```

### Erros Possíveis:
- ❌ **400 Bad Request:** Campos obrigatórios faltando
- ❌ **400 Bad Request:** selectedType inválido (não é D, I, S ou C)
- ❌ **404 Not Found:** Sessão não encontrada
- ❌ **409 Conflict:** Teste já finalizado

### Correções Aplicadas:
- ✅ Nenhuma correção necessária (contrato já estava correto)

---

## 🔍 TESTE 6: DISC - FINALIZAR TESTE (disc-finish)

### Objetivo
Testar `POST /api/functions/disc-finish`

### Passos:
1. Após responder pelo menos 3 perguntas, clicar em "Finalizar"
2. Verificar se teste foi finalizado
3. Verificar scores calculados

### Verificações:
- [ ] Teste finalizado com sucesso
- [ ] Scores calculados (D, I, S, C)
- [ ] Perfil dominante determinado
- [ ] Redirecionamento para página de resultado

### Logs Esperados (Backend):
```
[API] Teste DISC finalizado: {
  testSessionId: "...",
  scores: { d: 10, i: 5, s: 3, c: 2 },
  dominantProfile: "D"
}
```

### Erros Possíveis:
- ❌ **400 Bad Request:** testSessionId não fornecido
- ❌ **404 Not Found:** Sessão não encontrada
- ❌ **409 Conflict:** Teste já finalizado (idempotência)

### Correções Aplicadas:
- ✅ **ANTES:** `apiClient.post('/functions/disc-finish', {...}, { 'Idempotency-Key': ... })`
- ✅ **DEPOIS:** `apiClient.invokeFunction('disc-finish', { testSessionId })`
- ✅ Mudado para usar `invokeFunction` para consistência

---

## 🔍 TESTE 7: DISC - VERIFICAR STATUS (disc-session-status)

### Objetivo
Testar `POST /api/functions/disc-session-status`

### Passos:
1. Após finalizar teste, verificar se polling funciona
2. Ou acessar página de resultado diretamente
3. Verificar se status é retornado corretamente

### Verificações:
- [ ] Status retornado corretamente (`IN_PROGRESS` ou `FINISHED`)
- [ ] Se `FINISHED`, scores e resultId presentes
- [ ] Polling funciona corretamente

### Logs Esperados (Backend):
```
Status: FINISHED
```

### Erros Possíveis:
- ❌ **400 Bad Request:** sessionId não fornecido
- ❌ **404 Not Found:** Sessão não encontrada

### Correções Aplicadas:
- ✅ Nenhuma correção necessária (contrato já estava correto)

---

## 📊 CHECKLIST DE TESTES

### Upload
- [ ] Upload de imagem válida
- [ ] Upload de arquivo inválido (deve falhar)
- [ ] Upload sem autenticação (deve falhar)

### Admin Users
- [ ] Listar usuários (admin-get-user)
- [ ] Editar usuário (admin-update-user)
- [ ] Editar email duplicado (deve falhar)
- [ ] Deletar usuário (admin-delete-user)
- [ ] Tentar deletar próprio usuário (deve falhar)
- [ ] Acesso sem ser admin (deve falhar)

### DISC
- [ ] Responder pergunta (disc-answer)
- [ ] Finalizar teste (disc-finish)
- [ ] Verificar status (disc-session-status)
- [ ] Tentar finalizar teste já finalizado (deve retornar 409)

---

## 🐛 DEBUGGING

### Verificar Logs do Backend
```bash
# No terminal do servidor, você verá:
[API] Upload realizado: { ... }
[API] Usuário atualizado: { ... }
[API] Resposta DISC salva: { ... }
[API] Teste DISC finalizado: { ... }
```

### Verificar Logs do Frontend
```javascript
// No console do navegador, você verá:
📱 Mobile: Raw response from disc-answer
✅ disc.finish.success
🔄 disc.poll.status
```

### Verificar Network Tab
1. Abrir DevTools (F12)
2. Ir para aba "Network"
3. Filtrar por "XHR" ou "Fetch"
4. Verificar:
   - Request Headers (Authorization Bearer)
   - Request Payload
   - Response Status
   - Response Body

---

## ✅ CRITÉRIOS DE SUCESSO

### Upload
- ✅ Arquivo salvo em `server/uploads/`
- ✅ URL retornada e imagem exibida

### Admin Users
- ✅ Lista carrega com emails
- ✅ Edição funciona
- ✅ Deleção funciona

### DISC
- ✅ Respostas salvas
- ✅ Teste finalizado
- ✅ Scores calculados
- ✅ Status verificado

---

## 📝 PRÓXIMOS PASSOS APÓS TESTES

1. **Se houver erros:**
   - Documentar erro (print/log)
   - Verificar contrato (request/response)
   - Corrigir código
   - Testar novamente

2. **Se tudo funcionar:**
   - Marcar testes como concluídos
   - Documentar resultados
   - Preparar para produção

---

**Status:** ✅ **CORREÇÕES APLICADAS - PRONTO PARA TESTES MANUAIS**

