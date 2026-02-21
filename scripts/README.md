# Scripts do projeto

Scripts que estavam na raiz do repositório foram organizados aqui por tipo.

## Estrutura

| Pasta | Conteúdo | Exemplo |
|-------|----------|---------|
| **deploy/** | Deploy (VPS, frontend, backend, revenda, time clock) | `deploy-vps.sh`, `DEPLOY_*.sh`, `EXECUTAR_*.sh`, `ATUALIZAR_*.sh` |
| **verify/** | Verificação, testes e diagnóstico | `VERIFICAR_*.sh`, `VER_*.sh`, `TESTAR_*.sh` |
| **fix/** | Correções pontuais (nginx, PM2, cache, conflitos, etc.) | `CORRIGIR_*.sh`, `RESOLVER_*.sh`, `FORCAR_*.sh`, `LIMPAR_*.sh` |
| **db/** | Aplicação de migrações no banco | `APLICAR_MIGRACAO_POSTGRES.sh` |

Scripts em **scripts/** (fora dessas pastas) continuam como antes (ex.: `monitor-and-restart-api.sh`, `verificar-api-technician-id.sh`).

## Uso

Na VPS ou em ambiente Linux/WSL, execute a partir da raiz do projeto:

```bash
# Deploy principal (exemplo)
./scripts/deploy/deploy-vps.sh

# Verificação
./scripts/verify/VERIFICAR_DEPLOY.sh

# Correção pontual
./scripts/fix/CORRIGIR_NGINX_ROOT.sh

# Migração no banco
./scripts/db/APLICAR_MIGRACAO_POSTGRES.sh
```

Em documentação antiga que cite `./NOME.sh` na raiz, use:

- `./scripts/deploy/NOME.sh`
- `./scripts/verify/NOME.sh`
- `./scripts/fix/NOME.sh`
- `./scripts/db/NOME.sh`

conforme o tipo do script.

## Observações

- Vários scripts são **pontuais** (correção de um problema ou deploy de um fix). Podem ser arquivados ou removidos quando não forem mais necessários.
- Migrações SQL manuais ficam em **`db/migrations/manual/`** (não aqui).
- Comandos e passos de deploy documentados estão em **`docs/deploy/`**.
