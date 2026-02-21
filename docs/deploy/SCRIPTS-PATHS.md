# Onde estão os scripts de deploy

Os arquivos `.sh` que ficavam na **raiz do projeto** foram movidos para a pasta **`scripts/`** por tipo:

- **`scripts/deploy/`** – deploy (ex.: `deploy-vps.sh`, `DEPLOY_*.sh`, `FORCAR_ATUALIZACAO_COMPLETA.sh`, `DEPLOY_FORCAR_REBUILD_SEM_CACHE.sh`)
- **`scripts/verify/`** – verificação e testes (`VERIFICAR_*.sh`, `TESTAR_*.sh`)
- **`scripts/fix/`** – correções pontuais (`CORRIGIR_*.sh`, `RESOLVER_*.sh`)
- **`scripts/db/`** – aplicar migrações no banco

**Exemplos:** se um doc manda rodar `./FORCAR_ATUALIZACAO_COMPLETA.sh`, use:

```bash
./scripts/fix/FORCAR_ATUALIZACAO_COMPLETA.sh
```

Se manda rodar `./DEPLOY_FORCAR_REBUILD_SEM_CACHE.sh`, use:

```bash
./scripts/deploy/DEPLOY_FORCAR_REBUILD_SEM_CACHE.sh
```

Detalhes: **`scripts/README.md`** na raiz do repo.
