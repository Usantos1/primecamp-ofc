# 🚫 REMOVER DEPENDÊNCIA SUPABASE DO PACKAGE.JSON

## ⚠️ PROBLEMA:

O `@supabase/supabase-js` ainda está no `package.json`, o que faz o Vite incluir código Supabase no build mesmo que não esteja sendo usado diretamente.

## ✅ SOLUÇÃO:

### Opção 1: Remover completamente (RECOMENDADO)

```bash
npm uninstall @supabase/supabase-js
```

**ATENÇÃO:** Isso pode quebrar se algum código ainda importar diretamente do pacote. Verifique primeiro:

```bash
grep -r "from '@supabase/supabase-js'" src/
grep -r "from \"@supabase/supabase-js\"" src/
```

### Opção 2: Manter mas não usar (SEGURANÇA)

Se houver código legado que ainda precisa do tipo, mantenha mas garanta que nenhum código importe diretamente.

## 📋 VERIFICAÇÕES:

1. Verificar se há imports diretos:
   ```bash
   grep -r "@supabase/supabase-js" src/
   ```

2. Verificar se há código Supabase no build:
   ```bash
   grep -r "supabase.co/auth/v1/token" dist/assets/*.js
   ```

3. Se não houver imports diretos, pode remover com segurança.

