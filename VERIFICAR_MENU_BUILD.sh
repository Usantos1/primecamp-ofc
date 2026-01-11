#!/bin/bash
echo "🔍 Verificando se o menu está no bundle JavaScript..."
echo ""

cd /root/primecamp-ofc

echo "1️⃣ Verificando se FinanceiroNavMenu está no código fonte..."
if grep -r "FinanceiroNavMenu" src/components/financeiro/FinanceiroNavMenu.tsx > /dev/null; then
  echo "  ✅ Componente existe no código fonte"
else
  echo "  ❌ Componente NÃO encontrado no código fonte"
  exit 1
fi

echo ""
echo "2️⃣ Verificando se está sendo importado no DashboardExecutivo..."
if grep -r "FinanceiroNavMenu" src/pages/financeiro/DashboardExecutivo.tsx > /dev/null; then
  echo "  ✅ Componente está sendo importado"
else
  echo "  ❌ Componente NÃO está sendo importado"
  exit 1
fi

echo ""
echo "3️⃣ Verificando se scrollbar-thin está no CSS..."
if grep -r "scrollbar-thin" src/index.css > /dev/null; then
  echo "  ✅ scrollbar-thin está no CSS"
else
  echo "  ❌ scrollbar-thin NÃO está no CSS"
  exit 1
fi

echo ""
echo "4️⃣ Verificando se está no bundle JavaScript deployado..."
if grep -r "FinanceiroNavMenu" /var/www/html/assets/*.js 2>/dev/null | head -1 > /dev/null; then
  echo "  ✅ Componente está no bundle JavaScript deployado"
  grep -r "FinanceiroNavMenu" /var/www/html/assets/*.js 2>/dev/null | head -1
else
  echo "  ❌ Componente NÃO está no bundle JavaScript deployado"
  echo "  ⚠️  Isso significa que o build não incluiu o componente"
  echo "  💡 Solução: Fazer um novo build e deploy"
fi

echo ""
echo "5️⃣ Verificando se scrollbar-thin está no CSS deployado..."
if grep -r "scrollbar-thin" /var/www/html/assets/*.css 2>/dev/null | head -1 > /dev/null; then
  echo "  ✅ scrollbar-thin está no CSS deployado"
  grep -r "scrollbar-thin" /var/www/html/assets/*.css 2>/dev/null | head -1
else
  echo "  ❌ scrollbar-thin NÃO está no CSS deployado"
fi

echo ""
echo "✅ Verificação concluída!"
