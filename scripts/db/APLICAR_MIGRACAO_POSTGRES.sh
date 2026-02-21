#!/bin/bash
# Aplicar migração IA-First Financeiro no banco postgres

echo "🗄️  Aplicando migração SQL no banco 'postgres'..."
cd /root/primecamp-ofc

sudo -u postgres psql -d postgres -f sql/CRIAR_TABELAS_IA_FINANCEIRO.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração aplicada com sucesso!"
else
    echo "❌ Erro ao aplicar migração"
    exit 1
fi
