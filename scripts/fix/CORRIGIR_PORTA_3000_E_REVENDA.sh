#!/bin/bash

echo "🔧 CORRIGINDO PORTA 3000 E REINICIANDO SERVIDOR"
echo "================================================="
echo ""

# 1. Parar PM2
echo "1️⃣ Parando PM2..."
pm2 stop all
pm2 delete all
echo "✅ PM2 parado"
echo ""

# 2. Matar processo na porta 3000
echo "2️⃣ Matando processo na porta 3000..."
PID=$(lsof -ti:3000)
if [ ! -z "$PID" ]; then
    echo "   Processo encontrado: PID $PID"
    kill -9 $PID
    sleep 2
    echo "✅ Processo morto"
else
    echo "   Nenhum processo encontrado na porta 3000"
fi
echo ""

# 3. Verificar se porta está livre
echo "3️⃣ Verificando se porta 3000 está livre..."
if lsof -ti:3000 > /dev/null; then
    echo "⚠️  Porta 3000 ainda em uso, tentando matar novamente..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
fi

if lsof -ti:3000 > /dev/null; then
    echo "❌ ERRO: Não foi possível liberar a porta 3000"
    exit 1
else
    echo "✅ Porta 3000 está livre"
fi
echo ""

# 4. Atualizar código
echo "4️⃣ Atualizando código..."
cd /root/primecamp-ofc
git pull origin main
echo "✅ Código atualizado"
echo ""

# 5. Iniciar servidor
echo "5️⃣ Iniciando servidor..."
cd server
pm2 start index.js --name primecamp-api
sleep 5
echo "✅ Servidor iniciado"
echo ""

# 6. Verificar status
echo "6️⃣ Verificando status..."
pm2 status
echo ""

# 7. Verificar logs
echo "7️⃣ Verificando logs..."
pm2 logs primecamp-api --lines 20 --nostream | tail -20
echo ""

# 8. Testar rota
echo "8️⃣ Testando rota de revenda..."
curl -s http://localhost:3000/api/admin/revenda/test | head -100
echo ""
echo ""

echo "✅ Processo concluído!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Se a rota retornou erro de autenticação (401), está funcionando!"
echo "2. Se retornou 404, verifique os logs acima"
echo "3. Teste com token JWT válido usando o script TESTAR_ROTAS_REVENDA_VPS.sh"

