# 🧪 Teste Rápido da API de Produtos

## 📋 Preencha os Campos Assim:

### 1. **URL:**
```
https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos
```

### 2. **Método:**
```
GET
```

### 3. **Headers:**
Clique em "Adicionar Header" e adicione:

**Key:** `Authorization`  
**Value:** `Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

OU

**Key:** `x-api-token`  
**Value:** `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

### 4. **Parâmetros:**
Clique em "Adicionar Parâmetro" e adicione (opcional):

**Para buscar todos os produtos:**
- Não adicione nenhum parâmetro

**Para buscar por termo:**
- **Key:** `search`  
- **Value:** `iPhone` (ou qualquer termo)

**Para filtrar por marca:**
- **Key:** `marca`  
- **Value:** `Apple`

**Para filtrar por modelo:**
- **Key:** `modelo`  
- **Value:** `iPhone 12`

**Para limitar resultados:**
- **Key:** `limit`  
- **Value:** `10`

### 5. **Body:**
Deixe vazio (não é necessário para GET)

---

## 🎯 Exemplos de Teste:

### Teste 1: Buscar todos os produtos
- URL: `https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos`
- Método: `GET`
- Header: `Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`
- Parâmetros: Nenhum

### Teste 2: Buscar por termo "iPhone"
- URL: `https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos`
- Método: `GET`
- Header: `Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`
- Parâmetros:
  - `search` = `iPhone`

### Teste 3: Filtrar por marca "Apple"
- URL: `https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/api-produtos`
- Método: `GET`
- Header: `Authorization: Bearer 56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`
- Parâmetros:
  - `marca` = `Apple`
  - `limit` = `5`

---

## ✅ Resposta Esperada:

Se tudo estiver correto, você receberá uma resposta JSON assim:

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
    "total": 1,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

## ⚠️ Se der erro 401:

Significa que o token não está configurado no Supabase. Você precisa:

1. Ir no **Supabase Dashboard**
2. **Project Settings** → **Edge Functions** → **Secrets**
3. Adicionar: `API_PRODUTOS_TOKEN` = `56291b834e7f270e1a3da9199e40c8af3a9fd0b89051ede6781b6b935a1682e4`

## ⚠️ Se der erro 500:

Pode ser que a função ainda não esteja deployada. Execute:

```bash
supabase functions deploy api-produtos
```

