# 🚨 PROBLEMAS SUPABASE ENCONTRADOS

**Data:** $(date)
**Objetivo:** Listar TODOS os arquivos que ainda causam requests ao Supabase

---

## 🔍 BUSCA REALIZADA

### Termos buscados:
- `supabase.co`
- `createClient`
- `supabase`
- `rest/v1`

### Exclusões:
- `node_modules/`
- `dist/`
- `build/`

---

## ❌ PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **CashRegisterSessionsManager.tsx** - USO DIRETO DE `supabase`
**Arquivo:** `src/components/financeiro/CashRegisterSessionsManager.tsx`
**Linha:** 53
**Problema:** Usa `supabase` diretamente sem import
**Status:** ✅ CORRIGIDO

**Antes:**
```typescript
let q: any = supabase
  .from('cash_register_sessions')
  .select('*')
 .execute() .gte('opened_at', start)
```

**Depois:**
```typescript
let q = from('cash_register_sessions')
  .select('*')
  .gte('opened_at', start)
  .lte('opened_at', end)
  .order('opened_at', { ascending: false });
```

---

### 2. **useProdutosSupabase.ts** - SINTAXE ERRADA
**Arquivo:** `src/hooks/useProdutosSupabase.ts`
**Linhas:** 199-201, 237
**Problema:** `.execute()` chamado antes de outros métodos
**Status:** ✅ CORRIGIDO

**Antes:**
```typescript
.execute().order('nome', { ascending: true })
.range(offset, offset + pageSize - 1)
.execute();
```

**Depois:**
```typescript
.order('nome', { ascending: true })
.range(offset, offset + pageSize - 1)
.execute();
```

---

## ⚠️ PROBLEMAS DE SINTAXE ENCONTRADOS (141 ocorrências)

Muitos arquivos têm `.execute()` chamado ANTES de outros métodos como `.eq()`, `.order()`, `.gte()`, etc.

**Padrão incorreto encontrado:**
```typescript
.execute().eq('campo', valor)
.execute().order('campo')
.execute().gte('campo', valor)
```

**Padrão correto:**
```typescript
.eq('campo', valor).execute()
.order('campo').execute()
.gte('campo', valor).execute()
```

### Arquivos com problemas de sintaxe:

1. `src/hooks/useCandidateDiscTest.ts` - 1 ocorrência
2. `src/pages/JobApplication.tsx` - 1 ocorrência
3. `src/hooks/useJobSurveys.ts` - 5 ocorrências
4. `src/pages/AdminInterviews.tsx` - 7 ocorrências
5. `src/pages/admin/TalentBank.tsx` - 15 ocorrências
6. `src/components/AdminJobSurveysManager.tsx` - 15 ocorrências
7. `src/pages/JobApplicationSteps.tsx` - 2 ocorrências
8. `src/hooks/usePDV.ts` - 6 ocorrências
9. `src/hooks/useProdutosPaginated.ts` - 3 ocorrências
10. `src/hooks/useFinanceiro.ts` - 2 ocorrências
11. `src/hooks/useCategories.ts` - 1 ocorrência
12. `src/hooks/useCargos.ts` - 2 ocorrências
13. `src/hooks/useProcesses.ts` - 1 ocorrência
14. `src/hooks/useQualidades.ts` - 1 ocorrência
15. `src/hooks/useWhatsApp.ts` - 1 ocorrência
16. `src/hooks/useDiscTest.ts` - 4 ocorrências
17. `src/components/TimeClockWidget.tsx` - 1 ocorrência
18. `src/hooks/useTrainings.ts` - 1 ocorrência
19. `src/hooks/useQuizzes.ts` - 2 ocorrências
20. `src/hooks/useProducts.ts` - 2 ocorrências
21. `src/hooks/useMarcasModelosSupabase.ts` - 2 ocorrências
22. `src/hooks/useLessonProgress.ts` - 1 ocorrência
23. `src/components/trainings/ImprovedLessonPlayer.tsx` - 1 ocorrência
24. `src/utils/pdfGenerator.ts` - 1 ocorrência
25. `src/pages/Reports.tsx` - 1 ocorrência
26. `src/pages/ProcessView.tsx` - 1 ocorrência
27. `src/pages/ProcessEdit.tsx` - 1 ocorrência
28. `src/pages/pdv/Relatorios.tsx` - 1 ocorrência
29. `src/pages/pdv/NovaVenda.tsx` - 3 ocorrências
30. `src/pages/pdv/Caixa.tsx` - 2 ocorrências
31. `src/pages/DashboardGestao.tsx` - 1 ocorrência
32. `src/pages/CandidateDiscResult.tsx` - 3 ocorrências
33. `src/hooks/useUsers.ts` - 1 ocorrência
34. `src/hooks/useTimeClock.ts` - 2 ocorrências
35. `src/hooks/useTags.ts` - 1 ocorrência
36. `src/hooks/usePositions.ts` - 1 ocorrência
37. `src/hooks/useOrdensServicoSupabase.ts` - 4 ocorrências
38. `src/hooks/useNPS.ts` - 2 ocorrências
39. `src/hooks/useDepartments.ts` - 1 ocorrência
40. `src/hooks/useItensOSSupabase.ts` - 1 ocorrência
41. `src/hooks/useLessons.ts` - 1 ocorrência
42. `src/hooks/useGoals.ts` - 2 ocorrências
43. `src/hooks/useCupomConfig.ts` - 1 ocorrência
44. `src/hooks/useChecklistConfig.ts` - 1 ocorrência
45. `src/hooks/useCandidateEvaluations.ts` - 1 ocorrência
46. `src/hooks/useCalendarEvents.ts` - 1 ocorrência
47. `src/components/UserPermissionsManager.tsx` - 8 ocorrências
48. `src/components/TimeSheetManager.tsx` - 1 ocorrência
49. `src/components/trainings/GamificationPanel.tsx` - 3 ocorrências
50. `src/components/TeamPermissionsManager.tsx` - 1 ocorrência
51. `src/components/RolesManager.tsx` - 4 ocorrências
52. `src/components/PersonalNPSReport.tsx` - 1 ocorrência
53. `src/components/financeiro/AccountsReceivableManager.tsx` - 1 ocorrência
54. `src/components/DiscTestEvolution.tsx` - 1 ocorrência
55. `src/components/DiscTestHistory.tsx` - 1 ocorrência
56. `src/components/Dashboard.tsx` - 1 ocorrência
57. `src/components/CandidateEvaluationModal.tsx` - 1 ocorrência
58. `src/components/assistencia/ProductFormOptimized.tsx` - 2 ocorrências
59. `src/components/AdminTimeClockManager.tsx` - 1 ocorrência
60. `src/components/AdminDiscManager.tsx` - 4 ocorrências

**Total:** ~141 ocorrências de sintaxe incorreta

---

## 📋 ARQUIVOS QUE AINDA USAM HOOKS COM NOME "SUPABASE"

Estes arquivos importam hooks com nome "Supabase" mas podem estar usando `from()` corretamente:

1. `src/pages/assistencia/Clientes.tsx` - `useClientesSupabase`
2. `src/pages/pdv/NovaVenda.tsx` - `useClientesSupabase`, `useOrdensServicoSupabase`, `useProdutosSupabase`
3. `src/pages/assistencia/OrdensServico.tsx` - `useOrdensServicoSupabase`, `useClientesSupabase`
4. `src/components/assistencia/ImportarOS.tsx` - `useClientesSupabase`, `useMarcasSupabase`, `useModelosSupabase`, `useOrdensServicoSupabase`
5. `src/pages/Index.tsx` - `useOrdensServicoSupabase`
6. `src/pages/assistencia/MarcasModelos.tsx` - `useMarcasSupabase`, `useModelosSupabase`
7. `src/pages/assistencia/PDV.tsx` - `useOrdensServicoSupabase`, `useProdutosSupabase`, `useClientesSupabase`
8. `src/pages/assistencia/Produtos.tsx` - `useMarcasModelosSupabase`
9. `src/pages/assistencia/OrdemServicoForm.tsx` - `useItensOSSupabase`, `useProdutosSupabase`, `useOrdensServicoSupabase`, `useClientesSupabase`, `useMarcasModelosSupabase`
10. `src/pages/admin/Clientes.tsx` - `useClientesSupabase`
11. `src/pages/admin/OrdensServico.tsx` - `useOrdensServicoSupabase`, `useClientesSupabase`

**Nota:** Estes hooks podem estar usando `from()` corretamente, mas o nome ainda contém "Supabase". Verificar se estão fazendo requests diretas.

---

## 🔧 CORREÇÕES NECESSÁRIAS

### Prioridade ALTA:
1. ✅ Corrigir `CashRegisterSessionsManager.tsx` - USO DIRETO DE `supabase`
2. ✅ Corrigir `useProdutosSupabase.ts` - Sintaxe incorreta
3. ⏳ Corrigir TODOS os 141 casos de `.execute()` antes de outros métodos

### Prioridade MÉDIA:
4. Verificar se hooks com nome "Supabase" estão usando `from()` corretamente
5. Adicionar método `maybeSingle()` se necessário

### Prioridade BAIXA:
6. Renomear hooks de "Supabase" para nomes genéricos (opcional)

---

## 📊 RESUMO

- **Problemas críticos:** 2 encontrados, 2 corrigidos ✅
- **Problemas de sintaxe:** ~141 encontrados, 0 corrigidos ⏳
- **Hooks com nome Supabase:** 11 arquivos (verificar se estão corretos)

---

**Status:** 🔄 **EM CORREÇÃO**

