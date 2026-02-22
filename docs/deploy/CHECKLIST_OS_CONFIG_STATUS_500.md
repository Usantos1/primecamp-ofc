# Checklist: erro 500 em /pdv/configuracao-status (company_id)

Quando aparece **500** e *"null value in column company_id"* ao carregar ou salvar a configuração de status de OS, confira o seguinte **na VPS** (servidor onde roda a API).

---

## 1. API está usando o código novo?

No servidor:

```bash
cd /root/primecamp-ofc && git log -1 --oneline server/index.js
```

Deve aparecer um commit recente com mensagem tipo `fix(api): os_config_status`.  
Se não aparecer, faça **git pull** e **redeploy** (incluindo `pm2 restart primecamp-api`).

---

## 2. Banco que a API usa é o mesmo onde você rodou o UPDATE?

A API usa a conexão definida no **.env** do servidor (ex.: `DATABASE_URL` ou `PGHOST`/`PGDATABASE`).

- Se você rodou o `UPDATE` em outro banco (ex.: seu PC ou outro servidor), o usuário em **produção** continua sem `company_id`.
- **Na VPS**, descubra o banco:

```bash
cd /root/primecamp-ofc/server && grep -E "DATABASE|PGHOST|PGDATABASE" .env 2>/dev/null || echo "Verifique manualmente o .env"
```

- Conecte nesse **mesmo** banco (DBeaver/pgAdmin naquele host e database) e rode de novo:

```sql
-- Vincular seu usuário à primeira empresa válida
UPDATE public.users u
SET company_id = (
  SELECT id FROM public.companies
  WHERE id != '00000000-0000-0000-0000-000000000000'
  LIMIT 1
)
WHERE u.email = 'lojaprimecamp@gmail.com';
```

Confirme: `UPDATE 1`.

---

## 3. Logs da API ao reproduzir o erro

Com a API rodando (PM2), ao abrir ou salvar em `/pdv/configuracao-status` você deve ver nos logs algo como:

```
[Insert] os_config_status: req.user? true req.companyId? <uuid>
[Insert] os_config_status company_id= <uuid> rows= 12
```

Para ver os logs:

```bash
pm2 logs primecamp-api --lines 50
```

- Se **não** aparecer `[Insert] os_config_status:` → o código novo não está rodando (redeploy + restart).
- Se aparecer `req.companyId? null` e mesmo assim der 500 → o fallback não achou empresa no **banco que a API usa**; rode o `UPDATE` nesse banco e confira se existe linha em `companies` com id diferente do UUID zero.

---

## 4. Resumo

| O que fazer | Onde |
|-------------|------|
| Garantir código novo + restart | VPS: `git pull`, build, `pm2 restart primecamp-api` |
| Garantir usuário com empresa | **Mesmo** banco que a API usa: `UPDATE users SET company_id = (SELECT id FROM companies WHERE id != '0000...' LIMIT 1) WHERE email = '...'` |
| Confirmar que deu certo | `pm2 logs` deve mostrar `[Insert] os_config_status company_id= ...` ao usar a tela |

Depois: **logout** no app, **login** de novo, abrir de novo `/pdv/configuracao-status` e testar.
