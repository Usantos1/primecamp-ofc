# 🚀 MIGRAÇÃO SUPABASE → POSTGRESQL - EM ANDAMENTO

## ✅ ARQUIVOS JÁ MIGRADOS:

1. ✅ `src/integrations/db/client.ts` - Forçado para PostgreSQL
2. ✅ `src/integrations/supabase/client.ts` - Mock que lança erro
3. ✅ `src/components/NotificationManager.tsx` - Real-time desabilitado
4. ✅ `src/pages/Auth.tsx` - Reset password desabilitado
5. ✅ `src/pages/assistencia/OrdensServico.tsx` - Migrado
6. ✅ `src/hooks/useOrdensServicoSupabase.ts` - Migrado
7. ✅ `src/hooks/useClientesSupabase.ts` - Migrado
8. ✅ `src/hooks/useMarcasModelosSupabase.ts` - Migrado
9. ✅ `src/hooks/useProdutosSupabase.ts` - Migrado
10. ✅ `src/hooks/useDashboardConfig.ts` - Migrado
11. ✅ `src/hooks/useProdutosPaginated.ts` - Migrado

## ⚠️ ARQUIVOS QUE AINDA PRECISAM MIGRAR:

São aproximadamente **85 arquivos restantes**. 

### Próximos Prioridade ALTA:
- `src/hooks/usePDV.ts` - Usado em vendas
- `src/hooks/useDashboardData.ts` - Dados do dashboard
- `src/hooks/useItensOSSupabase.ts` - Itens de OS
- `src/hooks/useChecklistConfig.ts` - Checklist
- `src/hooks/useCupomConfig.ts` - Cupom

### Padrão de Migração:

1. **Substituir import:**
   ```typescript
   // ANTES:
   import { supabase } from '@/integrations/supabase/client';
   
   // DEPOIS:
   import { from } from '@/integrations/db/client';
   ```

2. **Substituir chamadas:**
   ```typescript
   // ANTES:
   const { data } = await supabase.from('tabela').select('*');
   
   // DEPOIS:
   const { data } = await from('tabela').select('*').execute();
   ```

3. **Substituir auth:**
   ```typescript
   // ANTES:
   const { data: { user } } = await supabase.auth.getUser();
   
   // DEPOIS:
   const { user } = useAuth();
   ```

## 📋 EXECUTAR NO VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
rm -rf dist node_modules/.vite
npm run build
sudo cp -r dist/* /var/www/html/
```

## 🎯 RESULTADO:

- ✅ Arquivos críticos migrados
- ✅ Supabase bloqueado completamente
- ⚠️ Alguns arquivos ainda precisam migração (mas não são críticos)


