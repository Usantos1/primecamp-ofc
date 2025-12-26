#!/bin/bash

# Script de deploy para VPS - Atualizar endpoints implementados
# Uso: bash DEPLOY_VPS.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy na VPS..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc || {
    echo -e "${RED}❌ Erro: Diretório /root/primecamp-ofc não encontrado.${NC}"
    exit 1
}

# 2. Atualizar código
echo -e "${YELLOW}📥 Atualizando código do repositório...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Erro ao fazer pull. Verifique se está no diretório correto.${NC}"
    exit 1
}

# 3. Instalar dependências do backend
echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd /root/primecamp-ofc/server
npm install || {
    echo -e "${RED}❌ Erro ao instalar dependências.${NC}"
    exit 1
}

# 4. Criar diretório de uploads
echo -e "${YELLOW}📁 Criando diretório de uploads...${NC}"
mkdir -p /root/primecamp-ofc/server/uploads
chmod 755 /root/primecamp-ofc/server/uploads
echo -e "${GREEN}✅ Diretório uploads criado${NC}"

# 5. Verificar variáveis de ambiente
echo -e "${YELLOW}🔧 Verificando variáveis de ambiente...${NC}"
if [ ! -f ../.env ]; then
    echo -e "${RED}⚠️  Arquivo .env não encontrado. Certifique-se de que existe.${NC}"
else
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
fi

# 6. Verificar se PM2 está instalado
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Reiniciando servidor com PM2...${NC}"
    
    # Verificar se processo existe
    if pm2 list | grep -q "primecamp-api"; then
        pm2 restart primecamp-api
        echo -e "${GREEN}✅ Servidor reiniciado com PM2${NC}"
    else
        echo -e "${YELLOW}⚠️  Processo 'primecamp-api' não encontrado no PM2${NC}"
        echo -e "${YELLOW}   Iniciando novo processo...${NC}"
        pm2 start index.js --name primecamp-api || {
            echo -e "${RED}❌ Erro ao iniciar com PM2. Verifique manualmente.${NC}"
        }
    fi
    
    # Mostrar status
    echo -e "${YELLOW}📊 Status do PM2:${NC}"
    pm2 status
    
    # Mostrar últimos logs
    echo -e "${YELLOW}📋 Últimos logs:${NC}"
    pm2 logs primecamp-api --lines 20 --nostream
    
elif command -v systemctl &> /dev/null; then
    echo -e "${YELLOW}🔄 Reiniciando servidor com systemd...${NC}"
    sudo systemctl restart primecamp-api || {
        echo -e "${RED}❌ Erro ao reiniciar serviço. Verifique manualmente.${NC}"
    }
    sudo systemctl status primecamp-api --no-pager -l
else
    echo -e "${YELLOW}⚠️  PM2 ou systemd não encontrado.${NC}"
    echo -e "${YELLOW}   Você precisa reiniciar o servidor manualmente.${NC}"
fi

# 6. Testar health check
echo -e "${YELLOW}🏥 Testando health check...${NC}"
sleep 2  # Aguardar servidor iniciar

if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    curl -s http://localhost:3000/api/health | head -3
else
    echo -e "${RED}❌ Health check falhou. Verifique os logs.${NC}"
fi

# 7. Resumo final
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar logs: pm2 logs primecamp-api"
echo "   2. Testar endpoints manualmente"
echo "   3. Verificar se uploads funcionam"
echo ""
echo "🔍 Comandos úteis:"
echo "   - Ver logs: pm2 logs primecamp-api --lines 50"
echo "   - Ver status: pm2 status"
echo "   - Reiniciar: pm2 restart primecamp-api"
echo ""

