# 🔧 Configuração da API de Produtos para Agente de IA

## 📋 Visão Geral

Endpoint seguro para o agente de IA buscar produtos e gerar orçamentos para clientes.

## 🔐 Configuração do Token

### 1. Definir Token no Supabase

1. Acesse **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Adicione uma nova secret:
   - **Name:** `API_PRODUTOS_TOKEN`
   - **Value:** Gere um token seguro (ex: `sk_prod_abc123xyz789...`)
3. Clique em **Save**

### 2. Gerar Token Seguro

Você pode gerar um token usando:

```bash
# No terminal
openssl rand -hex 32
```

Ou use um gerador online de tokens seguros.

## 📡 Endpoint

**URL Base:**
```
https://[SEU_PROJECT_REF].supabase.co/functions/v1/api-produtos
```

**Método:** `GET`

**Autenticação:** Token no header

## 🔑 Headers Obrigatórios

```
Authorization: Bearer [SEU_TOKEN]
```

OU

```
x-api-token: [SEU_TOKEN]
```

## 📥 Parâmetros de Query (Opcionais)

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `search` ou `q` | string | Busca por nome, marca ou modelo | `?search=iPhone` |
| `marca` | string | Filtrar por marca | `?marca=Apple` |
| `modelo` | string | Filtrar por modelo | `?modelo=iPhone 12` |
| `qualidade` | string | Filtrar por qualidade | `?qualidade=Original` |
| `limit` | number | Limite de resultados (padrão: 50) | `?limit=20` |
| `offset` | number | Offset para paginação (padrão: 0) | `?offset=10` |

## 📤 Resposta de Sucesso

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-do-produto",
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
    "total": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "meta": {
    "timestamp": "2025-12-17T15:30:00.000Z",
    "query": {
      "search": "iPhone",
      "marca": null,
      "modelo": null,
      "qualidade": null
    }
  }
}
```

## ❌ Resposta de Erro

### Token Inválido (401)
```json
{
  "success": false,
  "error": "Token de autenticação inválido ou ausente",
  "message": "Forneça um token válido no header Authorization ou x-api-token"
}
```

### Erro do Servidor (500)
```json
{
  "success": false,
  "error": "Erro ao buscar produtos",
  "details": "Mensagem de erro detalhada"
}
```

## 📝 Exemplos de Uso

### 1. Buscar todos os produtos
```bash
curl -X GET \
  "https://[PROJECT_REF].supabase.co/functions/v1/api-produtos" \
  -H "Authorization: Bearer [SEU_TOKEN]"
```

### 2. Buscar por termo
```bash
curl -X GET \
  "https://[PROJECT_REF].supabase.co/functions/v1/api-produtos?search=iPhone" \
  -H "Authorization: Bearer [SEU_TOKEN]"
```

### 3. Filtrar por marca e modelo
```bash
curl -X GET \
  "https://[PROJECT_REF].supabase.co/functions/v1/api-produtos?marca=Apple&modelo=iPhone%2012" \
  -H "Authorization: Bearer [SEU_TOKEN]"
```

### 4. Com paginação
```bash
curl -X GET \
  "https://[PROJECT_REF].supabase.co/functions/v1/api-produtos?limit=20&offset=0" \
  -H "Authorization: Bearer [SEU_TOKEN]"
```

## 🤖 Configuração no Agente de IA

### Exemplo de Configuração

**Nome da Requisição:** `Buscar Produtos para Orçamento`

**Descrição:** `Busca produtos (peças e serviços) do sistema para gerar orçamentos. Retorna nome, marca, modelo, qualidade e valores (dinheiro/PIX e parcelado 6x).`

**URL da API:**
```
https://[SEU_PROJECT_REF].supabase.co/functions/v1/api-produtos
```

**Método HTTP:** `GET`

**Timeout (segundos):** `30`

**Headers (JSON):**
```json
{
  "Authorization": "Bearer {{api_token}}",
  "Content-Type": "application/json"
}
```

**Query Parameters (JSON):**
```json
{
  "search": "{{search_term}}",
  "marca": "{{marca}}",
  "modelo": "{{modelo}}",
  "qualidade": "{{qualidade}}",
  "limit": "{{limit}}"
}
```

**Body (JSON):** `{}` (vazio para GET)

### Variáveis do Contexto

O agente pode usar variáveis dinâmicas:
- `{{search_term}}` - Termo de busca
- `{{marca}}` - Marca do produto
- `{{modelo}}` - Modelo do produto
- `{{qualidade}}` - Qualidade (Original, Genérico, etc.)
- `{{limit}}` - Limite de resultados
- `{{api_token}}` - Token de autenticação

## 🔒 Segurança

1. **Token obrigatório:** Todas as requisições precisam de token válido
2. **HTTPS apenas:** Use sempre HTTPS em produção
3. **Rate limiting:** Considere implementar rate limiting se necessário
4. **Logs:** Todas as requisições são logadas no Supabase

## 🚀 Deploy

A Edge Function já está criada em:
```
supabase/functions/api-produtos/index.ts
```

Para fazer deploy:

```bash
# Via Supabase CLI
supabase functions deploy api-produtos

# Ou via Dashboard
# Supabase Dashboard → Edge Functions → Deploy
```

## 📊 Estrutura de Dados

A API retorna produtos com a seguinte estrutura:

- **id:** UUID do produto
- **nome:** Nome do produto
- **marca:** Marca do produto
- **modelo:** Modelo do produto
- **qualidade:** Qualidade (Original, Genérico, etc.)
- **valor_dinheiro_pix:** Valor para pagamento à vista ou PIX
- **valor_parcelado_6x:** Valor total parcelado em 6x
- **valor_formatado:** Valores formatados em R$ para exibição

## ✅ Checklist de Configuração

- [ ] Token gerado e configurado no Supabase Secrets
- [ ] Edge Function deployada
- [ ] Testar endpoint com curl ou Postman
- [ ] Configurar no agente de IA
- [ ] Testar busca de produtos
- [ ] Verificar formatação de valores

---

**Pronto para uso!** 🎉

