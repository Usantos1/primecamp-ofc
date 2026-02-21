# Comandos VPS - Deploy Frontend (Fix Vagas)

## ⚠️ IMPORTANTE
O erro `showAlreadyAppliedModal is not defined` é um erro do **FRONTEND**, não do backend!

O código já foi corrigido no repositório, mas precisa ser compilado e implantado no VPS.

## Comandos para Fazer Deploy do Frontend

Execute no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
npm run build
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo systemctl reload nginx
```

## 🧹 LIMPAR CACHE DO NAVEGADOR

Após o deploy, **LIMPE O CACHE DO NAVEGADOR**:

1. **Chrome/Edge**: `Ctrl + Shift + Delete` ou `Ctrl + F5` (hard refresh)
2. **Firefox**: `Ctrl + Shift + Delete` ou `Ctrl + F5`
3. Ou abra em janela anônima/privada para testar

## Comando Completo (Copiar e Colar)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo systemctl reload nginx && echo "✅ Frontend atualizado! Agora limpe o cache do navegador (Ctrl+F5)"
```

## Verificar se Funcionou

Após o deploy e limpar o cache:
1. Acesse: https://primecamp.cloud/vaga/[qualquer-slug]
2. A página deve carregar sem erros
3. O formulário de candidatura deve funcionar normalmente
