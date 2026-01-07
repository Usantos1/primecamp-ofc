#!/bin/bash
# =====================================================
# INSTALAÇÃO COMPLETA DO SISTEMA DE REVENDA NO VPS
# =====================================================

set -e  # Parar em caso de erro

echo "=========================================="
echo "INSTALANDO SISTEMA DE REVENDA NO VPS"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Atualizar código do repositório
echo -e "${YELLOW}1. Atualizando código do repositório...${NC}"
cd /root/primecamp-ofc || {
    echo -e "${RED}ERRO: Diretório /root/primecamp-ofc não encontrado${NC}"
    exit 1
}

git pull origin main || {
    echo -e "${RED}ERRO: Falha ao atualizar código${NC}"
    exit 1
}

echo -e "${GREEN}✓ Código atualizado${NC}"
echo ""

# 2. Executar script SQL
echo -e "${YELLOW}2. Executando script SQL do sistema de revenda...${NC}"

# Tentar diferentes métodos de conexão PostgreSQL
if psql -U postgres -d postgres -h 72.62.106.76 -f INSTALAR_SISTEMA_REVENDA_COMPLETO.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Script SQL executado com sucesso (método 1)${NC}"
elif PGPASSWORD="${DB_PASSWORD:-postgres}" psql -U postgres -d postgres -h 72.62.106.76 -f INSTALAR_SISTEMA_REVENDA_COMPLETO.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Script SQL executado com sucesso (método 2)${NC}"
elif sudo -u postgres psql -d postgres -f INSTALAR_SISTEMA_REVENDA_COMPLETO.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Script SQL executado com sucesso (método 3)${NC}"
else
    echo -e "${RED}ERRO: Não foi possível executar script SQL${NC}"
    echo -e "${YELLOW}Tentando executar manualmente...${NC}"
    echo ""
    echo "Execute manualmente:"
    echo "  psql -U postgres -d postgres -f INSTALAR_SISTEMA_REVENDA_COMPLETO.sql"
    echo ""
    read -p "Pressione Enter após executar o SQL manualmente..."
fi

echo ""

# 3. Verificar instalação
echo -e "${YELLOW}3. Verificando instalação...${NC}"
if psql -U postgres -d postgres -h 72.62.106.76 -c "SELECT COUNT(*) FROM companies;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Tabelas criadas com sucesso${NC}"
    
    # Mostrar estatísticas
    psql -U postgres -d postgres -h 72.62.106.76 -c "
    SELECT 
        'Empresas' as tabela, COUNT(*) as registros FROM companies
    UNION ALL
    SELECT 'Planos', COUNT(*) FROM plans
    UNION ALL
    SELECT 'Assinaturas', COUNT(*) FROM subscriptions;
    " 2>/dev/null || true
else
    echo -e "${RED}ERRO: Não foi possível verificar instalação${NC}"
fi

echo ""

# 4. Reiniciar servidor Node.js
echo -e "${YELLOW}4. Reiniciando servidor Node.js...${NC}"
cd /root/primecamp-ofc/server || {
    echo -e "${RED}ERRO: Diretório server não encontrado${NC}"
    exit 1
}

# Parar servidor se estiver rodando
pm2 stop primecamp-api 2>/dev/null || true
pm2 delete primecamp-api 2>/dev/null || true

# Aguardar um pouco
sleep 2

# Iniciar servidor
pm2 start index.js --name primecamp-api || {
    echo -e "${RED}ERRO: Falha ao iniciar servidor${NC}"
    exit 1
}

# Aguardar iniciar
sleep 5

# Verificar status
pm2 status primecamp-api

echo ""
echo -e "${GREEN}=========================================="
echo -e "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo -e "==========================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Acesse o painel de revenda em: /admin/revenda"
echo "2. Verifique os logs: pm2 logs primecamp-api"
echo "3. Teste a API: curl http://localhost:3000/api/admin/revenda/plans"
echo ""

