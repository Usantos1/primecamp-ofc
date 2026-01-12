# Comandos VPS - Atualizar Recursos de Regenerar IA

## 1. Atualizar Backend (Node.js/PM2)

```bash
cd /root/primecamp-ofc/server
git pull origin main
npm install
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 20
```

## 2. Atualizar Frontend (Build e Deploy)

```bash
cd /root/primecamp-ofc
git pull origin main
npm run build

# Detectar diretório do Nginx
NGINX_ROOT="/var/www/primecamp.cloud"

# Limpar diretório
sudo rm -rf "$NGINX_ROOT"/*

# Copiar novos arquivos
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# Recarregar Nginx
sudo systemctl reload nginx
```

## 3. Comandos Completos (Copiar e Colar Tudo de Uma Vez)

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
cd server && \
npm install && \
pm2 restart primecamp-api && \
cd .. && \
npm run build && \
sudo rm -rf /var/www/primecamp.cloud/* && \
sudo cp -r dist/* /var/www/primecamp.cloud/ && \
sudo chown -R www-data:www-data /var/www/primecamp.cloud && \
sudo chmod -R 755 /var/www/primecamp.cloud && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído!"
```

## 4. Verificar se está Funcionando

Após o deploy:
1. Acesse: https://primecamp.cloud
2. Vá em Admin > Vagas > [Selecione uma vaga] > Candidatos
3. Verifique se aparece o botão "Regenerar IA" ao lado de "Ver IA"
4. Vá em Admin > Entrevistas
5. Verifique se aparece "Regenerar Perguntas" nas entrevistas que já têm perguntas

## 5. Ver Logs do Backend (Se Precisar Debugar)

```bash
pm2 logs primecamp-api --lines 50
```

## 6. Ver Logs do Nginx (Se Tiver Problemas no Frontend)

```bash
sudo tail -f /var/log/nginx/error.log
```
