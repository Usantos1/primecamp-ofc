# Página de vendas – ativafix.com

Conteúdo servido em **https://ativafix.com** e **https://www.ativafix.com**.  
O sistema (app) fica em **https://app.ativafix.com**.

## Deploy na VPS

Na VPS, criar a pasta da LP e copiar os arquivos (a partir da raiz do projeto):

```bash
sudo mkdir -p /var/www/ativafix-lp
sudo cp -r landing/* /var/www/ativafix-lp/
sudo chown -R www-data:www-data /var/www/ativafix-lp
sudo chmod -R 755 /var/www/ativafix-lp
```

O Nginx deve estar configurado com `root /var/www/ativafix-lp` para os blocos de `ativafix.com` e `www.ativafix.com` (ver `docs/deploy/NGINX_ATIVAFIX_PASSO_A_PASSO.md`).

## Editar a página

Edite `landing/index.html` (e adicione mais páginas/estilos se quiser). Depois faça o deploy de novo com os comandos acima ou inclua a pasta `landing` no seu script de deploy.
