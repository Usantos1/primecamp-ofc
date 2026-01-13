# Comandos para Deploy no VPS - Dashboard e Correções

## Correções Implementadas:
1. ✅ Dashboard home - busca vendas com status correto (paid, partial)
2. ✅ CurrencyInput - separadores de milhar BRL durante digitação
3. ✅ Planejamento Anual - correção de salvamento

## Comandos para Executar no VPS:

### 1. Acessar o diretório do projeto
```bash
cd /root/primecamp-ofc
```

### 2. Atualizar código do repositório
```bash
git pull origin main
```

### 3. Instalar dependências (se necessário)
```bash
npm install
```

### 4. Fazer build do frontend
```bash
npm run build
```

### 5. Detectar diretório root do Nginx
```bash
nginx -T 2>/dev/null | grep -E "^\s*root\s" | head -1 | awk '{print $2}' | sed 's/;$//' | sed 's/;//'
```

Ou manualmente verificar em:
```bash
cat /etc/nginx/sites-available/default | grep root
# ou
cat /etc/nginx/nginx.conf | grep root
```

### 6. Copiar arquivos build para Nginx
```bash
NGINX_ROOT="/var/www/primecamp.cloud"

# Limpar diretório antigo
sudo rm -rf $NGINX_ROOT/*

# Copiar arquivos build
sudo cp -r dist/* $NGINX_ROOT/

# Ajustar permissões
sudo chown -R www-data:www-data $NGINX_ROOT
sudo chmod -R 755 $NGINX_ROOT
```

### 7. Reiniciar Nginx
```bash
sudo systemctl reload nginx
# ou
sudo service nginx reload
```

### 8. Reiniciar servidor Node.js (backend)
```bash
# Se estiver usando PM2:
pm2 restart all
# ou
pm2 restart <nome-do-servico>

# Se estiver usando systemd:
sudo systemctl restart <nome-do-servico>

# Se estiver rodando manualmente, parar (Ctrl+C) e iniciar novamente
```

### 9. Verificar logs (opcional)
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Logs do PM2
pm2 logs

# Logs do systemd
sudo journalctl -u <nome-do-servico> -f
```

---

## Comando Único:

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
npm run build && \
NGINX_ROOT="/var/www/primecamp.cloud" && \
sudo rm -rf "$NGINX_ROOT"/* && \
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true && \
sudo rm -rf /var/lib/nginx/cache/* 2>/dev/null || true && \
sudo cp -r dist/* "$NGINX_ROOT/" && \
sudo chown -R www-data:www-data "$NGINX_ROOT" && \
sudo chmod -R 755 "$NGINX_ROOT" && \
sudo systemctl reload nginx && \
pm2 restart all && \
echo "✅ Deploy concluído!"
```

---

## Verificação Pós-Deploy:

1. Limpar cache do navegador (Ctrl+Shift+R ou Ctrl+F5)
2. Verificar dashboard home - deve mostrar dados reais de vendas
3. Verificar inputs de moeda - devem mostrar separadores de milhar
4. Verificar planejamento anual - deve salvar sem erro 500

---

## Se Algo Der Errado:

### Reverter build anterior:
```bash
# Se você tem backup
sudo cp -r /backup/dist/* $NGINX_ROOT/
sudo systemctl reload nginx
```

### Verificar erros no console do navegador:
- Abrir DevTools (F12)
- Verificar Console e Network tabs
- Procurar por erros 500 ou 404

### Verificar status dos serviços:
```bash
sudo systemctl status nginx
pm2 status
# ou
sudo systemctl status <nome-do-servico>
```
