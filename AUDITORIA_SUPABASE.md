# 🔍 AUDITORIA COMPLETA - USO DO SUPABASE NO PROJETO

**Data:** $(date)
**Objetivo:** Identificar TODOS os usos do Supabase para remoção completa

---

## 📋 RESUMO EXECUTIVO

- **Total de arquivos com menção a "supabase":** 83 arquivos
- **Arquivos que usam métodos do Supabase ativamente:** 18 arquivos
- **Dependência no package.json:** `@supabase/supabase-js: ^2.52.1` ⚠️ **PRECISA SER REMOVIDA**
- **Arquivos de interceptação:** `src/intercept-supabase.ts` e `src/main.tsx` (importa interceptação)

---

## 🚨 ARQUIVOS CRÍTICOS QUE USAM SUPABASE DIRETAMENTE

### 1. **Autenticação e Usuários**

#### `src/components/UserManagement.tsx`
- **Linha 74:** `supabase.from('profiles').select('*')`
- **Linha 89:** `supabase.from('user_position_departments').select(...)`
- **Linha 131:** `supabase.from('profiles').delete()`
- **Linha 150:** `supabase.from('profiles').insert()`
- **Linha 205:** `supabase.from('profiles').update()`
- **Linha 233:** `supabase.from('profiles').update()`
- **Linha 257:** `supabase.from('profiles').update()`
- **Linha 292:** `supabase.functions.invoke('admin-delete-user')`
- **Linha 394:** `supabase.from('positions').select(...)`
- **Linha 856:** `supabase.from('profiles').delete()`
- **Linha 873:** `supabase.from('profiles').insert()`

#### `src/components/UserManagementNew.tsx`
- **Linha 101:** `supabase.from('profiles').select('*')`
- **Linha 116:** `supabase.from('roles').select('*')`
- **Linha 134:** `supabase.functions.invoke('admin-get-user')`
- **Linha 186:** `supabase.functions.invoke('admin-get-user')`
- **Linha 220:** `supabase.from('profiles').update()`
- **Linha 245:** `supabase.functions.invoke('admin-update-user')`
- **Linha 284:** `supabase.from('profiles').delete()`
- **Linha 317:** `supabase.functions.invoke('admin-delete-user')`
- **Linha 345:** `supabase.from('profiles').update()`

#### `src/components/UserEditModal.tsx`
- **Linha 60:** `supabase.functions.invoke('admin-get-user')`
- **Linha 152:** `supabase.functions.invoke('admin-update-user')`

### 2. **Gerenciamento de Departamentos**

#### `src/components/DepartmentManager.tsx`
- **Linha 41:** `supabase.from('departments').select('*')`
- **Linha 76:** `supabase.from('departments').insert()`
- **Linha 108:** `supabase.from('departments').update()`
- **Linha 137:** `supabase.from('profiles').select('id')`
- **Linha 151:** `supabase.from('departments').delete()`

⚠️ **PROBLEMA:** Este arquivo não tem import de `supabase`, mas usa diretamente. Provavelmente está usando variável global ou importação implícita.

### 3. **PDV (Ponto de Venda)**

#### `src/hooks/usePDV.ts`
- **Linha 89:** `supabase.from('sales').insert()`
- **Linha 128:** `supabase.from('sales').update()`
- **Linha 154:** `supabase.from('sales').select()`
- **Linha 169:** `supabase.from('sale_items').select()`
- **Linha 179:** `supabase.from('payments').select()`
- **Linha 243:** `supabase.from('cash_register_sessions').select()`
- **Linha 257:** `supabase.from('cash_register_sessions').update()`
- **Linha 357:** `supabase.from('sales').select()`
- **Linha 434:** `supabase.from('sales').select()`
- **Linha 492:** `supabase.from('payments').delete()`
- **Linha 504:** `supabase.from('sales').delete()`
- **Linha 525:** `supabase.from('sales').select()`
- **Linha 558:** `supabase.from('sale_items').select()`
- **Linha 607:** `supabase.from('payments').select()`
- **Linha 653:** `supabase.from('sale_items').insert()`
- **Linha 722:** `supabase.from('sale_items').update()`
- **Linha 747:** `supabase.from('sale_items').delete()`
- **Linha 777:** `supabase.from('sale_items').select()`
- **Linha 786:** `supabase.from('sale_items').delete()`
- **Linha 806:** `supabase.from('payments').select()`
- **Linha 833:** `supabase.from('payments').insert()`
- **Linha 868:** `supabase.from('payments').update()`
- **Linha 885:** `supabase.from('sales').select()`
- **Linha 902:** `supabase.from('payments').delete()`
- **Linha 920:** `supabase.from('payments').update()`
- **Linha 947:** `supabase.from('payments').delete()`
- **Linha 978:** `supabase.from('payments').select()`
- **Linha 986:** `supabase.from('payments').delete()`
- **Linha 1008:** `supabase.from('cash_register_sessions').select()`
- **Linha 1036:** `supabase.from('cash_register_sessions').select()`
- **Linha 1056:** `supabase.from('cash_register_sessions').insert()`
- **Linha 1092:** `supabase.from('sales').select()`
- **Linha 1111:** `supabase.from('cash_register_sessions').update()`
- **Linha 1163:** `supabase.from('cash_movements').select()`
- **Linha 1189:** `supabase.from('cash_movements').insert()`
- **Linha 1265:** `supabase.from('cancel_requests').select()`
- **Linha 1306:** `supabase.from('cancel_requests').insert()`
- **Linha 1321:** Erro relacionado a tabela Supabase
- **Linha 1346:** `supabase.from('cancel_requests').update()`
- **Linha 1361:** `supabase.from('sales').select()`
- **Linha 1368:** `supabase.from('cancel_requests').delete()`
- **Linha 1397:** `supabase.from('cancel_requests').update()`

⚠️ **ARQUIVO CRÍTICO:** Este hook tem MUITAS chamadas ao Supabase. Precisa migração completa.

### 4. **Storage (Armazenamento de Arquivos)**

#### `src/hooks/useOSImageReference.ts`
- **Linha 70:** `supabase.storage.from('os-reference-images').upload()`
- **Linha 102:** `supabase.storage.from('os-reference-images').getPublicUrl()`

#### `src/utils/driveUpload.ts`
- **Linha 263:** `supabase.functions.invoke('upload-to-drive')`

### 5. **Edge Functions (Funções do Supabase)**

#### `src/pages/Integration.tsx`
- **Linha 182:** `supabase.functions.invoke('daily-nps-reminder')`

#### `src/pages/CandidateDisc.tsx`
- **Linha 254:** `supabase.functions.invoke('analyze-candidate')`

#### `src/components/AdminJobSurveysManager.tsx`
- **Linha 299:** `supabase.functions.invoke('generate-job-assets')`
- **Linha 687:** `supabase.functions.invoke('generate-dynamic-questions')`
- **Linha 1001:** `supabase.functions.invoke('analyze-candidate')`
- **Linha 1742:** `supabase.functions.invoke('analyze-candidate')`

#### `src/pages/JobApplicationSteps.tsx`
- **Linha 212:** `supabase.functions.invoke('job-application-save-draft')`
- **Linha 370:** `supabase.functions.invoke('generate-dynamic-questions')`
- **Linha 521:** `supabase.functions.invoke('job-application-submit')`
- **Linha 548:** `supabase.functions.invoke('analyze-candidate-responses')`

#### `src/pages/JobApplication.tsx`
- **Linha 144:** `supabase.functions.invoke('job-application-submit')`

#### `src/pages/AdminInterviews.tsx`
- **Linha 218:** `supabase.functions.invoke('generate-interview-questions')`
- **Linha 277:** `supabase.functions.invoke('evaluate-interview-transcription')`
- **Linha 328:** `supabase.functions.invoke('evaluate-interview-transcription')`

#### `src/pages/admin/InterviewEvaluation.tsx`
- **Linha 179:** `supabase.functions.invoke('evaluate-interview-transcription')`

#### `src/pages/admin/TalentBank.tsx`
- **Linha 182:** `supabase.functions.invoke('analyze-candidate')`
- **Linha 271:** `supabase.functions.invoke('analyze-candidate')`

#### `src/hooks/useTelegram.ts`
- **Linha 47:** `supabase.functions.invoke('telegram-bot')`
- **Linha 214:** `supabase.functions.invoke('telegram-bot')`

#### `src/hooks/useJobSurveys.ts`
- **Linha 215:** `supabase.functions.invoke('get-candidate-data')`

#### `src/hooks/useCandidateDiscTest.ts`
- **Linha 531:** `supabase.functions.invoke('disc-answer')`
- **Linha 750:** `supabase.functions.invoke('disc-finish')`
- **Linha 788:** `supabase.functions.invoke('disc-session-status')`

### 6. **Hooks com "Supabase" no Nome (mas podem já estar migrados)**

#### `src/hooks/useOrdensServicoSupabase.ts`
- **Linha 187:** Comentário sobre `supabase.functions.invoke('ativa-crm-api')`

---

## 📦 DEPENDÊNCIAS E CONFIGURAÇÕES

### Package.json
- **Linha 47:** `"@supabase/supabase-js": "^2.52.1"` ⚠️ **PRECISA SER REMOVIDA**

### Arquivos de Configuração
- `src/integrations/supabase/client.ts` - Mock que lança erros (pode ser removido após migração)
- `src/intercept-supabase.ts` - Intercepta requisições Supabase (pode ser removido após migração)
- `src/main.tsx` - Importa interceptação (precisa remover import)

---

## 🔄 ARQUIVOS QUE JÁ ESTÃO MIGRADOS (mas têm nome "Supabase")

Estes arquivos já usam `from()` ao invés de `supabase.from()`, mas mantêm o nome "Supabase":

- `src/hooks/useClientesSupabase.ts` - ✅ Usa `from()` do cliente PostgreSQL
- `src/hooks/useOrdensServicoSupabase.ts` - ✅ Usa `from()` do cliente PostgreSQL
- `src/hooks/useProdutosSupabase.ts` - ✅ Provavelmente migrado
- `src/hooks/useMarcasModelosSupabase.ts` - ✅ Provavelmente migrado
- `src/hooks/useItensOSSupabase.ts` - ✅ Provavelmente migrado

**Ação:** Renomear estes arquivos para remover "Supabase" do nome.

---

## ✅ ARQUIVOS QUE JÁ ESTÃO CORRETOS

- `src/integrations/auth/api-client.ts` - ✅ Usa API própria
- `src/integrations/db/client.ts` - ✅ Usa PostgreSQL via API
- `src/contexts/AuthContext.tsx` - ✅ Usa authAPI

---

## 🎯 PLANO DE MIGRAÇÃO

### Fase 1: Remoção de Dependências
1. Remover `@supabase/supabase-js` do `package.json`
2. Remover `src/integrations/supabase/client.ts`
3. Remover `src/intercept-supabase.ts`
4. Remover import em `src/main.tsx`

### Fase 2: Criação de Cliente HTTP Centralizado
1. Criar `src/integrations/api/client.ts` com:
   - Base URL do .env
   - Headers padrão
   - Interceptor para token Bearer
   - Tratamento de erros (401, 403, 500)

### Fase 3: Migração de Autenticação
1. Verificar se `AuthContext` já está usando `authAPI` ✅
2. Verificar se todas as rotas estão protegidas corretamente

### Fase 4: Migração de Banco de Dados
1. Migrar `usePDV.ts` - substituir todas as chamadas `supabase.from()` por chamadas da API
2. Migrar `DepartmentManager.tsx` - substituir por chamadas da API
3. Migrar `UserManagement.tsx` e `UserManagementNew.tsx` - substituir por chamadas da API

### Fase 5: Migração de Edge Functions
1. Criar endpoints na API para cada função:
   - `admin-get-user`
   - `admin-update-user`
   - `admin-delete-user`
   - `upload-to-drive`
   - `daily-nps-reminder`
   - `analyze-candidate`
   - `generate-job-assets`
   - `generate-dynamic-questions`
   - `job-application-save-draft`
   - `job-application-submit`
   - `analyze-candidate-responses`
   - `generate-interview-questions`
   - `evaluate-interview-transcription`
   - `telegram-bot`
   - `get-candidate-data`
   - `disc-answer`
   - `disc-finish`
   - `disc-session-status`

### Fase 6: Migração de Storage
1. Criar endpoint na API para upload de arquivos
2. Migrar `useOSImageReference.ts` para usar API de upload

### Fase 7: Limpeza Final
1. Renomear hooks que têm "Supabase" no nome
2. Remover comentários sobre Supabase
3. Verificar build sem erros

---

## 📊 ESTATÍSTICAS

- **Total de chamadas `supabase.from()`:** ~50+ chamadas
- **Total de chamadas `supabase.functions.invoke()`:** ~20+ chamadas
- **Total de chamadas `supabase.storage`:** 2 chamadas
- **Arquivos críticos para migração:** 18 arquivos

---

## ⚠️ PONTOS DE ATENÇÃO

1. **usePDV.ts** é o arquivo mais crítico - tem mais de 30 chamadas ao Supabase
2. **Edge Functions** precisam ser recriadas no backend como endpoints REST
3. **Storage** precisa de endpoint de upload na API
4. Alguns arquivos usam `supabase` sem import explícito - verificar variáveis globais

---

**Próximo passo:** Começar migração sistemática seguindo o plano acima.

