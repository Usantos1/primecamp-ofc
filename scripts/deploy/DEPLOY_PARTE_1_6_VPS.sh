#!/bin/bash

echo "🚀 DEPLOY - IMPLEMENTAÇÕES PARTE 1-6"
echo "========================================"
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório não encontrado."; exit 1; }

# 1. Atualizar código
echo "1️⃣ Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado."

# 2. Aplicar migrações SQL (OPCIONAL - aplicar manualmente se necessário)
echo ""
echo "2️⃣ ⚠️  IMPORTANTE: Aplicar migrações SQL manualmente:"
echo "   - ADD_SALE_ORIGIN_MIGRATION.sql"
echo "   - ADD_OS_PRINT_FIELDS_MIGRATION.sql"
echo "   - ADD_SALES_PRINT_FIELDS_MIGRATION.sql"
echo "   Execute: psql -U postgres -d seu_banco -f NOME_DA_MIGRACAO.sql"
echo ""

# 3. Instalar dependências do backend
echo "3️⃣ Instalando dependências do backend..."
cd /root/primecamp-ofc/server
npm install
echo "✅ Dependências do backend instaladas."

# 4. Reiniciar backend
echo ""
echo "4️⃣ Reiniciando backend..."
pm2 restart primecamp-api
sleep 3
pm2 status
echo "✅ Backend reiniciado."

# 5. Instalar dependências do frontend (se necessário)
echo ""
echo "5️⃣ Instalando dependências do frontend..."
cd /root/primecamp-ofc
npm install
echo "✅ Dependências do frontend instaladas."

# 6. Build do frontend
echo ""
echo "6️⃣ Fazendo build do frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi
echo "✅ Build concluído."

# 7. Deploy do frontend
echo ""
echo "7️⃣ Copiando arquivos para o Nginx..."
sudo rm -rf /var/www/primecamp.cloud/* 2>/dev/null || true
sudo cp -r dist/* /var/www/primecamp.cloud/
echo "✅ Arquivos copiados."

# 8. Reload Nginx
echo ""
echo "8️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado."

# 9. Verificar logs do backend
echo ""
echo "9️⃣ Verificando logs do backend (últimas 20 linhas)..."
pm2 logs primecamp-api --lines 20 --nostream 2>&1 | tail -25

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo ""
echo "📋 IMPLEMENTAÇÕES DEPLOYADAS:"
echo "  ✅ PARTE 1: Estrutura de vendas (PDV/OS)"
echo "  ✅ PARTE 2: Produto x Serviço"
echo "  ✅ PARTE 3: Relatórios e Indicadores"
echo "  ✅ PARTE 4: Checklist automático + Impressão OS"
echo "  ✅ PARTE 5: Impressão automática PDV"
echo "  ✅ PARTE 6: Melhorias UI/UX"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  1. Aplique as migrações SQL manualmente (veja passo 2)"
echo "  2. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "  3. Faça logout e login novamente"
echo ""
