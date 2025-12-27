#!/bin/bash

echo "🚀 Deploy da Integração do Telegram"
echo "===================================="
echo ""

# Navegar para o diretório do projeto
cd /root/primecamp-ofc || exit 1

echo "1️⃣ Fazendo pull das alterações..."
git fetch origin
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer pull!"
    exit 1
fi

echo ""
echo "2️⃣ Aplicando script SQL para criar tabelas do Telegram..."
psql -U postgres -d banco_gestao -f CRIAR_TABELAS_FALTANDO.sql

if [ $? -ne 0 ]; then
    echo "⚠️ Aviso: Alguns erros podem ter ocorrido no SQL (tabelas já existentes são normais)"
fi

echo ""
echo "3️⃣ Reiniciando servidor Node.js..."
pm2 restart primecamp || pm2 restart all

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy concluído com sucesso!"
    echo ""
    echo "📋 Verificando status do servidor:"
    pm2 status
else
    echo ""
    echo "⚠️ Verifique se o PM2 está configurado corretamente"
    echo "   Ou reinicie manualmente: node server/index.js"
fi

echo ""
echo "✨ Integração do Telegram configurada!"
echo "   - Tabelas criadas: os_telegram_photos, telegram_config, telegram_messages"
echo "   - Endpoint /api/upsert disponível"
echo "   - Configuração de Chat IDs disponível em: /integracoes"

