#!/bin/bash
# Script para executar os scripts SQL do sistema de revenda na ordem correta (VERSÃO CORRIGIDA)

echo "=========================================="
echo "INSTALANDO SISTEMA DE REVENDA"
echo "=========================================="
echo ""

# Verificar se está conectado ao banco correto
echo "1. Verificando conexão com banco de dados..."
psql -U postgres -d postgres -c "SELECT version();" || {
    echo "ERRO: Não foi possível conectar ao PostgreSQL"
    exit 1
}

echo ""
echo "2. Criando tabelas do sistema de revenda..."
psql -U postgres -d postgres -f CRIAR_SISTEMA_REVENDA_CORRIGIDO.sql || {
    echo "ERRO: Falha ao criar tabelas do sistema de revenda"
    exit 1
}

echo ""
echo "3. Adicionando company_id nas tabelas existentes..."
psql -U postgres -d postgres -f ADICIONAR_COMPANY_ID_TABELAS_CORRIGIDO.sql || {
    echo "ERRO: Falha ao adicionar company_id nas tabelas"
    exit 1
}

echo ""
echo "4. Verificando instalação..."
psql -U postgres -d postgres -c "
SELECT 
    'Empresas' as tabela, COUNT(*) as registros FROM companies
UNION ALL
SELECT 'Planos', COUNT(*) FROM plans
UNION ALL
SELECT 'Assinaturas', COUNT(*) FROM subscriptions;
"

echo ""
echo "=========================================="
echo "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================="

