# 🚀 Comandos de Deploy - Destaque Visual de Campos Obrigatórios

## ✅ Alteração Commitada

`feat: adicionar destaque visual (badge e borda vermelha) para campos obrigatórios faltando`

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
2. Tente salvar uma OS sem preencher campos obrigatórios
3. Os campos faltando devem aparecer com:
   - **Label em negrito e vermelho**
   - **Badge vermelho "Obrigatório" ao lado do label**
   - **Borda vermelha de 2px no campo**
   - **Background levemente avermelhado (bg-red-50)**
4. Ao preencher um campo que estava faltando, o destaque deve desaparecer automaticamente
5. O toast também deve aparecer listando todos os campos faltando

## 🔧 O que foi implementado

- Estado `camposFaltandoState` para rastrear quais campos estão faltando
- Badge vermelho "Obrigatório" ao lado do label quando o campo está faltando
- Label em negrito e cor vermelha quando o campo está faltando
- Borda vermelha de 2px e background avermelhado nos campos que estão faltando
- Remoção automática do destaque quando o usuário preenche o campo
