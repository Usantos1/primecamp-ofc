# 🤖 Configuração para Agente de IA - API de Produtos

## 📋 Configuração da Requisição HTTP

Use estas configurações exatas no seu agente de IA:

### Nome da Requisição
```
Buscar Produtos para Orçamento
```

### Descrição (quando e como usar)
```
Busca produtos (peças e serviços) do sistema Prime Camp para gerar orçamentos para clientes. 
Retorna nome, marca, modelo, qualidade e valores formatados (dinheiro/PIX e parcelado 6x).
Use quando o cliente perguntar sobre preços, peças disponíveis ou precisar de um orçamento.
```

### URL da API *
```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

### Método HTTP
```
GET
```

### Timeout (segundos)
```
30
```

### Headers (JSON)
```json
{
  "Authorization": "Bearer {{api_token}}",
  "Content-Type": "application/json"
}
```

**OU** (alternativa usando x-api-token):
```json
{
  "x-api-token": "{{api_token}}",
  "Content-Type": "application/json"
}
```

### Query Parameters (JSON)
```json
{
  "search": "{{search_term}}",
  "marca": "{{marca}}",
  "modelo": "{{modelo}}",
  "qualidade": "{{qualidade}}",
  "limit": "{{limit}}",
  "offset": "{{offset}}"
}
```

### Body (JSON)
```json
{}
```

## 🔑 Variáveis do Contexto

O agente pode usar estas variáveis dinamicamente:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{api_token}}` | Token de autenticação | `sk_prod_abc123...` |
| `{{search_term}}` | Termo de busca (nome, marca ou modelo) | `iPhone 12` |
| `{{marca}}` | Filtrar por marca | `Apple` |
| `{{modelo}}` | Filtrar por modelo | `iPhone 12` |
| `{{qualidade}}` | Filtrar por qualidade | `Original` |
| `{{limit}}` | Limite de resultados | `20` |
| `{{offset}}` | Offset para paginação | `0` |

## 📝 Exemplos de Uso pelo Agente

### Exemplo 1: Cliente pergunta sobre iPhone 12
**Contexto:**
```json
{
  "search_term": "iPhone 12",
  "api_token": "seu_token_aqui"
}
```

**Query gerada:**
```
?search=iPhone%2012
```

### Exemplo 2: Cliente quer ver todas as peças da Apple
**Contexto:**
```json
{
  "marca": "Apple",
  "api_token": "seu_token_aqui",
  "limit": "50"
}
```

**Query gerada:**
```
?marca=Apple&limit=50
```

### Exemplo 3: Cliente quer tela original do iPhone 12
**Contexto:**
```json
{
  "search_term": "tela",
  "modelo": "iPhone 12",
  "qualidade": "Original",
  "api_token": "seu_token_aqui"
}
```

**Query gerada:**
```
?search=tela&modelo=iPhone%2012&qualidade=Original
```

## 📤 Formato da Resposta

A API retorna produtos no formato:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
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
  }
}
```

## 💡 Dicas para o Agente

1. **Use `valor_formatado`** para exibir valores ao cliente (já vem em R$)
2. **Combine filtros** quando o cliente for específico (marca + modelo + qualidade)
3. **Use `search`** quando o cliente mencionar apenas o nome do produto
4. **Limite resultados** com `limit` para respostas mais rápidas
5. **Formate a resposta** de forma amigável para o cliente

## 🔒 Segurança

- **Token obrigatório:** Configure o token uma vez e use a variável `{{api_token}}`
- **Não exponha o token:** Use variáveis do contexto, não coloque o token diretamente
- **HTTPS:** Sempre use HTTPS em produção

## ✅ Checklist

- [ ] Token configurado no Supabase Secrets como `API_PRODUTOS_TOKEN`
- [ ] Edge Function deployada
- [ ] Requisição configurada no agente de IA
- [ ] Variável `{{api_token}}` configurada com o token
- [ ] Testado busca básica
- [ ] Testado com filtros
- [ ] Verificado formatação de valores

---

**Pronto para gerar orçamentos automaticamente!** 🎉

