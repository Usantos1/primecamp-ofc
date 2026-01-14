# 🚀 Deploy FORÇADO - Limpar Cache Completamente

## ⚠️ PROBLEMA: Cache do navegador não está atualizando

O build foi atualizado (hash mudou de `index-BTnGtZKu.js` para `index-B2StyxFt.js`), mas o navegador ainda está usando arquivos antigos.

---

## 🔥 SOLUÇÃO: Deploy Forçado com Limpeza Total

### 1️⃣ Na VPS - Limpar TUDO e Rebuildar

```bash
cd /root/primecamp-ofc

# Limpar TUDO
rm -rf dist node_modules/.vite

# Atualizar código
git pull origin main

# Reinstalar dependências (forçar)
npm cache clean --force
npm install

# Build limpo
npm run build

# Verificar se o build foi criado
ls -lh dist/assets/ | grep index
```

### 2️⃣ Remover TODOS os arquivos antigos do Nginx (INCLUINDO OCULTOS)

```bash
# PARAR o Nginx temporariamente para evitar conflitos
sudo systemctl stop nginx

# Remover TUDO (incluindo arquivos ocultos)
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.*
sudo find /var/www/primecamp.cloud -type f -delete 2>/dev/null
sudo find /var/www/primecamp.cloud -type d -delete 2>/dev/null

# Criar diretório novamente
sudo mkdir -p /var/www/primecamp.cloud

# Copiar novos arquivos
sudo cp -r dist/* /var/www/primecamp.cloud/

# Ajustar permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# Limpar cache do Nginx COMPLETAMENTE
sudo rm -rf /var/cache/nginx/*
sudo find /var/cache/nginx -type f -delete 2>/dev/null
sudo find /var/lib/nginx/cache -type f -delete 2>/dev/null

# INICIAR Nginx
sudo systemctl start nginx

# Verificar status
sudo systemctl status nginx
```

### 3️⃣ Verificar se os arquivos foram atualizados

```bash
# Verificar hash do arquivo JS principal
ls -lh /var/www/primecamp.cloud/assets/ | grep "index-.*\.js"

# Verificar conteúdo do index.html (deve ter o novo hash)
head -50 /var/www/primecamp.cloud/index.html | grep "index-"

# Verificar data de modificação
stat /var/www/primecamp.cloud/index.html
```

---

## 🌐 NO NAVEGADOR - Limpar Cache COMPLETAMENTE

### Chrome/Edge/Brave - Limpeza TOTAL

1. **Abrir DevTools:** `F12`
2. **Clicar com botão direito no botão de recarregar** (ao lado da barra de endereço)
3. **Selecionar "Esvaziar cache e atualizar forçadamente"** (ou "Empty Cache and Hard Reload")
4. **OU fazer manualmente:**
   - `Ctrl + Shift + Delete`
   - Marque **TUDO**: "Imagens e arquivos em cache", "Cookies", "Dados de sites"
   - Período: **"Todo o período"**
   - Clique em **"Limpar dados"**
5. **Fechar TODAS as abas do site**
6. **Abrir em modo anônimo:** `Ctrl + Shift + N`
7. **Acessar:** `https://primecamp.cloud/produtos`
8. **Abrir DevTools (F12) → Aba Network**
9. **Marcar "Desativar cache"**
10. **Recarregar:** `Ctrl + Shift + R`

### Firefox - Limpeza TOTAL

1. **Abrir DevTools:** `F12`
2. **Aba Network → Marcar "Desativar cache"**
3. **Limpar cache:**
   - `Ctrl + Shift + Delete`
   - Marque **"Cache"**
   - Período: **"Tudo"**
   - Clique em **"Limpar agora"**
4. **Fechar TODAS as abas do site**
5. **Abrir em modo privado:** `Ctrl + Shift + P`
6. **Acessar:** `https://primecamp.cloud/produtos`
7. **Recarregar:** `Ctrl + Shift + R`

---

## 🔍 Verificar se Funcionou

### No Console do Navegador (F12)

```javascript
// Verificar qual arquivo JS está sendo carregado
console.log(document.querySelector('script[src*="index-"]')?.src);

// Deve mostrar: https://primecamp.cloud/assets/index-B2StyxFt.js
// NÃO deve mostrar: index-BTnGtZKu.js (antigo)
```

### Verificar se "Clonar" aparece

1. Abrir página de produtos
2. Clicar nos três pontos (⋯) de qualquer produto
3. **DEVE aparecer:** "Abrir", "Clonar", "Inativar", "Excluir"
4. **NÃO deve aparecer apenas:** "Abrir", "Inativar", "Excluir"

---

## 🚨 Se AINDA não funcionar

### Opção 1: Forçar novo hash no build

```bash
cd /root/primecamp-ofc

# Limpar completamente
rm -rf dist node_modules/.vite .vite

# Modificar um arquivo para forçar novo hash
touch src/main.tsx

# Build
npm run build

# Deploy
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo systemctl restart nginx
```

### Opção 2: Adicionar versionamento manual no index.html

```bash
# Editar index.html para adicionar ?v=timestamp
sudo sed -i 's|href="/assets/|href="/assets/?v='$(date +%s)'|g' /var/www/primecamp.cloud/index.html
sudo sed -i 's|src="/assets/|src="/assets/?v='$(date +%s)'|g' /var/www/primecamp.cloud/index.html
```

### Opção 3: Configurar Nginx para não fazer cache de HTML/JS

Editar configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/primecamp.cloud
```

Adicionar dentro do bloco `server {`:

```nginx
location ~* \.(html|js|css)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

Testar e recarregar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 Checklist Final

- [ ] Build executado com sucesso
- [ ] Hash do arquivo JS mudou (verificar com `ls -lh dist/assets/`)
- [ ] Arquivos copiados para `/var/www/primecamp.cloud/`
- [ ] Nginx reiniciado (não apenas reload)
- [ ] Cache do navegador limpo COMPLETAMENTE
- [ ] Testado em modo anônimo/privado
- [ ] DevTools Network com "Desativar cache" marcado
- [ ] Console mostra novo hash do arquivo JS
- [ ] Opção "Clonar" aparece no menu

---

**IMPORTANTE:** Se ainda não funcionar após TODOS esses passos, o problema pode ser:
1. CDN ou proxy intermediário fazendo cache
2. Service Worker do navegador (verificar em DevTools → Application → Service Workers)
3. Extensões do navegador interferindo
