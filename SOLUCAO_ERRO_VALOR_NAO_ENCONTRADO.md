# 🔧 Solução: Erro "Valor não encontrado"

## ⚠️ Problema Mais Comum

O erro "Valor não encontrado" geralmente significa que:

1. **Token não está configurado no Supabase Secrets** (mais provável)
2. **Token está incompleto no header** (vi que mostra "Bearer 56291b834e7" - cortado)
3. **A API está retornando erro 401 ou 500**

## ✅ SOLUÇÃO PASSO A PASSO

### Passo 1: Verificar Token Completo

O token COMPLETO é:
```
56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4
```

**NÃO use apenas:** `56291b834e7` (está cortado!)

### Passo 2: Configurar Token no Supabase (OBRIGATÓRIO!)

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/settings/functions
2. Clique na aba **"Secrets"**
3. Clique em **"Add new secret"**
4. Preencha:
   - **Name:** `API_PRODUTOS_TOKEN`
   - **Value:** `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`
5. Clique em **"Save"**

⚠️ **SEM ISSO, A API NÃO FUNCIONA!**

### Passo 3: Configurar Header Corretamente

Na interface, no campo **"Authorization"**, use o token COMPLETO:

```
Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4
```

**OU** use o header alternativo:
- **Key:** `x-api-token`
- **Value:** `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

### Passo 4: Verificar URL

```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

### Passo 5: Verificar Método

```
GET
```

## 🔍 Como Verificar se Está Funcionando

### Opção 1: Ver Logs da Função
1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/functions
2. Clique em **"api-produtos"**
3. Vá em **"Logs"**
4. Veja os erros reais

### Opção 2: Testar em Postman/Insomnia
- URL: `https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos`
- Method: `GET`
- Headers:
  - `Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

## 📋 Resposta Esperada (Sucesso)

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "nome": "...",
      "marca": "...",
      "modelo": "...",
      "qualidade": "...",
      "valor_dinheiro_pix": 0,
      "valor_parcelado_6x": 0,
      "valor_formatado": {
        "dinheiro_pix": "R$ 0,00",
        "parcelado_6x": "R$ 0,00",
        "valor_parcela_6x": "R$ 0,00"
      }
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

## ❌ Respostas de Erro

### Erro 401:
```json
{
  "success": false,
  "error": "Token de autenticação inválido ou ausente"
}
```
**Solução:** Configure o token no Supabase Secrets!

### Erro 500:
```json
{
  "success": false,
  "error": "API_TOKEN não configurado no servidor"
}
```
**Solução:** Configure o token no Supabase Secrets!

## ✅ Checklist Final

- [ ] Token configurado no Supabase Secrets como `API_PRODUTOS_TOKEN`
- [ ] Token completo no header (não cortado)
- [ ] Header formatado como: `Bearer [token_completo]`
- [ ] URL correta
- [ ] Método GET
- [ ] Função deployada (já está ✅)

---

**O problema mais provável é que o token não está configurado no Supabase Secrets!**

