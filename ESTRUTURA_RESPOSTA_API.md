# 📋 Estrutura da Resposta da API

## ✅ A API está funcionando!

Os logs mostram que a API está retornando **50 produtos** com sucesso.

## 📤 Estrutura da Resposta

A API retorna um JSON com esta estrutura:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-do-produto",
      "nome": "Nome do Produto",
      "marca": "Marca",
      "modelo": "Modelo",
      "qualidade": "Qualidade",
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
    "total": 50,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "meta": {
    "timestamp": "2025-12-17T21:46:44.305Z",
    "query": {
      "search": null,
      "marca": null,
      "modelo": null,
      "qualidade": null
    }
  }
}
```

## 🔍 Como Acessar os Valores no Agente de IA

### Para acessar a lista de produtos:
```
{{response.data}}
```

### Para acessar um produto específico:
```
{{response.data[0].nome}}
{{response.data[0].valor_formatado.dinheiro_pix}}
```

### Para acessar o total:
```
{{response.pagination.total}}
```

### Para verificar sucesso:
```
{{response.success}}
```

## ⚠️ Se o Agente Mostra "Valor não encontrado"

### Problema 1: Campo não existe
Se você está tentando acessar um campo que não existe, use:
- `{{response.data}}` - Lista completa
- `{{response.success}}` - Status (true/false)

### Problema 2: Estrutura diferente
A resposta está em `response.data`, não diretamente em `response`.

### Problema 3: Array vazio
Se `response.data` estiver vazio, significa que não há produtos no banco.

## 🧪 Teste a Resposta Completa

Na interface do agente, configure para salvar a resposta completa:

**Salvar Resposta:**
- Campo: `RespostaCompleta`
- Valor: `{{response}}`

Isso vai salvar toda a resposta JSON para você ver a estrutura real.

## 📊 Exemplo de Uso no Agente

### Para listar produtos:
```
Produtos encontrados: {{response.pagination.total}}

{{#each response.data}}
- {{nome}} ({{marca}} {{modelo}})
  Valor à vista: {{valor_formatado.dinheiro_pix}}
  Parcelado 6x: {{valor_formatado.parcelado_6x}} ({{valor_formatado.valor_parcela_6x}}/mês)
{{/each}}
```

### Para buscar um produto específico:
Use o parâmetro `search`:
```
?search=iPhone
```

---

**A API está funcionando perfeitamente! O problema é apenas como o agente está acessando os dados.**

