# 🐛 Debug - Erro "Valor não encontrado"

## ✅ Checklist de Verificação

### 1. Token Completo
O token deve ser COMPLETO:
```
56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4
```

**NÃO use apenas:** `56291b834e7` (está cortado!)

### 2. Header Correto
No campo "Authorization", use:
```
Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4
```

**OU** use o header alternativo:
- Key: `x-api-token`
- Value: `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

### 3. URL Completa
```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

### 4. Token Configurado no Supabase?
⚠️ **IMPORTANTE:** O token PRECISA estar configurado no Supabase!

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/settings/functions
2. Vá em **Secrets**
3. Verifique se existe: `API_PRODUTOS_TOKEN`
4. Se não existir, adicione:
   - Name: `API_PRODUTOS_TOKEN`
   - Value: `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

### 5. Verificar Logs
Acesse os logs da função para ver o erro real:
- Dashboard → Edge Functions → api-produtos → Logs

## 🔍 Possíveis Erros

### Erro 401: "Token de autenticação inválido"
- ✅ Token não configurado no Supabase Secrets
- ✅ Token incompleto ou errado no header
- ✅ Header mal formatado

### Erro 500: "Erro interno do servidor"
- ✅ Função não deployada (mas já fizemos deploy)
- ✅ Erro no código (verificar logs)

### "Valor não encontrado"
- ✅ Pode ser que a resposta não esteja sendo parseada corretamente
- ✅ Verificar se está esperando um campo específico na resposta
- ✅ Verificar logs da função

## 🧪 Teste Manual com cURL

Teste direto no terminal para ver o erro real:

```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos" \
  -H "Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4" \
  -v
```

O `-v` mostra detalhes da requisição e resposta.

## 📋 Configuração Correta na Interface

### Headers:
```
Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4
```

### URL:
```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

### Método:
```
GET
```

### Parâmetros (opcional):
- Key: `search`
- Value: `iPhone`

### Body:
Vazio

