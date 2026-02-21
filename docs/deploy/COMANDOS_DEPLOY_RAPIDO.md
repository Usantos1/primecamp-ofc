# 🚀 Comandos Rápidos para Deploy (com limpeza de cache)

## ⚡ Deploy Automático (Recomendado)

```bash
# Conectar na VPS
ssh usuario@seu-servidor

# Navegar para o diretório
cd /root/primecamp-ofc

# Dar permissão de execução (primeira vez apenas)
chmod +x DEPLOY_COMPLETO_CACHE.sh

# Executar deploy completo
./DEPLOY_COMPLETO_CACHE.sh
```

---

## 📝 Deploy Manual (Passo a Passo)

### 1️⃣ Conectar e Atualizar Código

```bash
ssh usuario@seu-servidor
cd /root/primecamp-ofc
git pull origin main
```

### 2️⃣ Backend

```bash
cd /root/primecamp-ofc/server
npm install
pm2 restart primecamp-api
pm2 status
```

### 3️⃣ Frontend (COM LIMPEZA DE CACHE)

```bash
cd /root/primecamp-ofc

# Instalar dependências
npm install

# Limpar build anterior
rm -rf dist

# Build
npm run build

# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo find /var/cache/nginx -type f -delete

# Remover TODOS os arquivos antigos (incluindo arquivos ocultos)
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

---

## 🔧 Comandos Adicionais (Se necessário)

### Limpar Cache do Nginx Manualmente

```bash
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

### Verificar Arquivos no Nginx

```bash
ls -la /var/www/primecamp.cloud/
ls -la /var/www/primecamp.cloud/assets/ | head -20
```

### Verificar Logs do Nginx

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Verificar Backend

```bash
pm2 logs primecamp-api --lines 50
pm2 status
```

### Verificar se o Build foi atualizado

```bash
# Verificar data de modificação do index.html
ls -lh /var/www/primecamp.cloud/index.html

# Verificar conteúdo do index.html (primeiras linhas)
head -20 /var/www/primecamp.cloud/index.html
```

---

## 🌐 Limpar Cache no Navegador (CLIENTE)

### Chrome/Edge/Brave

1. **Hard Refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Limpar Cache Completo:**
   - `Ctrl + Shift + Delete` (Windows/Linux) ou `Cmd + Shift + Delete` (Mac)
   - Marque "Imagens e arquivos em cache"
   - Período: "Última hora" ou "Todo o período"
   - Clique em "Limpar dados"

3. **Modo Anônimo/Privado:**
   - `Ctrl + Shift + N` (Chrome/Edge) ou `Ctrl + Shift + P` (Firefox)
   - Teste em nova aba anônima

### Firefox

1. **Hard Refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Limpar Cache:**
   - `Ctrl + Shift + Delete`
   - Marque "Cache"
   - Clique em "Limpar agora"

---

## ✅ Checklist Pós-Deploy

- [ ] Backend reiniciado (pm2 status mostra online)
- [ ] Build do frontend concluído sem erros
- [ ] Arquivos copiados para `/var/www/primecamp.cloud/`
- [ ] Nginx recarregado sem erros
- [ ] Cache do navegador limpo
- [ ] Logout e Login feito novamente
- [ ] Testado criar nova OS
- [ ] Validações obrigatórias funcionando (Cor, Condições)
- [ ] Navegação para checklist funcionando
- [ ] ID da OS sendo retornado corretamente (não fica `/os/undefined`)

---

## 🐛 Troubleshooting

### Arquivos não estão sendo atualizados

```bash
# Forçar remoção completa
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.??*
sudo cp -r dist/* /var/www/primecamp.cloud/
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
rm -rf node_modules dist
npm cache clean --force
npm install
npm run build
```

---

**Data de criação:** $(date)
