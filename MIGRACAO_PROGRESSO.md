# 📊 PROGRESSO DA MIGRAÇÃO SUPABASE → API PRÓPRIA

**Data de início:** $(date)
**Status:** Em andamento

---

## ✅ CONCLUÍDO

### 1. Auditoria Completa
- ✅ Identificados 83 arquivos com menção a "supabase"
- ✅ Identificados 18 arquivos que usam métodos do Supabase ativamente
- ✅ Criado relatório completo em `AUDITORIA_SUPABASE.md`

### 2. Cliente HTTP Centralizado
- ✅ Criado `src/integrations/api/client.ts` com:
  - Base URL do .env (VITE_API_URL)
  - Headers padrão (Content-Type)
  - Interceptor para token Bearer
  - Tratamento de erros (401 desloga, 403 bloqueia, 500 mostra mensagem)
  - Métodos: GET, POST, PUT, PATCH, DELETE
  - Upload de arquivos
  - Invoke de funções (substitui supabase.functions.invoke)

### 3. Migração de Componentes
- ✅ `src/components/DepartmentManager.tsx` - Migrado para usar `from()` ao invés de `supabase.from()`

---

## 🔄 EM ANDAMENTO

### Migração de Componentes
- ⏳ `src/components/UserManagement.tsx` - 10+ chamadas ao Supabase
- ⏳ `src/components/UserManagementNew.tsx` - 9 chamadas ao Supabase
- ⏳ `src/components/UserEditModal.tsx` - 2 chamadas a edge functions

---

## 📋 PENDENTE

### 1. Remoção de Dependências
- [ ] Remover `@supabase/supabase-js` do `package.json`
- [ ] Remover `src/integrations/supabase/client.ts`
- [ ] Remover `src/intercept-supabase.ts`
- [ ] Remover import em `src/main.tsx`

### 2. Migração de Hooks Críticos
- [ ] `src/hooks/usePDV.ts` - **CRÍTICO**: 30+ chamadas ao Supabase
- [ ] `src/hooks/useOSImageReference.ts` - Storage (2 chamadas)
- [ ] `src/utils/driveUpload.ts` - Edge function (1 chamada)

### 3. Migração de Edge Functions
Precisa criar endpoints na API para:
- [ ] `admin-get-user`
- [ ] `admin-update-user`
- [ ] `admin-delete-user`
- [ ] `upload-to-drive`
- [ ] `daily-nps-reminder`
- [ ] `analyze-candidate`
- [ ] `generate-job-assets`
- [ ] `generate-dynamic-questions`
- [ ] `job-application-save-draft`
- [ ] `job-application-submit`
- [ ] `analyze-candidate-responses`
- [ ] `generate-interview-questions`
- [ ] `evaluate-interview-transcription`
- [ ] `telegram-bot`
- [ ] `get-candidate-data`
- [ ] `disc-answer`
- [ ] `disc-finish`
- [ ] `disc-session-status`

### 4. Migração de Páginas
- [ ] `src/pages/Integration.tsx`
- [ ] `src/pages/CandidateDisc.tsx`
- [ ] `src/components/AdminJobSurveysManager.tsx`
- [ ] `src/pages/JobApplicationSteps.tsx`
- [ ] `src/pages/JobApplication.tsx`
- [ ] `src/pages/AdminInterviews.tsx`
- [ ] `src/pages/admin/InterviewEvaluation.tsx`
- [ ] `src/pages/admin/TalentBank.tsx`
- [ ] `src/hooks/useTelegram.ts`
- [ ] `src/hooks/useJobSurveys.ts`
- [ ] `src/hooks/useCandidateDiscTest.ts`

### 5. Migração de Storage
- [ ] Criar endpoint na API para upload de arquivos
- [ ] Migrar `src/hooks/useOSImageReference.ts`

### 6. Limpeza Final
- [ ] Renomear hooks que têm "Supabase" no nome:
  - `useClientesSupabase.ts` → `useClientes.ts`
  - `useOrdensServicoSupabase.ts` → `useOrdensServico.ts`
  - `useProdutosSupabase.ts` → `useProdutos.ts`
  - `useMarcasModelosSupabase.ts` → `useMarcasModelos.ts`
  - `useItensOSSupabase.ts` → `useItensOS.ts`
- [ ] Remover comentários sobre Supabase
- [ ] Verificar build sem erros

---

## 📊 ESTATÍSTICAS

- **Total de chamadas `supabase.from()`:** ~50+ chamadas
- **Total de chamadas `supabase.functions.invoke()`:** ~20+ chamadas
- **Total de chamadas `supabase.storage`:** 2 chamadas
- **Arquivos migrados:** 1/18 (5.5%)
- **Arquivos pendentes:** 17/18 (94.5%)

---

## 🎯 PRÓXIMOS PASSOS

1. **Imediato:** Continuar migração de componentes críticos
2. **Curto prazo:** Migrar hooks críticos (usePDV)
3. **Médio prazo:** Criar endpoints na API para edge functions
4. **Longo prazo:** Limpeza final e testes

---

## ⚠️ NOTAS IMPORTANTES

- A maioria dos arquivos já importa `from` de `@/integrations/db/client`, então a migração é substituir `supabase.from()` por `from()`
- Edge functions precisam ser recriadas no backend como endpoints REST
- Storage precisa de endpoint de upload na API
- Alguns arquivos usam `supabase` sem import explícito - verificar variáveis globais

