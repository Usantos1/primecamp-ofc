# Sistema de Importação de OS - Análise e Proposta

## 📋 Análise dos Dados do PDF

### Dados Extraídos do PDF:

#### 1. **Dados da OS**
- Número: 6942
- Data: 23/12/2025
- Hora: 14:50:00
- Status: AGUARDANDO ORÇAMENTO/CONSERTO → `aguardando_orcamento`
- Previsão Entrega: 23/12/2025 Hora: 18:00
- Senha: 0222

#### 2. **Dados do Cliente**
- Nome: LUIZ FERNANDO DA SILVA NASCIMENTO
- Contato: (19)99517-4294
- Telefone: (vazio)
- CPF/CNPJ: 478.147.388-14
- Endereço: RUA 4 - 130
- Bairro: RESIDENCIAL VILA PARK
- Cidade: CAMPINAS / SP
- CEP: 13057-204

#### 3. **Dados do Equipamento**
- Tipo: CELULAR → `celular`
- Modelo: XR
- Marca: APPLE
- Série: (vazio)
- IMEI: (vazio)

#### 4. **Problema e Condições**
- Problema Informado: "IPHONE XR CARREGAMENTO OSCILANDO"
- Condições do Aparelho: "carregamento oscilando, tela quebrada, bordas laterais com marcas de uso"

#### 5. **Checklist** (não será importado)
- Será criado vazio para preenchimento posterior no sistema

#### 6. **Outros Dados**
- Possui Senha: "NÃO SABE, VAI PASSAR DEPOIS" → `nao_sabe`
- Vendedor: NATALIA SANTOS

---

## 💡 Proposta de Implementação

### **Fase 1: Parser de Texto (Extração de Dados)**

#### ⭐ Opção A: Copiar e Colar Texto (RECOMENDADA)
**Vantagens:**
- ✅ Implementação mais simples e rápida
- ✅ Não precisa de biblioteca de OCR
- ✅ Funciona imediatamente sem dependências externas
- ✅ Mais rápido (sem processamento de imagem)
- ✅ Menor custo (sem API de OCR)
- ✅ Texto já está limpo e estruturado
- ✅ Usuário pode editar antes de colar se necessário

**Desvantagens:**
- ⚠️ Requer que o usuário copie o texto manualmente
- ⚠️ Depende da qualidade da cópia do texto

#### Opção B: Upload de PDF + OCR (Futuro - se necessário)
**Vantagens:**
- ✅ Mais automático (só fazer upload)
- ✅ Não precisa copiar texto

**Desvantagens:**
- ❌ Requer biblioteca de OCR (ex: Tesseract.js, Google Vision API)
- ❌ Mais complexo de implementar
- ❌ Pode ter custos (APIs pagas)
- ❌ Pode ter erros de OCR (texto mal reconhecido)
- ❌ Mais lento (processamento de imagem)

**Recomendação:** Começar com **Opção A (Copiar/Colar)** porque:
1. É mais rápido de implementar
2. Funciona bem com PDFs de texto (não imagens)
3. Não tem custos adicionais
4. Se no futuro precisar de OCR, pode ser adicionado como opção adicional

### **Fase 2: Mapeamento de Dados**

#### Estrutura de Mapeamento:
```typescript
interface PDFImportData {
  // OS
  numero_os?: string;
  data_entrada?: string;
  hora_entrada?: string;
  status?: string;
  previsao_entrega?: string;
  hora_previsao?: string;
  senha?: string;
  
  // Cliente
  cliente_nome?: string;
  cliente_cpf_cnpj?: string;
  telefone_contato?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  
  // Equipamento
  tipo_aparelho?: string;
  marca_nome?: string;
  modelo_nome?: string;
  imei?: string;
  numero_serie?: string;
  
  // Problema
  descricao_problema?: string;
  condicoes_equipamento?: string;
  
  // Outros
  possui_senha?: string;
  vendedor_nome?: string;
}
```

### **Fase 3: Validação e Criação**

#### Fluxo:
1. **Parse do texto** → Extrair dados estruturados
2. **Validação** → Verificar campos obrigatórios
3. **Buscar/Criar Cliente** → 
   - Buscar por CPF/CNPJ ou telefone
   - Se não existir, criar novo cliente
4. **Buscar/Criar Marca e Modelo** →
   - Buscar marca "APPLE"
   - Buscar modelo "XR" da marca APPLE
   - Se não existir, criar
5. **Mapear Status** →
   - "AGUARDANDO ORÇAMENTO/CONSERTO" → `aguardando_orcamento`
6. **Criar OS** →
   - Usar hook `createOS` com dados mapeados

---

## 🛠️ Implementação Técnica

### **Componente: ImportarOSModal**

```typescript
// src/pages/assistencia/ImportarOS.tsx

interface ImportarOSProps {
  onSuccess?: () => void;
}

export function ImportarOS({ onSuccess }: ImportarOSProps) {
  const [textoPDF, setTextoPDF] = useState('');
  const [dadosExtraidos, setDadosExtraidos] = useState<PDFImportData | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  
  // Função de parsing
  const parsePDFText = (texto: string): PDFImportData => {
    // Implementar lógica de parsing
  };
  
  // Função de validação
  const validarDados = (dados: PDFImportData): { valido: boolean; erros: string[] } => {
    // Validar campos obrigatórios
  };
  
  // Função de importação
  const importarOS = async () => {
    // 1. Parse
    // 2. Validação
    // 3. Buscar/Criar cliente
    // 4. Buscar/Criar marca/modelo
    // 5. Criar OS
  };
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar OS do PDF</DialogTitle>
          <DialogDescription>
            Cole o texto copiado do PDF abaixo
          </DialogDescription>
        </DialogHeader>
        
        <Textarea
          value={textoPDF}
          onChange={(e) => setTextoPDF(e.target.value)}
          placeholder="Cole aqui o texto do PDF..."
          rows={15}
        />
        
        <Button onClick={handleParse}>Extrair Dados</Button>
        
        {dadosExtraidos && (
          <PreviewDados dados={dadosExtraidos} />
        )}
        
        <Button onClick={importarOS}>Importar OS</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### **Função de Parsing**

```typescript
function parsePDFText(texto: string): PDFImportData {
  const dados: PDFImportData = {};
  
  // Extrair número da OS
  const osMatch = texto.match(/OS Nº (\d+)/i);
  if (osMatch) dados.numero_os = osMatch[1];
  
  // Extrair data
  const dataMatch = texto.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dataMatch) dados.data_entrada = dataMatch[1];
  
  // Extrair hora
  const horaMatch = texto.match(/Hora:\s*(\d{2}:\d{2}:\d{2})/i);
  if (horaMatch) dados.hora_entrada = horaMatch[1];
  
  // Extrair nome do cliente
  const clienteMatch = texto.match(/Cliente:\s*([^\n]+)/i);
  if (clienteMatch) dados.cliente_nome = clienteMatch[1].trim();
  
  // Extrair CPF/CNPJ
  const cpfMatch = texto.match(/CPF\/CNPJ:\s*([\d.\-\/]+)/i);
  if (cpfMatch) dados.cliente_cpf_cnpj = cpfMatch[1];
  
  // Extrair telefone contato
  const contatoMatch = texto.match(/Contato:\s*\(([^)]+)\)([\d\-]+)/i);
  if (contatoMatch) {
    dados.telefone_contato = `(${contatoMatch[1]})${contatoMatch[2]}`;
  }
  
  // Extrair marca e modelo
  const marcaMatch = texto.match(/Marca:\s*([^\n]+)/i);
  if (marcaMatch) dados.marca_nome = marcaMatch[1].trim();
  
  const modeloMatch = texto.match(/Modelo:\s*([^\n]+)/i);
  if (modeloMatch) dados.modelo_nome = modeloMatch[1].trim();
  
  // Extrair problema
  const problemaMatch = texto.match(/Problema Informado\s*\n([^\n]+)/i);
  if (problemaMatch) dados.descricao_problema = problemaMatch[1].trim();
  
  // Extrair status
  const statusMatch = texto.match(/Status da Ordem\s*:\s*([^\n]+)/i);
  if (statusMatch) dados.status = statusMatch[1].trim();
  
  // Extrair condições do aparelho
  const condicoesMatch = texto.match(/Condições do Aparelho\s*\n([^\n]+)/i);
  if (condicoesMatch) dados.condicoes_equipamento = condicoesMatch[1].trim();
  
  // Extrair vendedor
  const vendedorMatch = texto.match(/Vendedor:\s*([^\n]+)/i);
  if (vendedorMatch) dados.vendedor_nome = vendedorMatch[1].trim();
  
  return dados;
}
```

### **Mapeamento de Status**

```typescript
const STATUS_MAP: Record<string, StatusOS> = {
  'AGUARDANDO ORÇAMENTO/CONSERTO': 'aguardando_orcamento',
  'AGUARDANDO ORÇAMENTO': 'aguardando_orcamento',
  'EM ANDAMENTO': 'em_andamento',
  'FINALIZADA': 'finalizada',
  'AGUARDANDO RETIRADA': 'aguardando_retirada',
  'ENTREGUE': 'entregue',
  'CANCELADA': 'cancelada',
};
```


---

## ✅ Vantagens da Solução

1. **Não perde dados**: Todos os dados do PDF são preservados
2. **Flexível**: Funciona com texto colado (não precisa upload de PDF)
3. **Validação**: Verifica dados antes de criar
4. **Preview**: Mostra dados extraídos antes de importar
5. **Reutilização**: Busca cliente existente ou cria novo
6. **Extensível**: Pode evoluir para OCR no futuro

---

## 🚀 Próximos Passos

1. Criar componente `ImportarOS.tsx`
2. Implementar função de parsing
3. Criar preview dos dados extraídos
4. Implementar validação
5. Integrar com hooks existentes (useClientes, useMarcasModelos, useOrdensServico)
6. Adicionar botão "Importar OS" na página de OS
7. Testar com diferentes formatos de PDF

---

## 📝 Notas Importantes

- O número da OS antiga pode ser salvo em um campo `numero_os_antigo` para referência
- Status precisa ser normalizado para os valores do sistema
- Cliente pode ser encontrado por CPF/CNPJ ou telefone
- Marca/Modelo podem ser criados automaticamente se não existirem
- Checklist não será importado (será criado vazio para preenchimento posterior)
- Acessórios não serão importados

