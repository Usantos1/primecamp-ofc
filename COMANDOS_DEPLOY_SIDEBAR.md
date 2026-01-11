# Comandos de Deploy - Correção do Sidebar

## Problema
O sidebar estava apontando para `/admin/financeiro` (sistema antigo) em vez de `/financeiro` (sistema IA-First).

## Solução
Atualizado `AppSidebar.tsx` para:
- Usar rota `/financeiro`
- Usar permissão `relatorios.financeiro`
- Usar ícone `BarChart3`

## Comandos para Deploy no VPS

```bash
cd /root/primecamp-ofc
git pull origin main
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

## Verificação

Após o deploy, verifique:
1. Acesse o sistema e abra o sidebar
2. Verifique se o item "Financeiro" aparece na seção "FINANCEIRO"
3. Clique no item e verifique se redireciona para `/financeiro`
4. Verifique se a página do Dashboard Executivo carrega corretamente
