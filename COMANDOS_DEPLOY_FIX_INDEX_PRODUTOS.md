# 🚀 Deploy - Correção de Index Errado na Paginação de Produtos

## 📋 O que foi corrigido:
- ✅ Problema de index errado na paginação de produtos
- ✅ Invalidação de cache quando ordenação muda
- ✅ QueryKey do prefetch corrigido para incluir orderBy e orderDirection
- ✅ Cache desabilitado (gcTime: 0) para sempre buscar dados frescos
- ✅ Página resetada automaticamente quando ordenação ou filtros mudam

---

## ⚡ Deploy Rápido (Uma Linha)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && echo "✅ Deploy concluído!"
```

---

## 📝 Deploy Manual (Passo a Passo)

### 1️⃣ Conectar na VPS e Atualizar Código

```bash
ssh usuario@seu-servidor
cd /root/primecamp-ofc
git pull origin main
```

### 2️⃣ Build do Frontend

```bash
cd /root/primecamp-ofc

# Instalar dependências (se necessário)
npm install

# Limpar build anterior
rm -rf dist

# Build do projeto
npm run build
```

### 3️⃣ Deploy no Nginx (COM LIMPEZA DE CACHE)

```bash
# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo find /var/cache/nginx -type f -delete

# Remover TODOS os arquivos antigos do diretório web
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.*

# Aguardar um segundo
sleep 1

# Copiar novos arquivos
sudo cp -r dist/* /var/www/primecamp.cloud/

# Ajustar permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# Testar configuração do Nginx
sudo nginx -t

# Recarregar Nginx (sem restart)
sudo systemctl reload nginx
```

### 4️⃣ Verificar Deploy

```bash
# Verificar se os arquivos foram copiados
ls -lh /var/www/primecamp.cloud/index.html

# Verificar data de modificação
stat /var/www/primecamp.cloud/index.html

# Verificar logs do Nginx (se necessário)
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Reiniciar Backend (Se necessário)

```bash
cd /root/primecamp-ofc/server

# Verificar se PM2 está rodando
pm2 status

# Reiniciar backend
pm2 restart primecamp-api

# Ver logs
pm2 logs primecamp-api --lines 20
```

---

## 🌐 Limpar Cache no Navegador (IMPORTANTE!)

### Chrome/Edge/Brave
1. **Hard Refresh:** `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. **Limpar Cache Completo:**
   - `Ctrl + Shift + Delete`
   - Marque "Imagens e arquivos em cache"
   - Período: "Todo o período"
   - Clique em "Limpar dados"
3. **Modo Anônimo:** `Ctrl + Shift + N` para testar

### Firefox
1. **Hard Refresh:** `Ctrl + Shift + R`
2. **Limpar Cache:** `Ctrl + Shift + Delete` → Marque "Cache" → "Limpar agora"

---

## ✅ Checklist Pós-Deploy

- [ ] Código atualizado (`git pull` executado)
- [ ] Build do frontend concluído sem erros
- [ ] Arquivos copiados para `/var/www/primecamp.cloud/`
- [ ] Cache do Nginx limpo
- [ ] Nginx recarregado sem erros
- [ ] Cache do navegador limpo (Hard Refresh)
- [ ] Testado na página de produtos
- [ ] Verificado que a paginação mostra índices corretos
- [ ] Testado mudança de ordenação (nome/código, asc/desc)
- [ ] Verificado que os produtos aparecem na ordem correta

---

## 🐛 Troubleshooting

### Arquivos não estão sendo atualizados

```bash
# Forçar remoção completa
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.??*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo systemctl reload nginx
```

### Nginx não recarrega

```bash
# Verificar configuração
sudo nginx -t

# Se houver erro, verificar logs
sudo tail -50 /var/log/nginx/error.log

# Forçar restart (se necessário)
sudo systemctl restart nginx
```

### Build falha

```bash
# Limpar node_modules e reinstalar
cd /root/primecamp-ofc
rm -rf node_modules dist
npm cache clean --force
npm install
npm run build
```

### Index ainda está errado após deploy

1. **Limpar cache do navegador completamente:**
   - Fechar todas as abas do site
   - Limpar cache (Ctrl + Shift + Delete)
   - Fazer logout e login novamente

2. **Verificar se o build foi atualizado:**
   ```bash
   # Verificar data do index.html
   ls -lh /var/www/primecamp.cloud/index.html
   
   # Verificar hash dos arquivos JS
   ls -lh /var/www/primecamp.cloud/assets/ | head -5
   ```

3. **Forçar reload do Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

---

## 📊 Comandos Úteis

### Verificar Status do Deploy

```bash
# Verificar arquivos no diretório web
ls -la /var/www/primecamp.cloud/ | head -20

# Verificar assets
ls -la /var/www/primecamp.cloud/assets/ | head -10

# Verificar logs do Nginx
sudo tail -20 /var/log/nginx/access.log
sudo tail -20 /var/log/nginx/error.log
```

### Verificar Backend

```bash
pm2 status
pm2 logs primecamp-api --lines 30
```

---

**Data de criação:** $(date)
**Commits:**
- 550999e - fix: corrigir problema de index errado na paginação de produtos
- 5495eee - fix: corrigir exibição de índices durante carregamento inicial
