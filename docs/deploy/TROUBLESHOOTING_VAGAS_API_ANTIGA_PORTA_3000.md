# Troubleshooting: vagas públicas com API antiga na porta 3000

Use este guia quando a rota pública de candidatura der erro mesmo após `git pull`, build e `pm2 restart`.

## Sintomas

- Ao clicar em `Candidatar-se`, a tela vai para `/404`.
- O console mostra erro em `/api/public/vaga/:slugOrId`.
- `curl` na API retorna `500`, por exemplo:

```bash
curl https://api.ativafix.com/api/public/vaga/atendente
```

- A resposta ainda mostra erro de código antigo, como:

```json
{"error":"column c.settings does not exist"}
```

- `pm2 show primecamp-api` pode mostrar `status: errored`.
- `pm2 logs primecamp-api --lines 120 --nostream` pode mostrar:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

## Causa

Existe um processo `node` antigo ocupando a porta `3000`. O PM2 tenta subir a API nova, mas falha com `EADDRINUSE`. O Nginx continua apontando para `localhost:3000`, então as requisições continuam caindo no processo antigo.

## Diagnóstico

Rode na VPS:

```bash
cd /root/primecamp-ofc

echo "Commit atual:"
git log -1 --oneline

echo "Verificar se o código antigo ainda existe no projeto atual:"
grep -R "c.settings" -n /root/primecamp-ofc --exclude-dir=node_modules --exclude-dir=.git || echo "OK: c.settings nao existe no projeto atual"

echo "Status PM2:"
pm2 list
pm2 show primecamp-api

echo "Porta configurada:"
grep -n "^PORT=" .env || true

echo "Processos Node escutando portas:"
ss -ltnp | grep node || true

echo "Nginx apontando para a API:"
grep -R "api.ativafix.com\|proxy_pass" -n /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null
```

Confirme:

- O commit atual é o esperado.
- `grep "c.settings"` não encontra nada no projeto atual.
- Existe um `node` antigo escutando `*:3000` ou `127.0.0.1:3000`.
- O Nginx usa `proxy_pass http://localhost:3000` ou `proxy_pass http://127.0.0.1:3000`.

## Correção

Rode este bloco para matar somente o processo que está usando a porta `3000` e subir a API nova pelo PM2:

```bash
cd /root/primecamp-ofc

git fetch origin main
git reset --hard origin/main

echo "Commit em produção:"
git log -1 --oneline

echo "Processo usando a porta 3000:"
ss -ltnp | grep ':3000' || true

PORT_PID="$(ss -ltnp | sed -n 's/.*:3000 .*pid=\([0-9]\+\).*/\1/p' | head -n 1)"

if [ -n "$PORT_PID" ]; then
  echo "Matando processo antigo na porta 3000: $PORT_PID"
  kill -9 "$PORT_PID" || true
else
  echo "Nenhum processo encontrado na porta 3000"
fi

pm2 delete primecamp-api || true

pm2 start server/index.js --name primecamp-api --cwd /root/primecamp-ofc --update-env
pm2 save

sleep 2
pm2 status
```

Se o PM2 voltar para `errored`, veja o erro real:

```bash
pm2 logs primecamp-api --lines 120 --nostream
```

## Validação

Teste localmente pela porta do Node:

```bash
curl http://127.0.0.1:3000/api/public/vaga/atendente
curl http://127.0.0.1:3000/api/public/vaga/2cb9f355-4e2a-4058-a807-27d62cce6c6e
```

Depois teste pelo domínio da API:

```bash
curl https://api.ativafix.com/api/public/vaga/atendente
curl https://api.ativafix.com/api/public/vaga/2cb9f355-4e2a-4058-a807-27d62cce6c6e
```

O log esperado deve mostrar:

```text
[Public] Buscando vaga por slug/id: atendente
[Public] Vaga encontrada: Atendente de Loja
```

## Se o front ainda abrir `/404`

Se a API já responde corretamente e o navegador ainda mostra erro, provavelmente é cache do front/Nginx. Faça o deploy do front copiando o `dist` para o root ativo do Nginx:

```bash
cd /root/primecamp-ofc

npm install
npm run build

WEB_ROOT="$(grep -RslE 'server_name .*ativafix\.com|server_name .*www\.ativafix\.com' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -n 1 | xargs -I{} awk '/^[[:space:]]*root[[:space:]]+/ {gsub(";","",$2); print $2; exit}' {})"

echo "WEB_ROOT=$WEB_ROOT"

rsync -av --delete /root/primecamp-ofc/dist/ "$WEB_ROOT"/

nginx -t
systemctl reload nginx
```

Abra em aba anonima ou limpe o cache do navegador para confirmar.
