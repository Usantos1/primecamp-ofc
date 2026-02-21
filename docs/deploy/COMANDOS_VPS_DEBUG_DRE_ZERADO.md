# Comandos para debugar DRE zerado

Se o DRE está aparecendo mas com valores zerados, pode ser que:

1. **Não há vendas no período selecionado**
2. **A query de despesas não está encontrando dados**

## Verificar se há vendas no período:

```bash
# Conectar ao banco
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres

# Verificar vendas do mês atual
SELECT 
  COUNT(*) as total_vendas,
  COALESCE(SUM(total), 0) as receita_total
FROM public.sales
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  AND status IN ('paid', 'partial');

# Verificar todas as vendas
SELECT COUNT(*) as total_vendas, COALESCE(SUM(total), 0) as receita_total
FROM public.sales
WHERE status IN ('paid', 'partial');
```

## Verificar estrutura da tabela bills_to_pay:

```bash
# Ver colunas da tabela bills_to_pay
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bills_to_pay'
ORDER BY ordinal_position;
```

## Verificar contas pagas:

```bash
# Verificar contas pagas
SELECT COUNT(*) as total_contas_pagas, COALESCE(SUM(amount), 0) as total_despesas
FROM public.bills_to_pay
WHERE status = 'pago';
```

## Atualizar backend:

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

## Dicas:

- Certifique-se de que há vendas com status 'paid' ou 'partial' no período
- Verifique se há contas a pagar com status 'pago'
- O DRE calcula automaticamente baseado nas vendas e contas do período selecionado
- Se não houver dados no período, o DRE será zerado (comportamento esperado)
