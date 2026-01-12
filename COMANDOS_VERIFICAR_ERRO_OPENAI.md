# Verificar Erro 500 na OpenAI

O erro 500 ao chamar a API da OpenAI pode ser:
1. API Key incorreta/expirada
2. Modelo 'gpt-5' não existe (OpenAI não tem gpt-5 ainda)
3. Erro no código do servidor

## Verificar logs do backend:

```bash
cd /root/primecamp-ofc/server
pm2 logs primecamp-api --lines 50
```

Procure por mensagens como:
- '[Analyze Candidate]'
- '[OpenAI]'
- Erros relacionados à OpenAI

## Reiniciar backend:

```bash
cd /root/primecamp-ofc/server
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 20
```

## IMPORTANTE: Verificar modelo configurado

O modelo 'gpt-5' não existe! OpenAI tem:
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- o1, o1-mini
- etc

Se estiver configurado 'gpt-5', mude para 'gpt-4o' ou 'gpt-4o-mini' no sistema (Integrações > OpenAI).
