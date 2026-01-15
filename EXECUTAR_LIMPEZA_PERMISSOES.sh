#!/bin/bash

# ============================================================
# SCRIPT PARA LIMPAR PERMISSÕES DUPLICADAS NA VPS
# ============================================================

set -e  # Parar se houver erro

echo "🔍 LIMPEZA DE PERMISSÕES DUPLICADAS"
echo "===================================="
echo ""

# 1. Navegar para o diretório do projeto
cd /root/primecamp-ofc || exit 1

# 2. Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# 3. Verificar se os scripts existem
echo ""
echo "📋 Verificando scripts SQL..."
if [ ! -f "sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql" ]; then
    echo "❌ Erro: sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql não encontrado!"
    exit 1
fi

if [ ! -f "sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql" ]; then
    echo "❌ Erro: sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql não encontrado!"
    exit 1
fi

echo "✅ Scripts encontrados!"

# 4. Detectar método de conexão ao banco
echo ""
echo "🔌 Detectando método de conexão ao banco..."

# Verificar se há variáveis de ambiente do banco
if [ -f "server/.env" ]; then
    echo "📄 Arquivo .env encontrado em server/"
    DB_NAME=$(grep -E "^DB_NAME=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
    DB_USER=$(grep -E "^DB_USER=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
    DB_HOST=$(grep -E "^DB_HOST=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
    
    if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        echo "✅ Variáveis de banco detectadas:"
        echo "   DB_NAME: $DB_NAME"
        echo "   DB_USER: $DB_USER"
        echo "   DB_HOST: ${DB_HOST:-localhost}"
        echo ""
        echo "📝 Para executar os scripts SQL:"
        echo ""
        echo "   Opção 1: Via psql (se tiver acesso direto)"
        echo "   sudo -u postgres psql -d $DB_NAME -f sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql"
        echo "   sudo -u postgres psql -d $DB_NAME -f sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql"
        echo ""
        echo "   Opção 2: Via Supabase SQL Editor"
        echo "   - Acesse: https://supabase.com/dashboard"
        echo "   - Vá em SQL Editor"
        echo "   - Cole o conteúdo dos scripts:"
    echo "     cat sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql"
    echo "     cat sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql"
    fi
else
    echo "⚠️  Arquivo .env não encontrado. Usando Supabase?"
    echo ""
    echo "📝 Para executar os scripts SQL:"
    echo "   1. Acesse o painel do Supabase"
    echo "   2. Vá em SQL Editor"
    echo "   3. Execute os comandos abaixo para ver os scripts:"
    echo ""
    echo "   cat sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql"
    echo "   cat sql/LIMPAR_PERMISSOES_DUPLICADAS_AGGRESSIVO.sql"
fi

echo ""
echo "===================================="
echo "📋 PRÓXIMOS PASSOS:"
echo "===================================="
echo ""
echo "1️⃣  Execute PRIMEIRO o script de VERIFICAÇÃO:"
echo "   cat sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql"
echo ""
echo "2️⃣  Analise os resultados (quantas duplicatas existem)"
echo ""
echo "3️⃣  Execute o script de LIMPEZA:"
echo "   cat sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql"
echo ""
echo "4️⃣  Reinicie o backend:"
echo "   cd server && pm2 restart primecamp-api"
echo ""
echo "⚠️  IMPORTANTE: Faça backup do banco antes!"
echo "   pg_dump -U postgres $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""
