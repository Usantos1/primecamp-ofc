# 🔍 Verificar Arquivos Buildados

## ❌ PROBLEMA:

```
grep: /var/www/html/index*.js: No such file or directory
```

Os arquivos não estão em `/var/www/html/` ou estão em outro lugar.

## ✅ SOLUÇÃO:

### 1. Verificar onde os arquivos foram copiados

```bash
# Verificar se dist existe
ls -lh /root/primecamp-ofc/dist/

# Verificar se arquivos foram copiados
ls -lh /var/www/html/ | head -20

# OU verificar em outro local comum:
ls -lh /var/www/ | head -20
ls -lh /usr/share/nginx/html/ | head -20
```

### 2. Verificar configuração do Nginx

```bash
# Verificar configuração do Nginx
cat /etc/nginx/sites-available/default | grep root
# ou
cat /etc/nginx/sites-enabled/default | grep root
```

Isso vai mostrar onde o Nginx está servindo os arquivos.

### 3. Copiar arquivos para o local correto

Depois de descobrir onde o Nginx está servindo:

```bash
# Se for /var/www/html/
sudo cp -r /root/primecamp-ofc/dist/* /var/www/html/

# Se for outro local, ajuste o caminho
# Exemplo: sudo cp -r /root/primecamp-ofc/dist/* /usr/share/nginx/html/
```

### 4. Verificar se interceptação está no código buildado

```bash
# Verificar no dist (antes de copiar)
grep -i "BLOQUEADA\|Interceptação" /root/primecamp-ofc/dist/assets/index*.js | head -3

# OU depois de copiar para o local correto
grep -i "BLOQUEADA\|Interceptação" /caminho/correto/index*.js | head -3
```

### 5. Reiniciar Nginx (se necessário)

```bash
sudo systemctl restart nginx
# ou
sudo service nginx restart
```

## 🔍 ENCONTRAR ONDE O NGINX ESTÁ SERVIDO:

```bash
# Ver todas as configurações do Nginx
sudo nginx -T | grep root

# Ver processos do Nginx
ps aux | grep nginx

# Ver arquivos de configuração
ls -la /etc/nginx/sites-enabled/
```

## 📋 CHECKLIST:

- [ ] Verificar onde `dist/` foi criado
- [ ] Verificar configuração do Nginx (onde está `root`)
- [ ] Copiar arquivos para o local correto
- [ ] Verificar se interceptação está no código buildado
- [ ] Reiniciar Nginx (se necessário)
- [ ] Testar no navegador

