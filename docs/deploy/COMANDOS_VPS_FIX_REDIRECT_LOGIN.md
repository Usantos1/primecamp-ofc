# 🔧 Comando para Corrigir Redirect para Login em Rotas Públicas

## Problema
Quando tentava se candidatar a uma vaga, a página redirecionava para `/login` mesmo sendo uma rota pública.

## Solução
O cliente da API estava redirecionando para `/login` em qualquer erro 401, mesmo em rotas públicas. Agora ele verifica se a rota atual é pública antes de redirecionar.

## Comando para Deploy:

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
rm -rf dist node_modules/.vite node_modules/.cache .vite && \
npm run build && \
sudo rm -rf /var/www/primecamp.cloud/* && \
sudo cp -r dist/* /var/www/primecamp.cloud/ && \
sudo chown -R www-data:www-data /var/www/primecamp.cloud && \
sudo chmod -R 755 /var/www/primecamp.cloud && \
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/* && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído! Teste em modo anônimo/privado."
```

## Após o Deploy:
1. Teste em modo anônimo/privado do navegador
2. Ou limpe o cache: `Ctrl + Shift + R` (hard refresh)
