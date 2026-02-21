# 🚀 Comandos de Deploy - Tabs Centralizados e Abreviações Expandidas

## ✅ Alteração Commitada

`feat: centralizar tabs/botões e expandir abreviações na OS`

## 📋 O que foi alterado

- ✅ Tabs e botões centralizados (adicionado `justify-center`)
- ✅ Removido `ml-auto` do botão "Salvar"
- ✅ Abreviações expandidas:
  - "Check" → "Checklist"
  - "Resol." → "Resolução"
  - "$" → "Financeiro"

## 📋 Comandos para Deploy na VPS

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 1
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Como Testar

1. Limpe o cache do navegador (`Ctrl + Shift + R` ou `Cmd + Shift + R`)
2. Acesse uma Ordem de Serviço (criar ou editar)
3. Verifique que:
   - Os tabs (Dados, Checklist, Resolução, Peças, Financeiro, Fotos) e botões estão centralizados
   - As abreviações estão expandidas (não aparece mais "Check", "Resol." ou "$")
   - O botão "Salvar" está centralizado junto com os outros elementos
