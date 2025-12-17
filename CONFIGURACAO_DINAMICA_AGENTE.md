# 🎯 Configuração Dinâmica - Usar Resposta do Usuário

## ✅ A API está funcionando!

Vejo que a resposta está chegando corretamente:
- `response.message`: "Sucesso"
- `response.data.success`: true
- `response.data.data[0]` contém os produtos

## 📋 Como Configurar Corretamente

### 1. **Parâmetros Dinâmicos**

No lugar de `modelo=a10` (fixo), use a variável da pergunta do usuário:

**Parâmetros:**
- **Key:** `modelo` (ou `search`, `marca`, etc)
- **Value:** `{{resposta_usuario}}` ou `{{mensagem_usuario}}` (depende do nome da variável do seu fluxo)

**Exemplo:**
- Se o usuário perguntar "iPhone 12", a variável terá "iPhone 12"
- Use: `{{variavel_com_resposta}}`

### 2. **Salvar Resposta Completa**

Na seção **"Salvar Resposta"**, configure:

**Opção A - Salvar Tudo:**
- **Campo:** `RespostaCompleta`
- **Valor:** `{{response.data}}`

**Opção B - Salvar Apenas os Produtos:**
- **Campo:** `Produtos`
- **Valor:** `{{response.data.data}}`

**Opção C - Salvar Apenas o Primeiro Produto:**
- **Campo:** `Produto`
- **Valor:** `{{response.data.data.[0]}}`

### 3. **Estrutura da Resposta**

A resposta tem esta estrutura:
```
response.message = "Sucesso"
response.data.success = true
response.data.data[0] = {
  id: "...",
  nome: "Tela A10",
  marca: "Samsung",
  modelo: "A10",
  qualidade: "Premium",
  valor_dinheiro_pix: 70,
  valor_parcelado_6x: 90,
  valor_formatado: {
    dinheiro_pix: "R$ 70,00",
    parcelado_6x: "R$ 90,00",
    valor_parcela_6x: "R$ 15,00"
  }
}
```

## 🎯 Exemplo Completo de Fluxo

### Passo 1: Nó de Entrada (Pergunta do Usuário)
- Salva a resposta em: `{{modelo_perguntado}}`

### Passo 2: Nó "Http Request"

**URL:**
```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

**Método:** `GET`

**Headers:**
- Key: `Authorization`
- Value: `Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

**Parâmetros:**
- Key: `search` (ou `modelo`, `marca`)
- Value: `{{modelo_perguntado}}` ← Variável dinâmica!

**Salvar Resposta:**
- Campo: `RespostaCompleta`
- Valor: `{{response.data.data}}` ← Lista de produtos

### Passo 3: Nó "Mensagem" (Resposta ao Cliente)

**Opção A - Lista de Produtos:**
```
{{#if RespostaCompleta}}
📋 Produtos encontrados:

{{#each RespostaCompleta}}
━━━━━━━━━━━━━━━━━━━━
📱 {{nome}}
🏷️ {{marca}} {{modelo}} - {{qualidade}}

💰 Valor à vista/PIX: {{valor_formatado.dinheiro_pix}}
💳 Parcelado 6x: {{valor_formatado.parcelado_6x}}
   ({{valor_formatado.valor_parcela_6x}}/mês)
━━━━━━━━━━━━━━━━━━━━

{{/each}}
{{else}}
❌ Nenhum produto encontrado para "{{modelo_perguntado}}"
{{/if}}
```

**Opção B - Apenas o Primeiro Produto:**
```
{{#if RespostaCompleta.[0]}}
📱 {{RespostaCompleta.[0].nome}}
🏷️ {{RespostaCompleta.[0].marca}} {{RespostaCompleta.[0].modelo}}

💰 Valor: {{RespostaCompleta.[0].valor_formatado.dinheiro_pix}}
💳 Parcelado 6x: {{RespostaCompleta.[0].valor_formatado.parcelado_6x}}
{{else}}
❌ Produto não encontrado
{{/if}}
```

## 🔍 Variáveis Disponíveis

### Da Resposta da API:
- `{{response.message}}` - "Sucesso"
- `{{response.data.success}}` - true/false
- `{{response.data.data}}` - Array de produtos
- `{{response.data.data.[0]}}` - Primeiro produto
- `{{response.data.pagination.total}}` - Total de produtos

### Do Usuário:
- `{{modelo_perguntado}}` - O que o usuário digitou
- `{{mensagem_usuario}}` - Mensagem completa do usuário
- (depende do nome da variável no seu fluxo)

## 📝 Exemplo Prático

**Usuário pergunta:** "iPhone 12"

**Fluxo:**
1. Salva em: `{{produto_buscado}}` = "iPhone 12"
2. Http Request com parâmetro: `search={{produto_buscado}}`
3. Salva resposta: `{{response.data.data}}` em `{{Produtos}}`
4. Mensagem mostra os produtos encontrados

**Resultado:**
```
📋 Produtos encontrados:

━━━━━━━━━━━━━━━━━━━━
📱 Tela iPhone 12
🏷️ Apple iPhone 12 - Original

💰 Valor à vista/PIX: R$ 350,00
💳 Parcelado 6x: R$ 420,00
   (R$ 70,00/mês)
━━━━━━━━━━━━━━━━━━━━
```

## ✅ Configuração Recomendada

**Salvar Resposta:**
- Campo: `Produtos`
- Valor: `{{response.data.data}}`

**No Nó de Mensagem:**
```
{{#each Produtos}}
• {{nome}} - {{valor_formatado.dinheiro_pix}}
{{/each}}
```

---

**Use `{{response.data.data}}` para salvar a lista de produtos!**

