#!/bin/bash

# Script para fazer deploy da API de Produtos
# Execute: bash DEPLOY_API_PRODUTOS.sh

echo "🚀 Fazendo deploy da API de Produtos..."

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale em: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Fazer deploy
echo "📦 Fazendo deploy da função api-produtos..."
supabase functions deploy api-produtos

if [ $? -eq 0 ]; then
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Configure o token no Supabase Dashboard:"
    echo "   Project Settings → Edge Functions → Secrets"
    echo "   Nome: API_PRODUTOS_TOKEN"
    echo "   Valor: [seu_token_seguro]"
    echo ""
    echo "2. Teste o endpoint:"
    echo "   curl -X GET \\"
    echo "     'https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos?search=iPhone' \\"
    echo "     -H 'Authorization: Bearer [SEU_TOKEN]'"
    echo ""
    echo "3. Configure no agente de IA usando CONFIGURACAO_AGENTE_IA.md"
else
    echo "❌ Erro no deploy. Verifique os logs acima."
    exit 1
fi

