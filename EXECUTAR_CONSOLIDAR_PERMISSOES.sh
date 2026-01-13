#!/bin/bash

# ============================================================
# EXECUTAR CONSOLIDAÇÃO DE PERMISSÕES NA VPS
# ============================================================

set -e

echo "🔧 CONSOLIDANDO PERMISSÕES DUPLICADAS"
echo "===================================="
echo ""

cd /root/primecamp-ofc || exit 1

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Verificar se o arquivo existe
if [ ! -f "sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql" ]; then
    echo "❌ Erro: sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql não encontrado!"
    exit 1
fi

echo "✅ Arquivo encontrado!"
echo ""

# Executar script SQL
echo "📊 Executando script de consolidação..."
echo ""

# Tentar método 1: sudo -u postgres (local)
if sudo -u postgres psql -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql 2>&1; then
    echo ""
    echo "✅ Script executado com sucesso!"
    exit 0
fi

# Tentar método 2: psql remoto (se o banco estiver em outro servidor)
echo "⚠️  Método local falhou. Tentando conexão remota..."
echo ""

# Verificar se há variáveis de ambiente
if [ -f "server/.env" ]; then
    DB_HOST=$(grep -E "^DB_HOST=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "localhost")
    DB_NAME=$(grep -E "^DB_NAME=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "banco_gestao")
    DB_USER=$(grep -E "^DB_USER=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "postgres")
    DB_PASSWORD=$(grep -E "^DB_PASSWORD=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
    DB_PORT=$(grep -E "^DB_PORT=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "5432")
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql 2>&1; then
            echo ""
            echo "✅ Script executado com sucesso via conexão remota!"
            exit 0
        fi
    fi
fi

echo ""
echo "❌ Erro ao executar script SQL"
echo ""
echo "📝 Execute manualmente:"
echo "   sudo -u postgres psql -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql"
echo ""
echo "   Ou se o banco estiver remoto:"
echo "   export PGPASSWORD='sua_senha'"
echo "   psql -h 72.62.106.76 -U postgres -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql"
echo ""
exit 1
