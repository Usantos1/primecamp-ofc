# 🚨 URGENTE: REBUILD E LIMPAR CACHE

## ⚠️ PROBLEMA:

O código buildado no servidor ainda é **ANTIGO** e contém código Supabase. As mensagens de "SUBSCRIBED" no console vêm de código antigo.

## ✅ SOLUÇÃO:

### 1. REBUILD NO VPS (OBRIGATÓRIO):

```bash
cd /root/primecamp-ofc

# Fazer pull do código atualizado
git pull origin main

# LIMPAR TUDO
rm -rf dist node_modules/.vite .vite

# Rebuildar
npm run build

# Copiar para servidor
sudo cp -r dist/* /var/www/html/

# Recarregar nginx
sudo systemctl reload nginx
```

### 2. LIMPAR CACHE DO NAVEGADOR (CRÍTICO):

**NÃO PULE ESTE PASSO!** O navegador está usando código antigo em cache.

#### Opção A: Hard Refresh
1. Abra DevTools (F12)
2. Clique com botão direito no refresh
3. Selecione **"Empty Cache and Hard Reload"**

#### Opção B: Limpar Manualmente
No Console (F12), execute:

```javascript
// Limpar TUDO
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('gogxicjaqpqbhsfzutij')) {
    localStorage.removeItem(key);
    console.log('Removido do localStorage:', key);
  }
});

Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('gogxicjaqpqbhsfzutij')) {
    sessionStorage.removeItem(key);
    console.log('Removido do sessionStorage:', key);
  }
});

// Limpar cookies
document.cookie.split(";").forEach(c => {
  if (c.includes('supabase') || c.includes('sb-')) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    console.log('Removido cookie:', c);
  }
});

// Fechar e abrir navegador completamente
console.log('✅ Cache limpo! Feche e abra o navegador completamente.');
```

### 3. TESTAR EM JANELA ANÔNIMA:

Para garantir que não há cache:
1. Abra uma janela anônima (Ctrl+Shift+N)
2. Acesse `https://primecamp.cloud`
3. Verifique o console

## ✅ VERIFICAR SE FUNCIONOU:

Após rebuild e limpar cache:

1. Abra o Console (F12)
2. Vá na aba **Network** (Rede)
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer NENHUMA requisição para `supabase.co`
5. **NÃO deve** aparecer mensagens de "SUBSCRIBED" no console

## 🎯 CORREÇÕES APLICADAS:

- ✅ `TimeClockWidget.tsx` - Real-time desabilitado
- ✅ Interceptação bloqueia TODAS as requisições Supabase
- ✅ NotificationManager - Real-time desabilitado

## ⚠️ IMPORTANTE:

Se ainda aparecer requisições Supabase após rebuild e limpar cache:
1. Verifique se o build foi feito corretamente
2. Verifique se os arquivos foram copiados para `/var/www/html/`
3. Tente em uma janela anônima
4. Verifique se há Service Workers ativos (Application > Service Workers no DevTools)

