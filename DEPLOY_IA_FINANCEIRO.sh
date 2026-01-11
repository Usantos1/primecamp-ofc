#!/bin/bash

# ============================================
# DEPLOY: Sistema IA-First Financeiro
# ============================================
# Script para deploy completo do sistema financeiro com IA
# ============================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do sistema IA-First Financeiro..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretórios
PROJECT_DIR="/root/primecamp-ofc"
SERVER_DIR="$PROJECT_DIR/server"
SQL_DIR="$PROJECT_DIR/sql"

# ============================================
# 1. ATUALIZAR CÓDIGO DO REPOSITÓRIO
# ============================================
echo -e "${YELLOW}📥 Atualizando código do repositório...${NC}"
cd $PROJECT_DIR
git pull origin main || {
  echo -e "${RED}❌ Erro ao fazer git pull${NC}"
  exit 1
}
echo -e "${GREEN}✅ Código atualizado${NC}"

# ============================================
# 2. APLICAR MIGRAÇÃO SQL
# ============================================
echo -e "${YELLOW}🗄️  Aplicando migração SQL...${NC}"
if [ -f "$SQL_DIR/CRIAR_TABELAS_IA_FINANCEIRO.sql" ]; then
  sudo -u postgres psql -d banco_gestao -f "$SQL_DIR/CRIAR_TABELAS_IA_FINANCEIRO.sql" || {
    echo -e "${RED}❌ Erro ao aplicar migração SQL${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Migração SQL aplicada${NC}"
else
  echo -e "${YELLOW}⚠️  Arquivo de migração não encontrado, pulando...${NC}"
fi

# ============================================
# 3. INSTALAR DEPENDÊNCIAS DO BACKEND
# ============================================
echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd $SERVER_DIR
npm install --production || {
  echo -e "${RED}❌ Erro ao instalar dependências do backend${NC}"
  exit 1
}
echo -e "${GREEN}✅ Dependências do backend instaladas${NC}"

# ============================================
# 4. REINICIAR BACKEND
# ============================================
echo -e "${YELLOW}🔄 Reiniciando backend...${NC}"
pm2 restart primecamp-api || {
  echo -e "${RED}❌ Erro ao reiniciar backend${NC}"
  exit 1
}
sleep 3
pm2 logs primecamp-api --lines 30 --nostream | tail -20
echo -e "${GREEN}✅ Backend reiniciado${NC}"

# ============================================
# 5. INSTALAR DEPENDÊNCIAS DO FRONTEND
# ============================================
echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
cd $PROJECT_DIR
npm install || {
  echo -e "${RED}❌ Erro ao instalar dependências do frontend${NC}"
  exit 1
}
echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"

# ============================================
# 6. BUILD DO FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Fazendo build do frontend...${NC}"
npm run build || {
  echo -e "${RED}❌ Erro no build do frontend${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build do frontend concluído${NC}"

# ============================================
# 7. LIMPAR CACHE DO NGINX
# ============================================
echo -e "${YELLOW}🧹 Limpando cache do Nginx...${NC}"
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.* 2>/dev/null || true
sleep 1
echo -e "${GREEN}✅ Cache do Nginx limpo${NC}"

# ============================================
# 8. COPIAR ARQUIVOS DO BUILD
# ============================================
echo -e "${YELLOW}📁 Copiando arquivos do build...${NC}"
sudo cp -r $PROJECT_DIR/dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
echo -e "${GREEN}✅ Arquivos copiados${NC}"

# ============================================
# 9. VERIFICAR E RECARREGAR NGINX
# ============================================
echo -e "${YELLOW}🔍 Verificando configuração do Nginx...${NC}"
sudo nginx -t || {
  echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
  exit 1
}
sudo systemctl reload nginx || {
  echo -e "${RED}❌ Erro ao recarregar Nginx${NC}"
  exit 1
}
echo -e "${GREEN}✅ Nginx recarregado${NC}"

# ============================================
# 10. VERIFICAR STATUS DOS SERVIÇOS
# ============================================
echo -e "${YELLOW}🔍 Verificando status dos serviços...${NC}"
echo ""
echo "Status do PM2:"
pm2 status
echo ""
echo "Status do Nginx:"
sudo systemctl status nginx --no-pager -l | head -10

# ============================================
# CONCLUSÃO
# ============================================
echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📊 Sistema IA-First Financeiro disponível em:"
echo "   - Dashboard: https://primecamp.cloud/financeiro"
echo "   - Recomendações: https://primecamp.cloud/financeiro/recomendacoes"
echo "   - Estoque: https://primecamp.cloud/financeiro/estoque"
echo "   - Vendedores: https://primecamp.cloud/financeiro/vendedores"
echo "   - Produtos: https://primecamp.cloud/financeiro/produtos"
echo "   - Previsões: https://primecamp.cloud/financeiro/previsoes"
echo "   - DRE: https://primecamp.cloud/financeiro/dre"
echo "   - Planejamento: https://primecamp.cloud/financeiro/planejamento"
echo ""
echo "📝 Logs do backend:"
echo "   pm2 logs primecamp-api --lines 50"
echo ""
