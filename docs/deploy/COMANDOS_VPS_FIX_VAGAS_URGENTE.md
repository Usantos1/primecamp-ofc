# Comandos VPS - CORRIGIR VAGAS URGENTE

## ⚠️ O código já está corrigido no repositório
O erro `showAlreadyAppliedModal is not defined` já foi corrigido no código.

## 🔧 Comandos para Atualizar no VPS

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

## 🧹 Limpar Cache do Navegador

Após o deploy no VPS, **LIMPE O CACHE DO NAVEGADOR**:

1. **Chrome/Edge**: `Ctrl + Shift + Delete` ou `Ctrl + F5` (hard refresh)
2. **Firefox**: `Ctrl + Shift + Delete` ou `Ctrl + F5`
3. Ou abra em janela anônima/privada para testar

O navegador pode estar usando a versão antiga em cache!

## ✅ Verificar se Funcionou

1. Acesse: https://primecamp.cloud/vaga/[qualquer-slug]
2. A página deve carregar sem erros
3. O formulário de candidatura deve funcionar normalmente

## 📋 Comando Completo (Copiar e Colar)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo systemctl reload nginx && echo "✅ Deploy concluído! Agora limpe o cache do navegador (Ctrl+F5)"
```
