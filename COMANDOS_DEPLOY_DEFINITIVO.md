# 🔥 DEPLOY DEFINITIVO - Resolver Cache de Uma Vez

## ⚠️ PROBLEMA: Cache do navegador não atualiza mesmo após deploy

## ✅ SOLUÇÃO: Script Automatizado Completo

### Execute este comando na VPS:

```bash
cd /root/primecamp-ofc && chmod +x FORCAR_ATUALIZACAO_COMPLETA.sh && ./FORCAR_ATUALIZACAO_COMPLETA.sh
```

### OU execute manualmente:

```bash
cd /root/primecamp-ofc
rm -rf dist node_modules/.vite
git pull origin main
npm cache clean --force
npm install
npm run build
sudo systemctl stop nginx
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.*
sudo find /var/www/primecamp.cloud -mindepth 1 -delete 2>/dev/null || true
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
TIMESTAMP=$(date +%s)
sudo sed -i "s|src=\"/assets/|src=\"/assets/?v=$TIMESTAMP|g" /var/www/primecamp.cloud/index.html
sudo sed -i "s|href=\"/assets/|href=\"/assets/?v=$TIMESTAMP|g" /var/www/primecamp.cloud/index.html
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
echo "✅ Deploy concluído com versionamento: ?v=$TIMESTAMP"
```

---

## 🌐 NO NAVEGADOR - Passos OBRIGATÓRIOS

### 1. Limpar TUDO do navegador:

**Chrome/Edge:**
1. Abra DevTools: `F12`
2. Vá em **Application** (ou **Aplicativo**)
3. No menu esquerdo, clique em **Storage** (ou **Armazenamento**)
4. Clique em **Clear site data** (ou **Limpar dados do site**)
5. Marque **TUDO**: Cache, Cookies, Local Storage, Session Storage, Service Workers
6. Clique em **Clear site data**

**OU use modo anônimo:**
- `Ctrl + Shift + N` (Chrome/Edge)
- Acesse: `https://primecamp.cloud/produtos`

### 2. Verificar Service Workers:

1. No DevTools → **Application** → **Service Workers**
2. Se houver algum registrado, clique em **Unregister**
3. Recarregue a página: `Ctrl + Shift + R`

### 3. Verificar no Console:

Abra o Console (F12 → Console) e você DEVE ver:
```
✅ Service Worker desregistrado: ...
✅ Cache deletado: ...
✅ Versão da aplicação atualizada: v...
```

### 4. Verificar arquivo JS carregado:

No Console, execute:
```javascript
console.log(document.querySelector('script[src*="index-"]')?.src);
```

Deve mostrar algo como:
```
https://primecamp.cloud/assets/index-B2StyxFt.js?v=1234567890
```

**NÃO deve mostrar:** `index-BTnGtZKu.js` (antigo)

---

## 🔍 Verificar se Funcionou

1. **Acesse:** `https://primecamp.cloud/produtos`
2. **Clique nos três pontos (⋯) de qualquer produto**
3. **DEVE aparecer:** "Abrir", **"Clonar"**, "Inativar", "Excluir"
4. **NÃO deve aparecer apenas:** "Abrir", "Inativar", "Excluir"

---

## 🚨 Se AINDA não funcionar

### Opção 1: Verificar se o arquivo foi atualizado no servidor

```bash
# Na VPS
ls -lh /var/www/primecamp.cloud/assets/ | grep "index-.*\.js" | grep -v "\.es\.js"
grep -o 'assets/index-[^"]*\.js' /var/www/primecamp.cloud/index.html | head -1
```

Os dois devem mostrar o **mesmo hash**.

### Opção 2: Forçar novo build com timestamp

```bash
cd /root/primecamp-ofc
touch src/main.tsx
npm run build
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo systemctl restart nginx
```

### Opção 3: Verificar configuração do Nginx

```bash
sudo nano /etc/nginx/sites-available/primecamp.cloud
```

Adicione dentro do bloco `server {`:

```nginx
location ~* \.(html|js|css)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

Depois:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📋 Checklist Final

- [ ] Script executado na VPS
- [ ] Build concluído sem erros
- [ ] Arquivos copiados para `/var/www/primecamp.cloud/`
- [ ] Versionamento adicionado (?v=timestamp)
- [ ] Nginx reiniciado (não apenas reload)
- [ ] Cache do navegador limpo COMPLETAMENTE
- [ ] Service Workers desregistrados
- [ ] Testado em modo anônimo
- [ ] Console mostra mensagens de desregistro
- [ ] Arquivo JS correto sendo carregado
- [ ] Opção "Clonar" aparece no menu

---

**IMPORTANTE:** O código agora inclui desregistro automático de Service Workers. Após o deploy, o navegador vai desregistrar automaticamente qualquer Service Worker antigo na próxima vez que carregar a página.
