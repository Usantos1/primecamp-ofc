#!/bin/bash

echo "🔧 RESOLVER TUDO E FAZER DEPLOY"
echo "================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# 1. RESOLVER CONFLITO DO GIT
echo "1. Resolvendo conflitos do Git..."
git fetch origin
# Fazer stash das mudanças locais ou reset hard
if git diff --quiet && git diff --cached --quiet; then
    echo "   Nenhuma mudança local detectada"
else
    echo "   Fazendo stash das mudanças locais..."
    git stash || true
fi
# Reset hard para garantir que está igual ao remoto
git reset --hard origin/main
git clean -fd
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }
echo "✅ Git atualizado"

# 2. MATAR TODOS OS PROCESSOS NA PORTA 3000 (MUITO AGRESSIVO)
echo ""
echo "2. Matando TODOS os processos na porta 3000..."
# Parar PM2 primeiro
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Matar processos Node.js
pkill -9 -f "node.*index.js" 2>/dev/null || true
pkill -9 -f "node.*primecamp" 2>/dev/null || true
pkill -9 node 2>/dev/null || true

# Matar processos na porta 3000 usando fuser
fuser -k 3000/tcp 2>/dev/null || true

# Matar processos na porta 3000 usando lsof
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Matar processos na porta 3000 usando ss/netstat
ss -K dst :3000 2>/dev/null || true

# Aguardar um pouco para garantir que tudo foi morto
sleep 3

# Verificar se ainda há algo na porta 3000
if ss -tulpn | grep -q ":3000"; then
    echo "   ⚠️  AVISO: Ainda há processos na porta 3000!"
    ss -tulpn | grep ":3000"
    echo "   Tentando matar novamente..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
else
    echo "✅ Porta 3000 está livre"
fi

# 3. VERIFICAR/INSTALAR DEPENDÊNCIAS DA API
echo ""
echo "3. Verificando dependências da API..."
cd server || { echo "❌ Erro: Não foi possível entrar no diretório server"; exit 1; }

if [ ! -d "node_modules" ] || [ ! -f "node_modules/express/package.json" ]; then
    echo "   Instalando dependências..."
    npm install || { echo "❌ Erro: npm install falhou"; exit 1; }
    echo "✅ Dependências instaladas"
else
    echo "✅ Dependências já instaladas"
fi

# 4. INICIAR API NO PM2
echo ""
echo "4. Iniciando API no PM2..."
# Garantir que PM2 está limpo
pm2 delete primecamp-api 2>/dev/null || true
sleep 1

# Iniciar API
pm2 start index.js --name primecamp-api || { 
    echo "❌ Erro: Falha ao iniciar API"
    echo "📋 Logs da API:"
    pm2 logs primecamp-api --lines 20 --nostream || true
    exit 1
}

echo "✅ API iniciada no PM2"
sleep 5

# 5. VERIFICAR SE API ESTÁ RESPONDENDO
echo ""
echo "5. Verificando se API está respondendo..."
for i in {1..15}; do
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH" = "200" ]; then
        echo "✅ API está respondendo (200 OK)"
        curl -s http://localhost:3000/api/health | head -3
        break
    fi
    
    # Mostrar logs se falhar várias vezes
    if [ $i -eq 5 ]; then
        echo "   ⚠️  Primeiras tentativas falharam, verificando logs..."
        pm2 logs primecamp-api --lines 20 --nostream | tail -10
    fi
    
    if [ $i -eq 15 ]; then
        echo "❌ ERRO: API não está respondendo após 15 tentativas!"
        echo ""
        echo "📋 ÚLTIMOS LOGS DA API:"
        pm2 logs primecamp-api --lines 50 --nostream
        echo ""
        echo "🔍 Verificando porta 3000:"
        ss -tulpn | grep ":3000" || echo "   Nenhum processo encontrado"
        echo ""
        echo "🔍 Verificando processos Node.js:"
        ps aux | grep node | grep -v grep || echo "   Nenhum processo Node.js encontrado"
        exit 1
    fi
    echo "   Tentativa $i/15 falhou (código: ${HEALTH:-timeout}), aguardando..."
    sleep 2
done

cd ..

# 6. LIMPAR E REBUILDAR FRONTEND
echo ""
echo "6. Limpando builds antigos..."
rm -rf dist node_modules/.vite .vite node_modules/.cache .next build
echo "✅ Limpeza concluída"

echo ""
echo "7. Rebuildando frontend..."
npm run build || { echo "❌ ERRO: Build falhou!"; exit 1; }
echo "✅ Build concluído"

# 8. VERIFICAR BUILD
echo ""
echo "8. Verificando build..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERRO: dist/index.html não foi criado!"
    exit 1
fi
echo "✅ dist/index.html existe"

# 9. COPIAR PARA SERVIDOR
echo ""
echo "9. Copiando para servidor web..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
echo "✅ Arquivos copiados"

# 10. RECARREGAR NGINX
echo ""
echo "10. Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado"

# RESUMO FINAL
echo ""
echo "========================================"
echo "🎉 DEPLOY COMPLETO!"
echo "========================================"
echo ""
echo "📋 STATUS:"
pm2 status | grep primecamp-api
echo ""
echo "🌐 TESTAR AGORA:"
echo "1. Acesse: https://primecamp.cloud/test-auth"
echo "2. Abra em JANELA ANÔNIMA (Ctrl + Shift + N)"
echo "3. Abra Console (F12)"
echo "4. Clique em 'Testar Conexão com API'"
echo "5. Deve aparecer: '✅ API está funcionando!'"
echo ""


