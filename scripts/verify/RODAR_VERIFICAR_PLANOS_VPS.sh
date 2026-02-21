#!/bin/bash

# Configurações do banco de dados
DB_HOST="72.62.106.76"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="AndinhoSurf2015@"
DB_PORT="5432"

echo "=========================================="
echo "VERIFICANDO E CRIANDO PLANOS"
echo "=========================================="

# Executar script SQL
export PGPASSWORD="$DB_PASSWORD"
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f VERIFICAR_E_CRIAR_PLANOS.sql
if [ $? -ne 0 ]; then
    echo "Erro ao executar o script SQL. Verifique os logs acima."
    exit 1
fi
unset PGPASSWORD

echo ""
echo "=========================================="
echo "VERIFICAÇÃO CONCLUÍDA!"
echo "=========================================="

