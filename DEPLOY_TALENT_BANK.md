# 🚀 DEPLOY - Correções Talent Bank

## ✅ Correções Implementadas:
- Fix: Queries no TalentBank usando `from()` corretamente
- Fix: Adicionado limite de 10000 para buscar todos os candidatos
- Fix: Corrigidas mutations de evaluations e interviews

## 📋 COMANDOS DE DEPLOY (VPS)

### Opção 1: Script Automatizado (Recomendado)

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
chmod +x DEPLOY_VPS_COMANDO_UNICO.sh && \
./DEPLOY_VPS_COMANDO_UNICO.sh
```

### Opção 2: Comando Único Manual

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
npm run build && \
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* && \
sudo cp -r dist/* /var/www/primecamp.cloud/ && \
sudo chown -R www-data:www-data /var/www/primecamp.cloud && \
sudo chmod -R 755 /var/www/primecamp.cloud && \
sudo systemctl reload nginx && \
pm2 restart all && \
echo "✅ Deploy concluído!"
```

### Opção 3: Passo a Passo

```bash
# 1. Conectar e ir para o diretório
cd /root/primecamp-ofc

# 2. Atualizar código
git pull origin main

# 3. Build frontend
npm run build

# 4. Limpar e copiar para Nginx
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# 5. Reiniciar serviços
sudo systemctl reload nginx
pm2 restart all

# 6. Verificar status
pm2 status
pm2 logs primecamp-api --lines 20
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### 1. Limpar Cache do Navegador
- **Chrome/Edge**: Ctrl+Shift+R ou Ctrl+F5
- **Firefox**: Ctrl+Shift+R
- Ou abrir em aba anônima

### 2. Verificar no Console do Navegador
- Abrir DevTools (F12)
- Ir para aba "Console"
- Verificar se há erros ao carregar `/admin/talent-bank`

### 3. Verificar Logs do Backend
```bash
pm2 logs primecamp-api --lines 50
```

---

## ⚠️ SE AINDA NÃO FUNCIONAR

Se após o deploy ainda mostrar 0 candidatos, pode ser problema de `company_id`. Verificar:

### Verificar se job_responses tem company_id:

```sql
-- Conectar no banco
sudo -u postgres psql -d seu_banco

-- Verificar quantos registros têm company_id
SELECT 
    COUNT(*) as total,
    COUNT(company_id) as com_company_id,
    COUNT(*) FILTER (WHERE company_id IS NULL) as sem_company_id
FROM job_responses;

-- Ver company_id dos registros
SELECT id, name, company_id 
FROM job_responses 
LIMIT 10;
```

### Se muitos registros estiverem sem company_id:

```sql
-- Atualizar job_responses sem company_id com o company_id padrão
UPDATE job_responses 
SET company_id = '00000000-0000-0000-0000-000000000001' 
WHERE company_id IS NULL;
```

Ou usar o script:
```sql
-- Rodar o script de correção de company_id
\i sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql
```

---

## 📝 NOTAS IMPORTANTES

1. **Backend não precisa rebuild** - As correções são apenas no frontend
2. **Cache do Nginx** - Sempre limpar após deploy
3. **Cache do navegador** - Sempre limpar após deploy
4. **Verificar logs** - Se houver erros, verificar logs do PM2

---

**Última atualização:** 2025-01-13
