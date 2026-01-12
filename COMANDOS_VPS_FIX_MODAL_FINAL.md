# 🔧 Comando Final para Corrigir Modal - Forçar Inclusão no Build

## Problema
O erro `showAlreadyAppliedModal is not defined` persiste mesmo com o código correto no fonte.

## Solução Aplicada
Adicionado um `useEffect` que referencia explicitamente `showAlreadyAppliedModal` para forçar o Vite a incluí-lo no build, evitando tree-shaking agressivo.

## ⚠️ IMPORTANTE: Verificar Hash do Build

O erro mostra `index-XK54N--J.js`, mas o build mais recente é `index-2a2b2zmu.js`. Isso indica que o navegador está usando uma versão antiga em cache!

## Comando para Deploy:

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
rm -rf dist node_modules/.vite node_modules/.cache .vite && \
npm run build && \
ls -lh dist/assets/index-*.js && \
sudo rm -rf /var/www/primecamp.cloud/* && \
sudo cp -r dist/* /var/www/primecamp.cloud/ && \
sudo chown -R www-data:www-data /var/www/primecamp.cloud && \
sudo chmod -R 755 /var/www/primecamp.cloud && \
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/* && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído! Verifique o hash do arquivo JS acima."
```

## Após o Deploy:

1. **IMPORTANTE**: Verifique o hash do arquivo JS no output do `ls -lh`
2. O arquivo deve ser diferente de `index-XK54N--J.js`
3. **Limpe o cache do navegador completamente**:
   - `Ctrl + Shift + Delete` → Marque "Imagens e arquivos em cache" → "Todo o período"
   - Ou use modo anônimo/privado (recomendado)
4. Acesse: `https://primecamp.cloud/vaga/Aux-tecnico`
5. Verifique o console: o hash do arquivo JS deve corresponder ao novo build

## Se o erro persistir:

Execute este comando para verificar se o código está no build:
```bash
cd /root/primecamp-ofc && grep -o "showAlreadyAppliedModal" dist/assets/index-*.js | head -1
```

Se retornar vazio, o código não está no build (problema de compilação).
Se retornar o texto, o código está no build (problema de cache do navegador).
