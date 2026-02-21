# Adicionar company_id em TODAS as tabelas automaticamente

## Execute este comando no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_AUTOMATICO.sql
```

Este script adiciona automaticamente a coluna `company_id` em todas as tabelas necessárias:
- produtos
- sales/vendas
- clientes
- ordens_servico
- sale_items
- os_items
- marcas
- modelos
- e todas as outras tabelas que precisam

**Depois de executar, recarregue a página no navegador (F5)**
