# Comandos VPS - Adicionar Rota generate-dynamic-questions

## Problema Corrigido
- Erro 404 na rota `/api/functions/generate-dynamic-questions`
- A rota foi implementada no backend

## Comandos para Atualizar Backend no VPS

Execute no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
npm install  # Só se houver novas dependências (não deve ter)
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

## Verificar se Funcionou

Após reiniciar o backend:
1. Teste a geração de perguntas dinâmicas em uma vaga
2. Verifique os logs do PM2 para garantir que não há erros
3. O endpoint `/api/functions/generate-dynamic-questions` deve responder com status 200

## Comando Completo (Copiar e Colar)

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && pm2 restart primecamp-api && echo "✅ Backend atualizado! Verifique os logs: pm2 logs primecamp-api --lines 50"
```
