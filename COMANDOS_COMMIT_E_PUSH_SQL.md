# Comandos para Commitar e Fazer Push dos Scripts SQL

## No seu computador local:

```bash
# Adicionar todos os scripts SQL novos
git add sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql
git add sql/VERIFICAR_PERMISSOES_SIMILARES.sql
git add sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql

# Fazer commit
git commit -m "Adicionar scripts SQL para limpar e consolidar permissões duplicadas"

# Fazer push
git push origin main
```

## Depois, na VPS:

```bash
cd /root/primecamp-ofc
git pull origin main

# Verificar se o arquivo existe agora
ls -la sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql

# Ver o conteúdo
cat sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql
```

## Se ainda houver erro de transação abortada:

No SQL Editor, execute primeiro:
```sql
ROLLBACK;
```

Depois execute o script completo novamente.
