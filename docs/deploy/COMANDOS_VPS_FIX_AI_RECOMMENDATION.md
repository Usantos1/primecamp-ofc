# Comandos VPS - Corrigir Constraint Violation (ai_recommendation)

## 🔧 Problema
Erro 500: `new row for relation "job_interviews" violates check constraint "job_interviews_ai_recommendation_check"`

A constraint do banco permite apenas: `'approved'`, `'rejected'`, `'manual_review'`
Mas o código estava tentando salvar `'review'`.

## ✅ Solução
Código corrigido para mapear `'review'` para `'manual_review'` antes de salvar.

## Execute no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

## Ou em uma linha:

```bash
cd /root/primecamp-ofc && git pull origin main && pm2 restart primecamp-api && echo "✅ Backend atualizado! Verifique os logs: pm2 logs primecamp-api --lines 50"
```
