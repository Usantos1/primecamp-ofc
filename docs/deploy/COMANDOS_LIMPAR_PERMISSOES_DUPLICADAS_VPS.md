# Comandos para Limpar Permissões Duplicadas na VPS

## 📋 Passo a Passo

### 1️⃣ Conectar na VPS via SSH
```bash
ssh root@seu-servidor-vps
```

### 2️⃣ Navegar para o diretório do projeto
```bash
cd /root/primecamp-ofc
```

### 3️⃣ Atualizar o código (puxar os novos scripts SQL)
```bash
git pull origin main
```

### 4️⃣ Verificar se os scripts SQL existem
```bash
ls -la sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql
ls -la sql/LIMPAR_PERMISSOES_DUPLICADAS_AGGRESSIVO.sql
```

### 5️⃣ Conectar ao PostgreSQL

**Opção A: Se você tem acesso direto ao banco:**
```bash
psql -U postgres -d seu_banco_de_dados
```

**Opção B: Executar via psql com arquivo:**
```bash
sudo -u postgres psql -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql
```

**Opção C: Executar via psql remoto (se o banco estiver em outro servidor):**
```bash
export PGPASSWORD='sua_senha'
psql -h 72.62.106.76 -U postgres -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql
```

### 6️⃣ Executar o script de VERIFICAÇÃO primeiro

**No psql:**
```sql
\i sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql
```

**Ou executar diretamente via psql:**
```bash
sudo -u postgres psql -d banco_gestao -f sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql
```

### 7️⃣ Analisar os resultados

Verifique:
- Quantas categorias existem
- Quais permissões estão duplicadas
- Quantas permissões por categoria

### 8️⃣ Executar o script de LIMPEZA

**⚠️ ATENÇÃO: Este script vai DELETAR permissões duplicadas!**

**Recomendado: Use a versão SIMPLES (mais confiável):**
```bash
cat sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql
```
(Copie a saída e cole no SQL Editor do Supabase)

**Alternativa: Versão agressiva (se a simples não funcionar):**
```bash
cat sql/LIMPAR_PERMISSOES_DUPLICADAS_AGGRESSIVO.sql
```
(Copie a saída e cole no SQL Editor do Supabase)

### 9️⃣ Executar script de CONSOLIDAÇÃO (se houver descrições idênticas)

**Se a query de verificação de descrições idênticas retornou resultados:**
```bash
# Executar o script de consolidação
sudo -u postgres psql -d banco_gestao -f sql/CONSOLIDAR_PERMISSOES_DESCRICOES_IDENTICAS.sql
```

Este script:
- Remove permissões com descrições idênticas (mantém a mais antiga)
- Consolida recursos similares (products → produtos, clients → clientes)
- Move todas as associações automaticamente

### 🔟 Verificar o resultado

Execute novamente as queries de verificação:
```bash
cat sql/VERIFICAR_PERMISSOES_SIMILARES.sql
```

O script vai mostrar:
- Categorias consolidadas
- Total de permissões por categoria
- Se ainda há duplicatas restantes

### 🔟 Reiniciar o backend (se necessário)

```bash
cd /root/primecamp-ofc/server
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

---

## 📝 Comandos Rápidos (Tudo em um)

```bash
# Conectar e atualizar
cd /root/primecamp-ofc
git pull origin main

# Ver scripts
cat sql/VERIFICAR_PERMISSOES_DUPLICADAS.sql
cat sql/LIMPAR_PERMISSOES_DUPLICADAS_SIMPLES.sql

# Reiniciar backend
cd server
pm2 restart primecamp-api
```

---

## ⚠️ IMPORTANTE

1. **Faça backup do banco ANTES de executar a limpeza:**
   ```bash
   pg_dump -U postgres seu_banco_de_dados > backup_antes_limpeza_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Execute primeiro o script de VERIFICAÇÃO** para ver o estado atual

3. **O script de limpeza é TRANSACIONAL** (usa BEGIN/COMMIT), então se der erro, nada será alterado

4. **As associações (role_permissions e user_permissions) serão movidas** automaticamente para as permissões mantidas

---

## 🐛 Se der erro

Se o script der erro, verifique:
- Se você tem permissões de escrita no banco
- Se as tabelas `permissions`, `role_permissions`, `user_permissions` existem
- Os logs do PostgreSQL: `tail -f /var/log/postgresql/postgresql-*.log`
