# 🧪 Testar API de Produtos

## 1. Configurar Token

Primeiro, configure o token no Supabase:

1. Acesse **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Adicione: `API_PRODUTOS_TOKEN` = `seu_token_aqui`

## 2. Fazer Deploy

```bash
supabase functions deploy api-produtos
```

## 3. Testar com cURL

### Teste Básico (todos os produtos)
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

### Buscar por termo
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos?search=iPhone" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Filtrar por marca
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos?marca=Apple" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Filtrar por modelo
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos?modelo=iPhone%2012" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Com paginação
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos?limit=10&offset=0" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 4. Testar sem Token (deve retornar 401)
```bash
curl -X GET \
  "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos"
```

## 5. Exemplo de Resposta Esperada

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "nome": "Tela iPhone 12",
      "marca": "Apple",
      "modelo": "iPhone 12",
      "qualidade": "Original",
      "valor_dinheiro_pix": 350.00,
      "valor_parcelado_6x": 420.00,
      "valor_formatado": {
        "dinheiro_pix": "R$ 350,00",
        "parcelado_6x": "R$ 420,00",
        "valor_parcela_6x": "R$ 70,00"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "meta": {
    "timestamp": "2025-12-17T15:30:00.000Z",
    "query": {
      "search": null,
      "marca": null,
      "modelo": null,
      "qualidade": null
    }
  }
}
```

