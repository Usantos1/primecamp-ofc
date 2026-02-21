# Comandos para Deploy na VPS

## ⚡ Deploy Rápido (Uma Linha)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && echo "✅ Deploy concluído!"
```

## 📋 Alterações nesta versão:
- ✅ Removida foto de entrada da OS
- ✅ Checklist mostra apenas problemas encontrados (itens funcionais removidos)
- ✅ Logs de debug adicionados para diagnosticar problema de permissões (nps.view e rh.ponto)
- ✅ Melhorado mapeamento de roles (vendedor → sales) para buscar permissões corretamente

## 📝 Deploy Manual (Passo a Passo) - SEGURO

```bash
# 1. Conectar na VPS
ssh usuario@seu-servidor

# 2. Navegar até o diretório do projeto
cd /root/primecamp-ofc

# 3. Buscar alterações
git fetch origin
git pull origin main

# 4. Instalar dependências (se necessário)
npm install

# 5. Build do frontend
npm run build

# 6. Detectar diretório CORRETO do Nginx
NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud 2>/dev/null | grep "root" | awk '{print $2}' | sed 's/;//' || echo "")
if [ -z "$NGINX_ROOT" ]; then
  NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-enabled/primecamp.cloud* 2>/dev/null | grep "root" | head -1 | awk '{print $2}' | sed 's/;//' || echo "")
fi
if [ -z "$NGINX_ROOT" ]; then
  NGINX_ROOT="/var/www/primecamp.cloud"
fi

echo "📁 Diretório do Nginx: $NGINX_ROOT"

# 7. Criar diretório se não existir
sudo mkdir -p "$NGINX_ROOT"

# 8. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

# 9. Limpar diretório de deploy (CUIDADO!)
sudo rm -rf "$NGINX_ROOT"/* 2>/dev/null || true

# 10. Aguardar um segundo
sleep 1

# 11. Copiar arquivos buildados
sudo cp -r dist/* "$NGINX_ROOT/" 2>/dev/null || {
  echo "❌ Erro ao copiar arquivos!"
  exit 1
}

# 12. Ajustar permissões
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# 13. Testar configuração do Nginx
sudo nginx -t

# 14. Recarregar Nginx
sudo systemctl reload nginx

# 15. Verificar status
sudo systemctl status nginx
```
