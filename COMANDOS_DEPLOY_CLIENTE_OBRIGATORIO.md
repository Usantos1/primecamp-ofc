# 🚀 Comandos de Deploy - Cliente Obrigatório

## ✅ Alteração Commitada

`feat: tornar campo Cliente obrigatório com destaque visual e ajustar toast`

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

1. Limpe o cache do navegador (`Ctrl + Shift + R`)
2. Tente salvar uma OS sem selecionar um cliente
3. O campo Cliente deve aparecer com:
   - Label em negrito e vermelho com asterisco (*)
   - Badge vermelho "Obrigatório" ao lado do label
   - Borda vermelha de 2px no campo de busca
   - Background levemente avermelhado (bg-red-50)
4. O toast deve aparecer listando "Cliente" entre os campos obrigatórios
5. O toast deve fechar automaticamente após 5 segundos ou ao clicar no X

## 🔧 O que foi implementado

- Campo Cliente agora é obrigatório (validação no handleSubmit)
- Destaque visual para o campo Cliente quando está faltando (badge, label em negrito/vermelho, borda vermelha, background avermelhado)
- Remoção automática do destaque quando um cliente é selecionado
- Toast ajustado com duração de 5 segundos (já fecha ao clicar no X por padrão do componente)
