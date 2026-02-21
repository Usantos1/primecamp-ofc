# Problema: Modelo 'gpt-5' não funciona

O modelo 'gpt-5' está configurado mas não está funcionando (retorna resposta vazia).

## Modelos disponíveis na OpenAI:

- `gpt-4o` (recomendado)
- `gpt-4o-mini` (mais barato, recomendado)
- `gpt-4-turbo`
- `gpt-4`
- `o1`, `o1-mini` (só aceitam temperature=1)
- `o3-mini` (só aceita temperature=1)

**O modelo 'gpt-5' NÃO EXISTE!**

## Como corrigir:

1. Acesse o sistema: https://primecamp.cloud/admin/configuracoes
2. Vá em "Integrações" > "OpenAI"
3. Mude o modelo de 'gpt-5' para:
   - `gpt-4o` (melhor qualidade)
   - OU `gpt-4o-mini` (mais barato, boa qualidade)

4. Salve as configurações
5. Tente gerar análise/perguntas novamente

O código já foi corrigido para aceitar temperature=1 para modelos o1/gpt-5, mas o modelo 'gpt-5' simplesmente não existe na API da OpenAI.
