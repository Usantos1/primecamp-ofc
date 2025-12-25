# 🧪 Como Testar Localmente

## 1. Iniciar API Local

```bash
cd server
npm install
npm start
# Deve iniciar em http://localhost:3000
```

## 2. Iniciar Frontend Local

```bash
# Na raiz do projeto
npm run dev
# Deve iniciar em http://localhost:8080
```

## 3. Acessar Página de Teste

```
http://localhost:8080/test-auth
```

## 4. Verificar Console

- Deve aparecer: `API_URL: http://localhost:3000/api`
- Não deve aparecer requisições para `supabase.co`
- Deve aparecer apenas requisições para `localhost:3000`

## 5. Testar Login

Use um usuário da tabela `users` do PostgreSQL local ou remoto.

