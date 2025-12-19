# 📊 Guia de Importação de Produtos em Massa

## 🎯 Solução Implementada

Criei uma solução completa para importar produtos em massa de planilhas Excel para o banco de dados.

## 📁 Arquivos Criados

1. **Edge Function:** `supabase/functions/import-produtos/index.ts`
   - Recebe JSON com produtos
   - Valida e mapeia dados
   - Insere em lotes (100 por vez)
   - Suporta ignorar duplicados ou atualizar existentes

2. **Componente React:** `src/components/ImportarProdutos.tsx`
   - Interface para upload de Excel
   - Processa planilha usando XLSX
   - Mostra resultado da importação

## 🚀 Como Usar

### Passo 1: Instalar Dependência

```bash
npm install xlsx
# ou
yarn add xlsx
```

### Passo 2: Adicionar Componente na Página de Produtos

Adicione o componente `ImportarProdutos` na página `/pdv/produtos` ou `/admin/produtos`.

### Passo 3: Fazer Deploy da Edge Function

```bash
supabase functions deploy import-produtos
```

### Passo 4: Usar a Interface

1. Acesse a página de produtos
2. Clique em "Importar Produtos"
3. Selecione o arquivo Excel
4. Escolha as opções:
   - ✅ Ignorar duplicados (padrão)
   - ✅ Atualizar existentes (sobrescreve)
5. Clique em "Importar"

## 📋 Formato da Planilha

### Colunas Obrigatórias:
- **Descrição** - Nome do produto
- **VI Venda** - Valor de venda (será usado como `valor_dinheiro_pix`)

### Colunas Opcionais:
- **Código** - Código interno
- **Código Barras** - Código de barras
- **Referência** - Referência do produto
- **Grupo** - Grupo/Categoria
- **Sub Grupo** - Subcategoria
- **VI Compra** - Valor de compra
- **VI Custo** - Valor de custo
- **Quantidade** - Quantidade em estoque
- **Margem %** - Margem de lucro

### Mapeamento Automático:

O sistema tenta extrair automaticamente:
- **Marca:** Detecta "Apple", "Samsung", etc. na descrição
- **Modelo:** Extrai modelo da descrição (ex: "iPhone 12")
- **Qualidade:** Padrão "Original" se não especificado
- **Valor Parcelado 6x:** Calculado automaticamente (20% de acréscimo)

## 🔧 Configuração da Página

Adicione o componente na página de produtos:

```tsx
import { ImportarProdutos } from '@/components/ImportarProdutos';

// Na página, adicione uma aba ou seção:
<Tabs>
  <TabsList>
    <TabsTrigger value="lista">Lista</TabsTrigger>
    <TabsTrigger value="importar">Importar</TabsTrigger>
  </TabsList>
  <TabsContent value="lista">
    {/* Lista de produtos existente */}
  </TabsContent>
  <TabsContent value="importar">
    <ImportarProdutos />
  </TabsContent>
</Tabs>
```

## 📊 Estrutura da Resposta

A API retorna:

```json
{
  "success": true,
  "resultado": {
    "total": 100,
    "validos": 95,
    "invalidos": 5,
    "inseridos": 90,
    "atualizados": 0,
    "erros": 5,
    "erros_detalhes": ["Lote 1: erro..."]
  },
  "mensagem": "90 produtos inseridos com sucesso"
}
```

## ⚙️ Opções de Importação

### Ignorar Duplicados (padrão)
- Se um produto com o mesmo nome já existe, ele é ignorado
- Útil para importações iniciais

### Atualizar Existentes
- Se um produto com o mesmo nome já existe, ele é atualizado
- Útil para atualizar preços e informações

## 🔒 Segurança

- Requer autenticação (token JWT)
- Validação de dados antes de inserir
- Processamento em lotes para performance
- Tratamento de erros robusto

## 📝 Exemplo de Planilha

| Descrição | VI Venda | Grupo | Sub Grupo |
|-----------|----------|-------|-----------|
| ADAPTADOR 90 GRAU HDMI | 15.00 | ACESSÓRIOS | GERAL |
| TELA IPHONE 12 | 350.00 | PEÇAS | TELAS |
| BATERIA SAMSUNG A10 | 80.00 | PEÇAS | BATERIAS |

## ✅ Próximos Passos

1. Instalar `xlsx`: `npm install xlsx`
2. Adicionar componente na página de produtos
3. Fazer deploy: `supabase functions deploy import-produtos`
4. Testar com uma planilha pequena primeiro

---

**Pronto para importar produtos em massa!** 🎉

