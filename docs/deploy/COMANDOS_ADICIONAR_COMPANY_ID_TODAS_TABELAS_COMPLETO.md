# Adicionar company_id em TODAS as tabelas (automático completo)

## Este script adiciona company_id em TODAS as tabelas do banco automaticamente!

Execute este comando no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql
```

Este script:
- Busca TODAS as tabelas do banco automaticamente
- Adiciona company_id em cada uma (se não existir)
- Define valores padrão para registros existentes
- Cria índices e foreign keys
- Ignora apenas tabelas do sistema (companies, plans, subscriptions, etc)

**Depois de executar, recarregue a página no navegador (F5)**

## Para listar todas as tabelas primeiro (opcional):

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/LISTAR_TODAS_TABELAS.sql
```
