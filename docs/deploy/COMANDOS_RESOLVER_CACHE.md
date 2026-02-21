# 🔧 Comandos para Resolver Problema de Cache

O problema é que o navegador está usando uma versão antiga do bundle JavaScript em cache.

## ✅ Solução Imediata (No Navegador)

1. **Hard Refresh:**
   - Windows/Linux: `Ctrl + Shift + R` ou `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Limpar Cache do Navegador:**
   - `Ctrl + Shift + Delete` → Limpar dados de navegação
   - Ou testar em uma **aba anônima/privada**

## 🔍 Verificar e Forçar Atualização no Servidor

Execute no servidor:

```bash
cd /root/primecamp-ofc

# Tornar script executável
chmod +x VERIFICAR_E_FORCAR_ATUALIZACAO.sh

# Executar verificação
./VERIFICAR_E_FORCAR_ATUALIZACAO.sh
```

## 📋 Comandos Manuais (Alternativa)

Se preferir executar manualmente:

```bash
cd /root/primecamp-ofc

# Verificar qual bundle está no index.html local
grep -o 'assets/index-[^"]*\.js' dist/index.html | head -3

# Verificar qual bundle está no servidor
sudo grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -3

# Forçar atualização completa
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo "✅ Frontend atualizado!"
```

## 🔍 Verificar Build Local

Para verificar se o build local contém as rotas do financeiro:

```bash
cd /root/primecamp-ofc
grep -r "DashboardExecutivo" dist/assets/*.js | head -3
grep -r "/financeiro" dist/assets/*.js | head -3
```

Se retornar resultados, o build está correto e o problema é apenas cache do navegador.
