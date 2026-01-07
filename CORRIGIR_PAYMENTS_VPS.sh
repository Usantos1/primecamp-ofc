#!/bin/bash
# Corrigir tabela payments no VPS

cd /root/primecamp-ofc
git pull origin main

export PGPASSWORD='AndinhoSurf2015@'

echo "Corrigindo tabela payments..."
psql -U postgres -d postgres -h 72.62.106.76 -p 5432 -f CORRIGIR_TABELA_PAYMENTS.sql

echo "Verificando estrutura da tabela payments..."
psql -U postgres -d postgres -h 72.62.106.76 -p 5432 -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;
"

echo "Concluído!"

