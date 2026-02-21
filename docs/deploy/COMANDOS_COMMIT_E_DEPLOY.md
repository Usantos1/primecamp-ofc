# 📦 Comandos para Commit e Deploy

## ⚠️ IMPORTANTE: Primeiro fazer COMMIT e PUSH

As alterações estão apenas no código local. Precisam ser commitadas e enviadas para o repositório ANTES de fazer deploy na VPS.

---

## 1️⃣ Fazer Commit (no seu computador local)

```bash
# Verificar mudanças
git status

# Adicionar todos os arquivos modificados
git add .

# Fazer commit
git commit -m "fix: adicionar validações obrigatórias (cor, condicoes_equipamento) e corrigir retorno de ID ao criar OS"

# Enviar para o repositório
git push origin main
```

---

## 2️⃣ Fazer Deploy na VPS (depois do commit)

```bash
# Conectar na VPS
ssh usuario@seu-servidor

# Navegar para o diretório
cd /root/primecamp-ofc

# Atualizar código do repositório
git pull origin main

# Instalar dependências do backend
cd server
npm install
pm2 restart primecamp-api

# Build do frontend
cd ..
npm install
rm -rf dist
npm run build

# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*

# Remover arquivos antigos
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.*
sleep 1

# Copiar novos arquivos
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# Recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 OU usar o script automático (após commit e push)

```bash
# Na VPS:
cd /root/primecamp-ofc
chmod +x DEPLOY_COMPLETO_CACHE.sh
./DEPLOY_COMPLETO_CACHE.sh
```

---

## ✅ Verificar se funcionou

Após fazer commit, push e deploy:

1. **Limpar cache do navegador** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Fazer logout e login**
4. **Testar criar nova OS:**
   - Deixar "Cor" vazio → deve dar erro
   - Deixar "Condições do Equipamento" vazio → deve dar erro
   - Preencher tudo → deve criar e navegar para checklist

---

**⚠️ Lembre-se: SEMPRE fazer commit e push ANTES de fazer deploy na VPS!**
