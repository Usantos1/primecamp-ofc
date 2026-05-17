# Domínios personalizados no Ativa FIX

## Visão Geral

O acesso padrão por `app.ativafix.com` continua funcionando para todos os clientes.

Domínios personalizados são uma camada adicional:

- `app.ativafix.com` mantém o fluxo atual.
- `app.primecamp.com.br` pode apontar para a empresa PrimeCamp.
- `sistema.lojasx.com.br` pode apontar para a empresa Loja X.

O domínio resolve a empresa, mas não libera dados sozinho. O usuário ainda precisa fazer login e pertencer à mesma `company_id` resolvida pelo domínio.

## Banco De Dados

Execute:

```sql
\i db/migrations/manual/CRIAR_DOMINIOS_EMPRESAS.sql
```

Ou cole o conteúdo de `db/migrations/manual/CRIAR_DOMINIOS_EMPRESAS.sql` no PgAdmin.

## Variáveis De Ambiente

Variáveis opcionais:

```bash
CUSTOM_DOMAIN_CNAME_TARGET=custom.ativafix.com
SYSTEM_DOMAIN_HOSTS=ativafix.com,www.ativafix.com,app.ativafix.com,api.ativafix.com,custom.ativafix.com,localhost,127.0.0.1
CUSTOM_DOMAIN_ASSUME_SSL_ACTIVE=false
```

Use `CUSTOM_DOMAIN_ASSUME_SSL_ACTIVE=true` somente quando a infraestrutura/proxy já estiver emitindo SSL para os domínios customizados.

## DNS Do Cliente

Para `app.primecamp.com.br`, criar:

```text
Tipo: CNAME
Nome: app
Destino: custom.ativafix.com
```

TXT opcional de verificação:

```text
Tipo: TXT
Nome: _ativafix.app.primecamp.com.br
Valor: ativa-fix-verification=TOKEN_GERADO
```

## Proxy/SSL

O sistema já está preparado para validar DNS e vincular o domínio à empresa. Para o domínio abrir em HTTPS, o proxy precisa aceitar os hosts customizados e encaminhar para o frontend/API.

### Opção Recomendada: Caddy

Exemplo:

```caddyfile
{
  email suporte@ativafix.com
  on_demand_tls {
    ask http://127.0.0.1:3000/api/public/domain-resolve
  }
}

app.ativafix.com {
  root * /root/primecamp-ofc/dist
  try_files {path} /index.html
  file_server
}

custom.ativafix.com, *.primecamp.com.br {
  tls {
    on_demand
  }
  root * /root/primecamp-ofc/dist
  try_files {path} /index.html
  file_server
}

api.ativafix.com {
  reverse_proxy 127.0.0.1:3000
}
```

Em produção, prefira restringir o `ask` para responder sucesso apenas quando o domínio estiver `verified` ou `active`.

### Opção Atual Com Nginx + Certbot

1. Aponte o CNAME do cliente para `custom.ativafix.com`.
2. Configure `custom.ativafix.com` no Nginx para servir o mesmo `dist`.
3. Para cada domínio validado, emita certificado:

```bash
certbot --nginx -d app.primecamp.com.br
```

4. Depois de emitir SSL, mantenha o domínio como `verified` ou marque `CUSTOM_DOMAIN_ASSUME_SSL_ACTIVE=true` antes de verificar novamente para virar `active`.

## Deploy VPS

```bash
cd ~/primecamp-ofc
git pull origin main
npm install
npm run build
pm2 restart primecamp-api
pm2 save
```

## Testes

- `app.ativafix.com` deve continuar abrindo normalmente.
- `GET /api/public/domain-resolve` em `api.ativafix.com` deve responder `is_custom_domain=false`.
- Após cadastrar domínio, o painel deve exibir CNAME e TXT.
- Antes de configurar DNS, o botão verificar deve retornar mensagem amigável.
- Depois de configurar DNS, status deve virar `verified`.
- Usuário de outra empresa deve receber bloqueio ao logar/acessar por domínio customizado.
