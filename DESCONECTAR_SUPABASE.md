# 🔌 Desconectar Completamente do Supabase

## 🎯 Objetivo

Garantir que **NENHUM dado** seja buscado do Supabase, apenas do PostgreSQL.

## ✅ Solução: Forçar PostgreSQL no Wrapper

Modificar o wrapper para:
1. **Sempre usar PostgreSQL** quando `VITE_DB_MODE=postgres`
2. **Bloquear acesso ao Supabase** para dados (apenas auth permitido)
3. **Lancar erro** se tentar usar Supabase diretamente

## 📋 Arquivos que Ainda Usam Supabase Diretamente

### Críticos (precisam migrar):
- ❌ `useProdutosPaginated.ts` - **AINDA USA SUPABASE**
- ❌ `NotificationManager.tsx` - kv_store_2c4defad
- ❌ `useDashboardConfig.ts` - kv_store_2c4defad
- ❌ `usePDV.ts` - cash_register_sessions
- ❌ `Integration.tsx` - kv_store_2c4defad

### Outros (não críticos):
- Muitos outros hooks de funcionalidades não essenciais

## 🔧 Implementação

1. Modificar `src/integrations/db/client.ts` para bloquear Supabase
2. Migrar `useProdutosPaginated.ts` para PostgreSQL
3. Criar fallback para tabelas que ainda não existem no PostgreSQL

