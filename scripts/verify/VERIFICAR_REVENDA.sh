#!/bin/bash

# Configurações do banco de dados
DB_HOST="72.62.106.76"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="AndinhoSurf2015@"
DB_PORT="5432"

echo "=========================================="
echo "VERIFICANDO SISTEMA DE REVENDA"
echo "=========================================="

# 1. Verificar se as tabelas existem
echo ""
echo "1. Verificando tabelas..."
export PGPASSWORD="$DB_PASSWORD"
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "
SELECT 
    'companies' as tabela, 
    COUNT(*) as registros 
FROM companies 
WHERE deleted_at IS NULL
UNION ALL
SELECT 
    'plans' as tabela, 
    COUNT(*) as registros 
FROM plans 
WHERE active = true
UNION ALL
SELECT 
    'subscriptions' as tabela, 
    COUNT(*) as registros 
FROM subscriptions 
WHERE status = 'active';
"
unset PGPASSWORD

# 2. Verificar planos disponíveis
echo ""
echo "2. Planos disponíveis:"
export PGPASSWORD="$DB_PASSWORD"
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "
SELECT id, name, code, price_monthly, max_users, active 
FROM plans 
ORDER BY price_monthly ASC;
"
unset PGPASSWORD

# 3. Verificar empresa admin
echo ""
echo "3. Empresa admin:"
export PGPASSWORD="$DB_PASSWORD"
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "
SELECT id, name, email, status 
FROM companies 
WHERE id = '00000000-0000-0000-0000-000000000001';
"
unset PGPASSWORD

echo ""
echo "=========================================="
echo "VERIFICAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "Se não houver planos, execute o script SQL:"
echo "INSTALAR_SISTEMA_REVENDA_COMPLETO.sql"
echo ""
echo "Se as rotas não funcionarem, reinicie o servidor:"
echo "pm2 restart primecamp-api"

