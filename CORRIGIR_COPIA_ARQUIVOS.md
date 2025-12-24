# 🔧 Corrigir Cópia de Arquivos Buildados

## ❌ PROBLEMA:

O `grep` não encontrou porque os arquivos JS estão em `dist/assets/`, não em `dist/`.

## ✅ SOLUÇÃO COMPLETA:

### 1. Verificar se arquivos foram copiados

```bash
# Verificar se dist existe e tem arquivos
ls -lh /root/primecamp-ofc/dist/

# Verificar assets
ls -lh /root/primecamp-ofc/dist/assets/ | head -10

# Verificar se foram copiados para /var/www/html/
ls -lh /var/www/html/assets/ | head -10
```

### 2. Copiar arquivos CORRETAMENTE (se não foram copiados)

```bash
# Garantir que o diretório existe
sudo mkdir -p /var/www/html

# Copiar TUDO (incluindo assets/)
sudo cp -r /root/primecamp-ofc/dist/* /var/www/html/

# Verificar permissões
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
```

### 3. Verificar interceptação no código buildado

```bash
# Verificar nos arquivos JS dentro de assets/
grep -i "BLOQUEADA\|Interceptação" /var/www/html/assets/index*.js | head -3

# OU verificar no dist antes de copiar
grep -i "BLOQUEADA\|Interceptação" /root/primecamp-ofc/dist/assets/index*.js | head -3
```

**Se encontrar "BLOQUEADA" ou "Interceptação", o código está correto!**

### 4. Verificar se index.html existe

```bash
# Verificar se index.html foi copiado
ls -lh /var/www/html/index.html

# Ver conteúdo (deve ter referências aos assets)
head -20 /var/www/html/index.html
```

### 5. Reiniciar Nginx (para garantir)

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 6. Limpar cache do Nginx (se necessário)

```bash
# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

## 🔍 VERIFICAÇÃO FINAL:

```bash
# 1. Verificar estrutura de arquivos
ls -lh /var/www/html/ | head -20

# 2. Verificar se interceptação está no código
grep -i "BLOQUEADA" /var/www/html/assets/index*.js | head -1

# 3. Verificar se Nginx está servindo
curl -I http://localhost/ | head -5
```

## ✅ RESULTADO ESPERADO:

- ✅ `/var/www/html/index.html` existe
- ✅ `/var/www/html/assets/` existe e tem arquivos JS
- ✅ `grep` encontra "BLOQUEADA" ou "Interceptação" nos arquivos JS
- ✅ Nginx está rodando e servindo arquivos

## 🚨 SE AINDA NÃO FUNCIONAR:

Verificar configuração do Nginx:

```bash
# Ver configuração ativa
sudo nginx -T | grep -A 5 "server_name primecamp"

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

