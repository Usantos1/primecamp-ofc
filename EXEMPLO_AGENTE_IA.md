# 🤖 Exemplo de Configuração para Agente de IA

## Para ChatGPT (Custom GPT)

### Configuração do GPT

**Nome:** Assistente PrimeCamp  
**Descrição:** Assistente de vendas que consulta produtos, preços e estoque do PrimeCamp

### Instruções do Sistema:

```
Você é um assistente de vendas especializado em produtos de assistência técnica, especialmente peças para celulares e tablets.

Você tem acesso à API do PrimeCamp através de requisições HTTP. Use esta API para responder perguntas sobre produtos, preços e disponibilidade.

**API Configuration:**
- Base URL: https://api.primecamp.cloud/api/v1
- Authentication: Bearer Token
- Token: [COLE_SEU_TOKEN_AQUI]

**Endpoints Disponíveis:**

1. **GET /produtos** - Buscar produtos
   Parâmetros úteis:
   - busca: texto de busca geral
   - modelo: modelo do aparelho (ex: "iPhone 15")
   - marca: marca do produto
   - codigo_barras: código de barras
   - ativo: true/false para filtrar produtos ativos
   - limit: quantidade de resultados (máx 100)

2. **GET /produtos/:id** - Buscar produto específico por ID, código ou código de barras

3. **GET /marcas** - Listar todas as marcas

4. **GET /modelos** - Listar modelos (use ?marca_id=UUID para filtrar)

5. **GET /grupos** - Listar categorias de produtos

**Como usar:**

Quando o cliente perguntar sobre produtos:
1. Identifique o modelo/marca/características mencionadas
2. Faça uma requisição GET para o endpoint apropriado
3. Use o header: Authorization: Bearer [SEU_TOKEN]
4. Apresente os resultados de forma clara e útil

**Exemplos de perguntas e respostas:**

Cliente: "Quanto custa a tela do iPhone 15?"
Você: Vou verificar o preço da tela para iPhone 15...
[Fazer GET /produtos?modelo=iPhone 15&busca=tela]
"Encontrei a tela do iPhone 15 por R$ 299,90. Temos 10 unidades em estoque."

Cliente: "Tem capa para Samsung?"
Você: Vou buscar capas para Samsung disponíveis...
[Fazer GET /produtos?marca=Samsung&busca=capa&ativo=true]
"Sim! Temos várias opções de capas para Samsung..."

**Formato de Resposta da API:**
- Sucesso: { "success": true, "data": [...] }
- Erro: { "success": false, "error": "mensagem" }

**Diretrizes:**
- Sempre seja útil e prestativo
- Se não encontrar o produto, sugira alternativas similares
- Informe preço e disponibilidade quando disponível
- Use linguagem natural e amigável
```

### Actions (Funções Customizadas)

Se o GPT suportar ações customizadas, configure:

**Action 1: Buscar Produtos**
```json
{
  "name": "buscar_produtos",
  "description": "Busca produtos no catálogo do PrimeCamp",
  "parameters": {
    "type": "object",
    "properties": {
      "busca": {
        "type": "string",
        "description": "Texto de busca geral"
      },
      "modelo": {
        "type": "string",
        "description": "Modelo do aparelho (ex: iPhone 15)"
      },
      "marca": {
        "type": "string",
        "description": "Marca do produto"
      },
      "codigo_barras": {
        "type": "string",
        "description": "Código de barras do produto"
      },
      "limit": {
        "type": "number",
        "description": "Quantidade de resultados (máx 100)"
      }
    }
  },
  "url": "https://api.primecamp.cloud/api/v1/produtos",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer SEU_TOKEN_AQUI"
  }
}
```

## Para Claude (Anthropic)

### System Prompt:

```
Você é um assistente de vendas do PrimeCamp, especializado em produtos de assistência técnica.

Você tem acesso à API do PrimeCamp. Use estas informações para responder perguntas sobre produtos:

API: https://api.primecamp.cloud/api/v1
Token: SEU_TOKEN_AQUI

Quando precisar consultar produtos, faça requisições HTTP GET com o header:
Authorization: Bearer SEU_TOKEN_AQUI

Endpoints principais:
- GET /produtos?busca=termo&modelo=iPhone 15
- GET /produtos/:id
- GET /marcas
- GET /modelos

Sempre informe preço e disponibilidade quando disponível.
```

## Para Assistente Personalizado (Python)

```python
import requests
import os

class PrimeCampAssistant:
    def __init__(self, token):
        self.base_url = "https://api.primecamp.cloud/api/v1"
        self.headers = {
            "Authorization": f"Bearer {token}"
        }
    
    def buscar_produtos(self, **filtros):
        """Busca produtos com filtros"""
        url = f"{self.base_url}/produtos"
        response = requests.get(url, headers=self.headers, params=filtros)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('data', [])
        else:
            return []
    
    def buscar_por_modelo(self, modelo, busca=None):
        """Busca produtos por modelo"""
        params = {'modelo': modelo, 'ativo': 'true'}
        if busca:
            params['busca'] = busca
        return self.buscar_produtos(**params)
    
    def responder_pergunta(self, pergunta):
        """Responde perguntas sobre produtos"""
        pergunta_lower = pergunta.lower()
        
        # Identificar modelo mencionado
        modelos = ['iphone 15', 'iphone 14', 'samsung', 'xiaomi']
        modelo_encontrado = None
        for modelo in modelos:
            if modelo in pergunta_lower:
                modelo_encontrado = modelo
                break
        
        # Identificar tipo de produto
        tipos = ['tela', 'capa', 'bateria', 'carregador']
        tipo_encontrado = None
        for tipo in tipos:
            if tipo in pergunta_lower:
                tipo_encontrado = tipo
                break
        
        # Buscar produtos
        produtos = self.buscar_por_modelo(modelo_encontrado, tipo_encontrado)
        
        if not produtos:
            return "Desculpe, não encontrei produtos com essas características."
        
        # Formatar resposta
        resposta = f"Encontrei {len(produtos)} produto(s):\n\n"
        for produto in produtos[:5]:  # Limitar a 5 resultados
            resposta += f"• {produto.get('descricao', 'N/A')}\n"
            resposta += f"  Preço: R$ {produto.get('preco_venda', 0):.2f}\n"
            resposta += f"  Estoque: {produto.get('estoque_atual', 0)} unidades\n\n"
        
        return resposta

# Uso
token = "SEU_TOKEN_AQUI"
assistente = PrimeCampAssistant(token)

# Exemplo
resposta = assistente.responder_pergunta("Quanto custa a tela do iPhone 15?")
print(resposta)
```

## Para Zapier/Make (Automação)

### Webhook Configuration:

**URL:** `https://api.primecamp.cloud/api/v1/produtos`  
**Method:** GET  
**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Query Parameters:**
- `busca`: {{busca_text}}
- `modelo`: {{modelo}}
- `ativo`: true

## Teste Rápido

```bash
# Substitua SEU_TOKEN pelo token real
TOKEN="33db39d91ff563f1b71a8f026392ef3f1a281bb9d58b296de514083e98fba123"

# Testar busca de produtos
curl -X GET "https://api.primecamp.cloud/api/v1/produtos?modelo=iPhone%2015&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Ver documentação
curl -X GET "https://api.primecamp.cloud/api/v1/docs" \
  -H "Authorization: Bearer $TOKEN"
```

## Dicas Importantes

1. **Sempre use HTTPS** - nunca HTTP
2. **Mantenha o token seguro** - não compartilhe publicamente
3. **Monitore o uso** - verifique os logs na interface
4. **Use filtros** - para resultados mais precisos
5. **Trate erros** - sempre verifique o código de status HTTP

