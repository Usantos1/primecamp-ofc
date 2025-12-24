# 🔐 Como Gerar JWT_SECRET

## O que é JWT_SECRET?

O `JWT_SECRET` é uma chave secreta usada para assinar e verificar tokens JWT (JSON Web Tokens). É usado pelo servidor API para validar que os tokens enviados pelo frontend são legítimos.

## ⚠️ IMPORTANTE:

- **Deve ser uma string aleatória e segura**
- **Nunca compartilhe publicamente**
- **Use uma chave diferente em produção**
- **Mantenha segredo!**

## 🔧 Como Gerar:

### Opção 1: Usando Node.js (Recomendado)

No terminal do VPS ou local:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Isso vai gerar uma string de 128 caracteres aleatória e segura.

### Opção 2: Usando OpenSSL

```bash
openssl rand -hex 64
```

### Opção 3: Online (menos seguro, mas funciona)

Acesse: https://generate-secret.vercel.app/64

Ou use qualquer gerador de strings aleatórias (64+ caracteres).

### Opção 4: Manual (não recomendado)

Você pode usar qualquer string longa e aleatória, por exemplo:
```
MinhaChaveSecretaSuperSegura2025PrimeCampAPI!@#$%^&*()_+
```

Mas é melhor usar uma gerada criptograficamente.

## 📝 Exemplo de JWT_SECRET Gerado:

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2
```

## ✅ Como Usar:

1. **Gerar a chave** usando um dos métodos acima
2. **Copiar a chave gerada**
3. **Colocar no `.env`:**

```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2
```

4. **No servidor API (`server/index.js`):**
   - A API já está configurada para usar `process.env.JWT_SECRET`
   - Se não existir, usa `'your_jwt_secret_here'` como padrão (não seguro!)

## 🔒 Segurança:

- ✅ Use pelo menos 64 caracteres
- ✅ Use caracteres aleatórios (não palavras)
- ✅ Não use a mesma chave em desenvolvimento e produção
- ✅ Mantenha a chave segura (não commite no Git)
- ✅ Se comprometida, gere uma nova e atualize todos os serviços

## 📋 Checklist:

- [ ] Gerar chave usando `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Copiar chave gerada
- [ ] Adicionar no `.env`: `JWT_SECRET=sua_chave_aqui`
- [ ] Reiniciar servidor API após mudar `.env`
- [ ] Verificar se API está funcionando

## 🚀 Próximos Passos:

1. Gerar a chave
2. Adicionar no `.env` do servidor (VPS)
3. Reiniciar API: `pm2 restart primecamp-api` ou `npm run dev`
4. Testar autenticação

