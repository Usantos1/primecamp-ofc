#!/bin/bash
set -e

echo "🔍 Verificando se showAlreadyAppliedModal está no build compilado..."
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Diretório não encontrado."; exit 1; }

if [ ! -d "dist/assets" ]; then
    echo "❌ Diretório dist/assets não existe. Execute 'npm run build' primeiro."
    exit 1
fi

echo "📁 Procurando em dist/assets/*.js..."
FOUND=false

for js_file in dist/assets/*.js; do
    if [ -f "$js_file" ]; then
        if grep -q "showAlreadyAppliedModal" "$js_file" 2>/dev/null; then
            echo "✅ ENCONTRADO em: $(basename "$js_file")"
            FOUND=true
            # Mostrar contexto
            echo ""
            echo "📄 Contexto (primeiras 3 ocorrências):"
            grep -n "showAlreadyAppliedModal" "$js_file" | head -3
            break
        fi
    fi
done

if [ "$FOUND" = false ]; then
    echo "❌ showAlreadyAppliedModal NÃO encontrado em nenhum arquivo JS do dist/"
    echo ""
    echo "🔍 Listando arquivos JS no dist/assets:"
    ls -lh dist/assets/*.js 2>/dev/null || echo "   Nenhum arquivo .js encontrado"
    exit 1
fi

echo ""
echo "✅ Verificação concluída! O código está presente no build."
