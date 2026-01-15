# Como Limpar Funções Duplicadas

## Opção 1: Script Direto (Recomendado)

Execute o script direto que faz tudo de uma vez:

```bash
psql -U postgres -d seu_database -f sql/LIMPAR_DUPLICADOS_DIRETO.sql
```

Ou conecte no PostgreSQL e execute:

```sql
\i sql/LIMPAR_DUPLICADOS_DIRETO.sql
```

## Opção 3: Passo a Passo (Para Verificar Antes)

Se quiser ver o que será feito antes de executar:

1. **Ver duplicados:**
```sql
\i sql/LIMPAR_DUPLICADOS_PASSO_A_PASSO.sql
```
(Execute até o PASSO 4 para ver tudo)

2. **Se estiver tudo certo, execute o PASSO 5** (descomente as linhas)

## O que o script faz:

1. ✅ Identifica funções duplicadas (mesmo nome)
2. ✅ Mantém a função com MAIS permissões
3. ✅ Se empatar, mantém a MAIS RECENTE
4. ✅ Se empatar novamente, mantém a MAIS ANTIGA
5. ✅ Atualiza usuários que estavam usando as funções deletadas
6. ✅ Deleta permissões associadas (cascade)
7. ✅ Deleta as funções duplicadas

## Resultado Esperado:

Após executar, você deve ter:
- ✅ Apenas 1 "Gerente" (o com 15 permissões)
- ✅ Apenas 1 "Vendedor" (o com 41 permissões)
- ✅ Todos os outros roles únicos

## Verificar:

```sql
SELECT name, COUNT(*) as quantidade
FROM roles
GROUP BY name
HAVING COUNT(*) > 1;
```

Se retornar 0 linhas = Sucesso! ✅
