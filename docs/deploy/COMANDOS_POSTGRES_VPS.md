# COMANDOS POSTGRESQL NO VPS - RESOLVER AUTENTICAÇÃO

## Problema: Peer Authentication Failed

Se você receber erro `Peer authentication failed for user "postgres"`, use uma das soluções abaixo:

---

## Solução 1: Usar sudo -u postgres (Recomendado)

```bash
# Executar como usuário postgres do sistema
sudo -u postgres psql -d banco_gestao -f sql/VERIFICAR_MIGRATIONS_APLICADAS.sql

# Ou para backup:
sudo -u postgres pg_dump banco_gestao > backup_antes_migrations.sql
```

---

## Solução 2: Especificar host localhost

```bash
# Forçar conexão TCP ao invés de socket Unix
psql -h localhost -U postgres -d banco_gestao -f sql/VERIFICAR_MIGRATIONS_APLICADAS.sql

# Para backup:
pg_dump -h localhost -U postgres banco_gestao > backup_antes_migrations.sql
```

---

## Solução 3: Conectar direto como postgres

```bash
# Entrar no shell do PostgreSQL
sudo -u postgres psql

# Dentro do psql, conectar ao banco:
\c banco_gestao

# Executar o script:
\i sql/VERIFICAR_MIGRATIONS_APLICADAS.sql
```

---

## Solução 4: Modificar pg_hba.conf (Permanente)

```bash
# Editar arquivo de configuração
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Mudar de:
local   all             postgres                                peer

# Para:
local   all             postgres                                md5

# Ou adicionar:
local   all             all                                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## Comandos Úteis para VPS

### Backup
```bash
sudo -u postgres pg_dump banco_gestao > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
sudo -u postgres psql banco_gestao < backup.sql
```

### Listar bancos
```bash
sudo -u postgres psql -l
```

### Conectar ao banco
```bash
sudo -u postgres psql -d banco_gestao
```

---

## Executar Migrations no VPS

```bash
# 1. Backup
sudo -u postgres pg_dump banco_gestao > backup_antes_migrations.sql

# 2. Migration 2 (CRÍTICO)
sudo -u postgres psql -d banco_gestao -f sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql

# 3. Migration 3 (ALTO)
sudo -u postgres psql -d banco_gestao -f ADD_SALE_ORIGIN_MIGRATION.sql

# 4. Migration 4 (ALTO)
sudo -u postgres psql -d banco_gestao -f ADD_CASH_SESSION_TO_SALES.sql

# 5. Verificar
sudo -u postgres psql -d banco_gestao -f sql/VERIFICAR_MIGRATIONS_APLICADAS.sql
```
