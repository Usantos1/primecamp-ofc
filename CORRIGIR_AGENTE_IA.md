# 🔧 Corrigir Configuração no Agente de IA

## ⚠️ Problema Identificado

Na seção "Salvar Resposta", você está usando:
- Campo: `RespostaCompleta`
- Valor: `{{response.data}}`

Isso pode não estar funcionando porque a resposta precisa ser parseada primeiro.

## ✅ SOLUÇÃO

### Opção 1: Salvar a Resposta Completa Primeiro

Na seção **"Salvar Resposta"**, configure:

**Campo:** `RespostaCompleta`  
**Valor:** `{{response}}` (sem `.data`)

Isso salva toda a resposta JSON primeiro.

### Opção 2: Acessar Diretamente no Nó de Mensagem

No nó **"Mensagem"**, ao invés de usar `{{{RespostaCompleta}}}`, use diretamente:

```
Produtos encontrados: {{response.pagination.total}}

{{#each response.data}}
- {{nome}} ({{marca}} {{modelo}})
  Valor: {{valor_formatado.dinheiro_pix}}
{{/each}}
```

### Opção 3: Salvar Apenas os Dados

Se quiser salvar apenas os produtos:

**Campo:** `Produtos`  
**Valor:** `{{response.data}}`

E depois no nó de mensagem use:
```
{{{Produtos}}}
```

## 📋 Configuração Recomendada

### 1. No Nó "Http Request":

**Salvar Resposta:**
- **Campo:** `RespostaAPI`
- **Valor:** `{{response}}`

### 2. No Nó "Mensagem":

Use uma destas opções:

**Opção A - Lista Simples:**
```
Produtos disponíveis: {{response.pagination.total}}

{{#each response.data}}
• {{nome}} - {{valor_formatado.dinheiro_pix}}
{{/each}}
```

**Opção B - Formato de Orçamento:**
```
📋 ORÇAMENTO

{{#each response.data}}
━━━━━━━━━━━━━━━━━━━━
{{nome}}
{{marca}} {{modelo}} - {{qualidade}}

💰 Valor à vista/PIX: {{valor_formatado.dinheiro_pix}}
💳 Parcelado 6x: {{valor_formatado.parcelado_6x}}
   ({{valor_formatado.valor_parcela_6x}}/mês)
━━━━━━━━━━━━━━━━━━━━

{{/each}}
```

**Opção C - Apenas o Primeiro Produto:**
```
{{#if response.data.[0]}}
Produto: {{response.data.[0].nome}}
Valor: {{response.data.[0].valor_formatado.dinheiro_pix}}
{{else}}
Nenhum produto encontrado.
{{/if}}
```

## 🔍 Debug

Se ainda não funcionar, teste salvando a resposta completa:

**Salvar Resposta:**
- **Campo:** `Debug`
- **Valor:** `{{response}}`

E no nó de mensagem, mostre:
```
{{{Debug}}}
```

Isso vai mostrar toda a estrutura da resposta para você ver o que está chegando.

## ⚠️ Importante

- Use `{{{variavel}}}` (3 chaves) para não escapar HTML/JSON
- Use `{{variavel}}` (2 chaves) para valores simples
- A resposta da API está em `response.data` (array)
- O total está em `response.pagination.total`

---

**Teste primeiro salvando `{{response}}` completo e depois acesse `response.data`!**

