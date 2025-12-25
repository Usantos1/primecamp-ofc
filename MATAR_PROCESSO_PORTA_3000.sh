#!/bin/bash

echo "🔧 Corrigindo porta 3000..."

# 1. Parar todos os processos PM2
echo "1. Parando processos PM2..."
pm2 stop all
pm2 delete all

# 2. Matar processo específico na porta 3000 (PID 89446 ou qualquer outro)
echo "2. Matando processos na porta 3000..."
fuser -k 3000/tcp 2>/dev/null || true

# 3. Matar processo Node.js específico se ainda existir
echo "3. Matando processos Node.js órfãos..."
pkill -9 -f "node.*primecamp" || true
pkill -9 -f "node.*index.js" || true

# 4. Verificar se ainda há processos na porta 3000
echo "4. Verificando processos restantes na porta 3000..."
PROCESSES=$(ss -tulpn | grep :3000 | awk '{print $NF}' | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$PROCESSES" ]; then
    echo "⚠️  Ainda há processos na porta 3000: $PROCESSES"
    for PID in $PROCESSES; do
        echo "   Matando processo $PID..."
        kill -9 $PID 2>/dev/null || true
    done
else
    echo "✅ Porta 3000 está livre!"
fi

# 5. Aguardar um pouco
sleep 2

# 6. Verificar novamente
echo "5. Verificação final..."
if ss -tulpn | grep :3000 > /dev/null; then
    echo "❌ AINDA há processos na porta 3000!"
    ss -tulpn | grep :3000
    exit 1
else
    echo "✅ Porta 3000 está completamente livre!"
fi

# 7. Ir para o diretório da API
cd /root/primecamp-ofc/server || exit 1

# 8. Atualizar código
echo "6. Atualizando código..."
git pull origin main

# 9. Instalar dependências se necessário
echo "7. Verificando dependências..."
npm install

# 10. Iniciar API com PM2
echo "8. Iniciando API com PM2..."
pm2 start index.js --name primecamp-api

# 11. Aguardar inicialização
sleep 3

# 12. Verificar status
echo "9. Status do PM2:"
pm2 status

# 13. Ver logs
echo ""
echo "10. Últimas linhas dos logs:"
pm2 logs primecamp-api --lines 10 --nostream

echo ""
echo "✅ Concluído! Verifique os logs acima para confirmar que a API iniciou corretamente."

