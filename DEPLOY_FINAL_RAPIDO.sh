#!/bin/bash

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deploy final do sistema IA-First Financeiro...${NC}"

# 1. Aplicar migração SQL
echo -e "${YELLOW}📥 Aplicando migração SQL...${NC}"
cd /root/primecamp-ofc/server
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Erro: DB_NAME não encontrado no arquivo .env${NC}"
    exit 1
fi

sudo -u postgres psql -d "$DB_NAME" -f ../sql/CRIAR_TABELAS_IA_FINANCEIRO.sql || {
    echo -e "${RED}❌ Erro ao aplicar migração SQL${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migração SQL aplicada com sucesso${NC}"

# 2. Reiniciar backend
echo -e "${YELLOW}🔄 Reiniciando backend...${NC}"
cd /root/primecamp-ofc
pm2 restart all || {
    echo -e "${RED}❌ Erro ao reiniciar backend${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backend reiniciado${NC}"

# 3. Copiar build do frontend
echo -e "${YELLOW}📦 Copiando build do frontend...${NC}"
sudo rm -rf /var/www/primecamp/html/* || true
sudo cp -r dist/* /var/www/primecamp/html/ || {
    echo -e "${RED}❌ Erro ao copiar arquivos do frontend${NC}"
    exit 1
}
sudo chown -R www-data:www-data /var/www/primecamp/html || {
    echo -e "${RED}❌ Erro ao ajustar permissões${NC}"
    exit 1
}
echo -e "${GREEN}✅ Frontend copiado com sucesso${NC}"

# 4. Limpar cache do Nginx
echo -e "${YELLOW}🧹 Limpando cache do Nginx...${NC}"
sudo rm -rf /var/cache/nginx/* || true
sudo systemctl reload nginx || {
    echo -e "${RED}❌ Erro ao recarregar Nginx${NC}"
    exit 1
}
echo -e "${GREEN}✅ Cache do Nginx limpo${NC}"

echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}📊 Acesse /financeiro para usar o novo sistema IA-First Financeiro${NC}"
