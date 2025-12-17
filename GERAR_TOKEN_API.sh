#!/bin/bash

# Script para gerar token seguro para API de Produtos
# Execute: bash GERAR_TOKEN_API.sh

echo "🔐 Gerando token seguro para API de Produtos..."
echo ""

# Tentar usar openssl
if command -v openssl &> /dev/null; then
    TOKEN=$(openssl rand -hex 32)
    echo "✅ Token gerado com sucesso!"
    echo ""
    echo "📋 Configure este token no Supabase:"
    echo "   Dashboard → Project Settings → Edge Functions → Secrets"
    echo ""
    echo "   Nome: API_PRODUTOS_TOKEN"
    echo "   Valor: $TOKEN"
    echo ""
    echo "🔑 Token gerado:"
    echo "$TOKEN"
    echo ""
    echo "⚠️  IMPORTANTE: Guarde este token em local seguro!"
    echo "   Você precisará dele para configurar o agente de IA."
elif command -v node &> /dev/null; then
    TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "✅ Token gerado com sucesso!"
    echo ""
    echo "📋 Configure este token no Supabase:"
    echo "   Dashboard → Project Settings → Edge Functions → Secrets"
    echo ""
    echo "   Nome: API_PRODUTOS_TOKEN"
    echo "   Valor: $TOKEN"
    echo ""
    echo "🔑 Token gerado:"
    echo "$TOKEN"
    echo ""
    echo "⚠️  IMPORTANTE: Guarde este token em local seguro!"
else
    echo "❌ Não foi possível gerar token automaticamente."
    echo "   Use um gerador online ou execute:"
    echo "   openssl rand -hex 32"
    echo "   ou"
    echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    exit 1
fi

