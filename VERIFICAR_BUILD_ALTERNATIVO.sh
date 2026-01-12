#!/bin/bash
set -e

echo "🔍 Verificando build compilado (múltiplos padrões)..."
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Diretório não encontrado."; exit 1; }

if [ ! -d "dist/assets" ]; then
    echo "❌ Diretório dist/assets não existe. Execute 'npm run build' primeiro."
    exit 1
fi

echo "📁 Procurando padrões nos arquivos JS..."
FOUND=false

for js_file in dist/assets/*.js; do
    if [ -f "$js_file" ]; then
        # Procurar por vários padrões
        if grep -q "showAlreadyAppliedModal\|Candidatura Já Enviada\|setShowAlreadyAppliedModal\|Ver Outras Vagas" "$js_file" 2>/dev/null; then
            echo "✅ ENCONTRADO em: $(basename "$js_file")"
            FOUND=true
            echo ""
            echo "📄 Contexto (primeiras 5 ocorrências):"
            grep -n "showAlreadyAppliedModal\|Candidatura Já Enviada\|setShowAlreadyAppliedModal\|Ver Outras Vagas" "$js_file" | head -5
            break
        fi
    fi
done

if [ "$FOUND" = false ]; then
    echo "❌ Nenhum padrão encontrado nos arquivos JS"
    echo ""
    echo "🔍 Tentando buscar por partes do texto do modal..."
    for js_file in dist/assets/*.js; do
        if [ -f "$js_file" ]; then
            if grep -q "já se candidatou\|Já Enviada\|Outras Vagas" "$js_file" 2>/dev/null; then
                echo "✅ Texto do modal encontrado em: $(basename "$js_file")"
                grep -n "já se candidatou\|Já Enviada\|Outras Vagas" "$js_file" | head -3
                FOUND=true
                break
            fi
        fi
    done
fi

if [ "$FOUND" = false ]; then
    echo "❌ Nenhum padrão encontrado. Listando arquivos JS:"
    ls -lh dist/assets/*.js 2>/dev/null || echo "   Nenhum arquivo .js encontrado"
    exit 1
fi

echo ""
echo "✅ Verificação concluída!"
