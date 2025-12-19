# 🔧 Corrigir Variável de Modelo

## ⚠️ Problema Identificado

Vejo que você está usando `{{{modelo}}}` no parâmetro, mas a resposta mostra que está chegando literalmente `{{{modelo}}}` ao invés do valor.

## ✅ SOLUÇÃO

### No Parâmetro, use 2 chaves (não 3):

**Parâmetros:**
- **Key:** `modelo` (ou `search`)
- **Value:** `{{modelo}}` ← **2 chaves**, não 3!

**OU** se a variável tiver outro nome:
- **Value:** `{{resposta_usuario}}`
- **Value:** `{{mensagem}}`
- **Value:** `{{texto_pergunta}}`

### Por que 2 chaves?

- `{{modelo}}` → Resolve a variável (usa o valor)
- `{{{modelo}}}` → Escapa HTML/JSON (mantém como texto)

No **parâmetro da URL**, você quer o **valor**, não o texto!

## 📋 Configuração Correta

### Parâmetros:
```
Key: modelo
Value: {{modelo}}  ← 2 chaves!
```

### Salvar Resposta:
```
Campo: Produtos
Value: {{response.data.data}}
```

## 🔍 Verificar se a Variável Existe

Antes da requisição HTTP, certifique-se de que a variável `{{modelo}}` está sendo preenchida.

**Exemplo de fluxo:**
1. **Nó de Entrada** → Salva em `{{modelo}}` = "iPhone 12"
2. **Nó Http Request** → Usa `{{modelo}}` no parâmetro
3. **Nó Mensagem** → Mostra os produtos

## 🧪 Teste

Se ainda não funcionar, teste com um valor fixo primeiro:
- **Value:** `iPhone` (sem chaves, valor fixo)
- Se funcionar, o problema é a variável
- Se não funcionar, o problema é a API

Depois volte para `{{modelo}}` (2 chaves).

---

**Use `{{modelo}}` (2 chaves) no parâmetro, não `{{{modelo}}}` (3 chaves)!**

