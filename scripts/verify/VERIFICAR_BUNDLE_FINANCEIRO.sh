#!/bin/bash

echo "🔍 Verificando se o bundle contém as rotas do financeiro..."
echo ""

cd /root/primecamp-ofc

# Verificar se DashboardExecutivo está no bundle
echo "📦 Verificando 'DashboardExecutivo' no bundle:"
if grep -q "DashboardExecutivo" /var/www/html/assets/index-*.js 2>/dev/null; then
    echo "  ✅ DashboardExecutivo encontrado no bundle"
    grep -o "DashboardExecutivo" /var/www/html/assets/index-*.js | wc -l | xargs echo "  📊 Ocorrências:"
else
    echo "  ❌ DashboardExecutivo NÃO encontrado no bundle"
fi

echo ""
echo "📦 Verificando '/financeiro' no bundle:"
if grep -q "/financeiro" /var/www/html/assets/index-*.js 2>/dev/null; then
    echo "  ✅ Rota '/financeiro' encontrada no bundle"
    grep -o "/financeiro" /var/www/html/assets/index-*.js | wc -l | xargs echo "  📊 Ocorrências:"
else
    echo "  ❌ Rota '/financeiro' NÃO encontrada no bundle"
fi

echo ""
echo "📦 Verificando componentes do financeiro:"
COMPONENTS=("Recomendacoes" "EstoqueInteligente" "AnaliseVendedores" "AnaliseProdutos" "PrevisoesVendas" "DRE" "PlanejamentoAnual" "Precificacao")

for component in "${COMPONENTS[@]}"; do
    if grep -q "$component" /var/www/html/assets/index-*.js 2>/dev/null; then
        echo "  ✅ $component encontrado"
    else
        echo "  ❌ $component NÃO encontrado"
    fi
done

echo ""
echo "✅ Verificação concluída!"
