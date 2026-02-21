# Comandos VPS - Corrigir Colunas e Tabelas Faltantes

## Problemas Identificados
- Erro: `column "sale_origin" does not exist` na tabela `sales`
- Erro: `column "technician_id" does not exist` na tabela `ordens_servico`
- Erro: `relation "public.vendas_snapshot_diario" does not exist`
- Erro: `relation "public.ia_recomendacoes" does not exist`

## Comandos para Executar no VPS

Execute no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COLUNAS_FALTANTES.sql
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CORRIGIR_COLUNAS_VENDAS_SNAPSHOT_E_IA.sql
```

## O que o Script Faz

1. **Adiciona coluna `sale_origin`** na tabela `sales`:
   - Tipo: VARCHAR(50)
   - Valor padrão: 'PDV'
   - Permite identificar a origem da venda (PDV, OS, ONLINE, etc.)

2. **Adiciona coluna `technician_id`** na tabela `ordens_servico`:
   - Tipo: UUID (opcional, pode ser NULL)
   - Permite vincular um técnico à ordem de serviço

3. **Cria tabela `vendas_snapshot_diario`**:
   - Armazena snapshots diários de vendas
   - Usado para análises e relatórios de performance
   - Índices criados para melhor performance

4. **Cria tabela `ia_recomendacoes`**:
   - Armazena recomendações geradas por IA
   - Suporta múltiplos tipos de recomendação
   - Tem sistema de prioridades e status
   - Inclui `company_id` para multi-tenancy

## Verificar se Funcionou

Após executar o script:
1. Reinicie o backend: `pm2 restart primecamp-api`
2. Verifique os logs: `pm2 logs primecamp-api --lines 50`
3. Os erros de colunas/tabelas faltantes devem desaparecer

## Comando Completo (Copiar e Colar)

```bash
cd /root/primecamp-ofc && git pull origin main && PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COLUNAS_FALTANTES.sql && PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CORRIGIR_COLUNAS_VENDAS_SNAPSHOT_E_IA.sql && pm2 restart primecamp-api && echo "✅ Colunas e tabelas criadas! Verifique os logs: pm2 logs primecamp-api --lines 50"
```
