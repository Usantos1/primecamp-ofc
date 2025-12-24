# 🧹 Limpar Cache do Navegador - Passo a Passo

## ✅ CÓDIGO ATUALIZADO NO SERVIDOR

O código foi atualizado e rebuildado com sucesso! Agora precisa limpar o cache do navegador.

## 🔧 SOLUÇÃO COMPLETA:

### 1. Limpar localStorage (Console do Navegador)

Abra o Console (F12) e execute:

```javascript
// Limpar TODOS os tokens do Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

// Verificar se limpou
console.log('Tokens restantes:', Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-')));
```

### 2. Limpar Cache do Navegador

**Chrome/Edge:**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Imagens e arquivos em cache"
3. Período: "Todo o período"
4. Clique em "Limpar dados"

**OU:**

1. Pressione `F12` (abrir DevTools)
2. Clique com botão direito no botão de refresh (↻)
3. Selecione "Esvaziar cache e atualizar forçadamente" (Empty Cache and Hard Reload)

**Firefox:**
1. `Ctrl + Shift + Delete`
2. Selecione "Cache"
3. Período: "Tudo"
4. Clique em "Limpar agora"

### 3. Fechar e Abrir o Navegador

Feche completamente o navegador e abra novamente.

### 4. Testar Login

1. Acesse: `https://primecamp.cloud/auth`
2. Faça login com:
   - Email: `admin@primecamp.com`
   - Senha: Sua senha

### 5. Verificar Network Tab

No Console → Network:
- Filtre por "supabase"
- ❌ **NÃO deve** aparecer `supabase.co/auth/v1/token`
- ✅ **Deve** aparecer `api.primecamp.cloud/api/auth/login`

## 🔍 Se Ainda Aparecer Supabase Auth:

### Verificar se o arquivo foi atualizado no servidor:

```bash
# No VPS, verificar data de modificação
ls -lh /var/www/html/index*.js

# Deve mostrar arquivos com data/hora recente (de hoje)
```

### Verificar conteúdo do arquivo buildado:

```bash
# Verificar se tem o código novo
grep -i "getItem.*null" /var/www/html/index*.js

# Deve encontrar o storage mock
```

### Forçar reload sem cache:

No navegador, abra DevTools (F12) e:
1. Vá em Network
2. Marque "Disable cache"
3. Mantenha DevTools aberto
4. Faça refresh (`F5`)

## ✅ CHECKLIST FINAL:

- [ ] localStorage limpo (tokens Supabase removidos)
- [ ] Cache do navegador limpo
- [ ] Navegador fechado e reaberto
- [ ] Login testado
- [ ] Network tab verificado (sem Supabase Auth)
- [ ] Console verificado (sem erros de Supabase Auth)

## 🎯 RESULTADO ESPERADO:

Após limpar cache completamente:
- ✅ Login funciona via `api.primecamp.cloud/api/auth/login`
- ✅ Token salvo como `auth_token`
- ✅ **ZERO** requisições para `supabase.co/auth/v1/token`
- ✅ Profile carregado do PostgreSQL

