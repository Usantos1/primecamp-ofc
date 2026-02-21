# DEBUG: Dashboard Mostrando R$ 0,00

## Problema
O dashboard da home está mostrando todos os valores financeiros como R$ 0,00:
- Faturamento do Dia: R$ 0,00
- Faturamento do Mês: R$ 0,00
- Ticket Médio: R$ 0,00
- Total em Caixa: R$ 0,00

## Solução Aplicada
Adicionados logs de debug no `src/hooks/useDashboardData.ts` para investigar o problema.

## Como Investigar

### 1. Abrir Console do Navegador
1. Abra o dashboard (página inicial `/`)
2. Pressione F12 (ou Ctrl+Shift+I / Cmd+Option+I no Mac)
3. Vá para a aba "Console"

### 2. Verificar Logs
Procure por logs com prefixo `[Dashboard]`:
- `[Dashboard] Vendas do dia encontradas: X`
- `[Dashboard] Vendas do mês encontradas: X`
- `[Dashboard] Faturamento calculado - Dia: X Mês: X`
- `[Dashboard] Erro ao buscar vendas...` (se houver erro)

### 3. Possíveis Causas

#### Causa 1: Não há vendas no período
- **Sintoma:** Logs mostram `0 vendas encontradas`
- **Solução:** Verificar se existem vendas no banco com status 'paid' ou 'partial' no período

#### Causa 2: Vendas com company_id diferente
- **Sintoma:** Backend está filtrando por company_id e não retorna dados
- **Solução:** Verificar se as vendas têm o mesmo company_id do usuário logado

#### Causa 3: Status incorreto
- **Sintoma:** Vendas existem mas não estão com status 'paid' ou 'partial'
- **Solução:** Verificar status das vendas no banco

#### Causa 4: Problema de autenticação
- **Sintoma:** Erro 401 ou 403 nos logs
- **Solução:** Verificar token de autenticação

## Query SQL para Verificar Vendas

Execute no banco para verificar se há vendas:

```sql
-- Verificar vendas do dia de hoje
SELECT COUNT(*), SUM(total) as total
FROM sales
WHERE status IN ('paid', 'partial')
  AND DATE(created_at) = CURRENT_DATE;

-- Verificar vendas do mês atual
SELECT COUNT(*), SUM(total) as total
FROM sales
WHERE status IN ('paid', 'partial')
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- Verificar todas as vendas (últimas 10)
SELECT id, numero, total, status, created_at, company_id
FROM sales
ORDER BY created_at DESC
LIMIT 10;

-- Verificar company_id do usuário logado
SELECT id, email, company_id
FROM users
WHERE email = 'seu_email@exemplo.com';
```

## Próximos Passos

1. ✅ Logs adicionados ao código
2. ⏳ Verificar console do navegador
3. ⏳ Analisar logs e identificar causa
4. ⏳ Aplicar correção específica

## Arquivos Modificados

- `src/hooks/useDashboardData.ts` - Adicionados logs de debug
