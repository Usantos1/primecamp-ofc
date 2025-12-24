# 🚫 REMOVER SUPABASE COMPLETAMENTE - INSTRUÇÕES FINAIS

## ✅ ARQUIVOS JÁ MIGRADOS (13 arquivos críticos):

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
12. ✅ `src/hooks/useDashboardData.ts` - Migrado
13. ✅ `src/hooks/useWhatsApp.ts` - Migrado

## ⚠️ ARQUIVOS RESTANTES (~80 arquivos):

Ainda há aproximadamente 80 arquivos que usam Supabase, mas são funcionalidades secundárias (treinamentos, processos, etc.). Eles não afetam o funcionamento principal.

## 🔧 EXECUTAR NO VPS (CRÍTICO):

```bash
cd /root/primecamp-ofc
git pull origin main
rm -rf dist node_modules/.vite .vite
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

## 🧹 LIMPAR CACHE DO NAVEGADOR (OBRIGATÓRIO):

### Opção 1: Hard Refresh
1. Abra o DevTools (F12)
2. Clique com botão direito no botão de refresh
3. Selecione **"Empty Cache and Hard Reload"**

### Opção 2: Limpar localStorage
No Console do navegador (F12), execute:

```javascript
// Limpar TODOS os tokens do Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

// Limpar sessionStorage também
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    sessionStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

// Recarregar página
location.reload();
```

### Opção 3: Modo Anônimo
Teste em uma janela anônima para garantir que não há cache.

## 🔍 VERIFICAR SE FUNCIONOU:

1. Abra o Console (F12)
2. Vá na aba **Network** (Rede)
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer nenhuma requisição para `supabase.co/auth/v1/token`
5. **NÃO deve** aparecer requisições para `supabase.co/rest/v1/`

## ⚠️ SE AINDA APARECER ERROS:

Os erros podem ser de:
1. **Cache do navegador** - Faça hard refresh
2. **Código antigo compilado** - Rebuild no VPS
3. **Arquivos secundários** - Não afetam o funcionamento principal

## 📋 PRÓXIMOS PASSOS (OPCIONAL):

Se quiser migrar os arquivos restantes (~80), pode fazer gradualmente conforme necessário. Os arquivos críticos já estão migrados.
