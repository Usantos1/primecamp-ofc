#!/bin/bash
# =====================================================
# INSTALAÇÃO RÁPIDA DO SISTEMA DE REVENDA NO VPS
# Versão simplificada com credenciais
# =====================================================

set -e

echo "=========================================="
echo "INSTALANDO SISTEMA DE REVENDA"
echo "=========================================="

cd /root/primecamp-ofc
git pull origin main

export PGPASSWORD='AndinhoSurf2015@'

echo "Executando script SQL..."
psql -U postgres -d postgres -h 72.62.106.76 -p 5432 -f INSTALAR_SISTEMA_REVENDA_COMPLETO.sql

echo "Verificando instalação..."
psql -U postgres -d postgres -h 72.62.106.76 -p 5432 -c "
SELECT 
    'Empresas' as tabela, COUNT(*) as registros FROM companies
UNION ALL
SELECT 'Planos', COUNT(*) FROM plans
UNION ALL
SELECT 'Assinaturas', COUNT(*) FROM subscriptions;
"

echo "Reiniciando servidor..."
cd /root/primecamp-ofc/server
pm2 restart primecamp-api || pm2 start index.js --name primecamp-api

sleep 3
pm2 status primecamp-api

echo ""
echo "=========================================="
echo "INSTALAÇÃO CONCLUÍDA!"
echo "=========================================="

