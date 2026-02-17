#!/bin/bash
# Rode na VPS (onde está a API) para verificar se a correção do technician_id está aplicada.
# Uso: bash scripts/verificar-api-technician-id.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Verificando se server/index.js tem a correção (OS sem technician_id obrigatório) ==="
if grep -q "Vendas de OS devem ter technician_id" server/index.js 2>/dev/null; then
  echo "ERRO: O arquivo AINDA exige technician_id. A correção NÃO está aplicada."
  echo "Execute: git fetch origin && git log -1 --oneline origin/main && git reset --hard origin/main"
  echo "Depois: pm2 restart all"
  exit 1
fi

if grep -q "technician_id é opcional" server/index.js 2>/dev/null; then
  echo "OK: A correção está no arquivo (technician_id opcional para OS)."
else
  echo "AVISO: Não encontrado o comentário esperado. Verifique manualmente."
fi

echo ""
echo "=== Diretório de trabalho do PM2 (primecamp-api) ==="
pm2 show primecamp-api 2>/dev/null | grep -E "exec cwd|script path" || echo "Rode: pm2 show primecamp-api"
echo ""
echo "O 'exec cwd' deve ser o mesmo diretório onde você fez git pull (ex: ~/primecamp-ofc)."
echo "Se for diferente, a API está rodando código de outro pasta. Corrija o PM2 ou faça git pull na pasta correta."
