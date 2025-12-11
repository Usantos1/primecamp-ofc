// ==================== TIPOS BASE ====================

export type TipoAparelho = 'celular' | 'tablet' | 'notebook' | 'outro';
export type TipoPessoa = 'fisica' | 'juridica';
export type TipoCliente = 'cliente' | 'fornecedor' | 'ambos';
export type TipoProduto = 'peca' | 'servico' | 'acessorio';
export type TipoItemOS = 'peca' | 'servico' | 'mao_de_obra';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'boleto';

// ==================== STATUS DA OS ====================

export type StatusOS = 
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'em_analise'
  | 'aguardando_peca'
  | 'em_reparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado'
  | 'garantia';

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  em_analise: 'Em Análise',
  aguardando_peca: 'Aguardando Peça',
  em_reparo: 'Em Reparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  garantia: 'Em Garantia',
};

export const STATUS_OS_COLORS: Record<StatusOS, string> = {
  aguardando_aprovacao: 'bg-yellow-500',
  aprovado: 'bg-blue-500',
  em_analise: 'bg-purple-500',
  aguardando_peca: 'bg-orange-500',
  em_reparo: 'bg-indigo-500',
  pronto: 'bg-green-500',
  entregue: 'bg-emerald-600',
  cancelado: 'bg-red-500',
  garantia: 'bg-amber-600',
};

// ==================== CHECKLIST ====================

export interface ChecklistItem {
  id: string;
  nome: string;
  categoria: 'fisico' | 'funcional';
  descricao?: string;
}

export const CHECKLIST_ITENS: ChecklistItem[] = [
  // Estado Físico
  { id: 'tela_trincada', nome: 'Tela Trincada', categoria: 'fisico' },
  { id: 'tela_riscada', nome: 'Tela Riscada', categoria: 'fisico' },
  { id: 'carcaca_danificada', nome: 'Carcaça Danificada', categoria: 'fisico' },
  { id: 'botoes_danificados', nome: 'Botões Danificados', categoria: 'fisico' },
  { id: 'camera_riscada', nome: 'Câmera Riscada', categoria: 'fisico' },
  { id: 'entrada_danificada', nome: 'Entrada Carregador Danificada', categoria: 'fisico' },
  { id: 'alto_falante_sujo', nome: 'Alto-falante Sujo', categoria: 'fisico' },
  { id: 'oxidacao', nome: 'Oxidação/Molhado', categoria: 'fisico' },
  { id: 'tampa_solta', nome: 'Tampa Traseira Solta', categoria: 'fisico' },
  { id: 'pelicula_danificada', nome: 'Película Danificada', categoria: 'fisico' },
  
  // Estado Funcional
  { id: 'liga_normalmente', nome: 'Liga Normalmente', categoria: 'funcional' },
  { id: 'touch_funciona', nome: 'Touch Funciona', categoria: 'funcional' },
  { id: 'display_funciona', nome: 'Display Funciona', categoria: 'funcional' },
  { id: 'camera_traseira_funciona', nome: 'Câmera Traseira Funciona', categoria: 'funcional' },
  { id: 'camera_frontal_funciona', nome: 'Câmera Frontal Funciona', categoria: 'funcional' },
  { id: 'alto_falante_funciona', nome: 'Alto-falante Funciona', categoria: 'funcional' },
  { id: 'microfone_funciona', nome: 'Microfone Funciona', categoria: 'funcional' },
  { id: 'wifi_funciona', nome: 'Wi-Fi Funciona', categoria: 'funcional' },
  { id: 'bluetooth_funciona', nome: 'Bluetooth Funciona', categoria: 'funcional' },
  { id: 'carrega_normalmente', nome: 'Carrega Normalmente', categoria: 'funcional' },
  { id: 'bateria_boa', nome: 'Bateria em Bom Estado', categoria: 'funcional' },
  { id: 'biometria_funciona', nome: 'Biometria Funciona', categoria: 'funcional' },
  { id: 'face_id_funciona', nome: 'Face ID Funciona', categoria: 'funcional' },
  { id: 'sensores_funcionam', nome: 'Sensores Funcionam', categoria: 'funcional' },
  { id: 'gps_funciona', nome: 'GPS Funciona', categoria: 'funcional' },
];

// ==================== CONDIÇÕES DO APARELHO ====================

export interface CondicaoAparelho {
  id: string;
  nome: string;
  checked: boolean;
}

// ==================== MARCAS E MODELOS ====================

export interface Marca {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Modelo {
  id: string;
  marca_id: string;
  nome: string;
  ativo: boolean;
}

export const MARCAS_MODELOS_PADRAO: { marca: string; modelos: string[] }[] = [
  {
    marca: 'Apple',
    modelos: [
      'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
      'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
      'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 Mini',
      'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 Mini',
      'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
      'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
      'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
      'iPhone SE 3ª Geração', 'iPhone SE 2ª Geração', 'iPhone SE',
    ],
  },
  {
    marca: 'Samsung',
    modelos: [
      'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
      'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
      'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
      'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21', 'Galaxy S21 FE',
      'Galaxy S20 Ultra', 'Galaxy S20+', 'Galaxy S20', 'Galaxy S20 FE',
      'Galaxy Z Fold 5', 'Galaxy Z Fold 4', 'Galaxy Z Fold 3',
      'Galaxy Z Flip 5', 'Galaxy Z Flip 4', 'Galaxy Z Flip 3',
      'Galaxy A54', 'Galaxy A53', 'Galaxy A52', 'Galaxy A34', 'Galaxy A33',
      'Galaxy A14', 'Galaxy A13', 'Galaxy A04', 'Galaxy A03',
      'Galaxy M54', 'Galaxy M34', 'Galaxy M14',
    ],
  },
  {
    marca: 'Motorola',
    modelos: [
      'Edge 40 Pro', 'Edge 40', 'Edge 30 Ultra', 'Edge 30 Pro', 'Edge 30',
      'Moto G84', 'Moto G73', 'Moto G72', 'Moto G53', 'Moto G52',
      'Moto G34', 'Moto G24', 'Moto G14', 'Moto G04',
      'Moto E22', 'Moto E13',
      'Razr 40 Ultra', 'Razr 40',
    ],
  },
  {
    marca: 'Xiaomi',
    modelos: [
      'Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14',
      'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 13 Lite',
      'Xiaomi 12 Pro', 'Xiaomi 12', 'Xiaomi 12 Lite',
      'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13',
      'Redmi Note 12 Pro+', 'Redmi Note 12 Pro', 'Redmi Note 12',
      'Redmi Note 11 Pro+', 'Redmi Note 11 Pro', 'Redmi Note 11',
      'Redmi 13C', 'Redmi 12C', 'Redmi 12',
      'POCO X6 Pro', 'POCO X6', 'POCO X5 Pro', 'POCO X5',
      'POCO M6 Pro', 'POCO M5', 'POCO F5 Pro', 'POCO F5',
    ],
  },
  {
    marca: 'Realme',
    modelos: [
      'Realme GT 5 Pro', 'Realme GT 3', 'Realme GT Neo 5',
      'Realme 11 Pro+', 'Realme 11 Pro', 'Realme 11',
      'Realme C55', 'Realme C53', 'Realme C51',
    ],
  },
  {
    marca: 'OnePlus',
    modelos: [
      'OnePlus 12', 'OnePlus 12R',
      'OnePlus 11', 'OnePlus 11R',
      'OnePlus Nord 3', 'OnePlus Nord CE 3',
    ],
  },
  {
    marca: 'ASUS',
    modelos: [
      'ROG Phone 8 Pro', 'ROG Phone 8', 'ROG Phone 7 Ultimate', 'ROG Phone 7',
      'Zenfone 10', 'Zenfone 9',
    ],
  },
  {
    marca: 'LG',
    modelos: [
      'K62', 'K52', 'K42',
      'Velvet', 'Wing',
    ],
  },
];

// ==================== CLIENTE ====================

export interface Cliente {
  id: string;
  tipo_pessoa: TipoPessoa;
  tipo_cliente: TipoCliente;
  nome: string;
  cpf_cnpj?: string;
  rg_ie?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== PRODUTO ====================

export interface Produto {
  id: string;
  codigo?: string;
  codigo_barras?: string;
  descricao: string;
  tipo: TipoProduto;
  categoria?: string;
  marca?: string;
  modelo_compativel?: string;
  preco_custo: number;
  preco_venda: number;
  margem_lucro: number;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao?: string;
  ncm?: string;
  unidade: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== ORDEM DE SERVIÇO ====================

export interface OrdemServico {
  id: string;
  numero: number;
  status: StatusOS;
  
  // Cliente
  cliente_id: string;
  cliente_nome?: string;
  telefone_contato?: string;
  
  // Aparelho
  tipo_aparelho: TipoAparelho;
  marca_id?: string;
  marca_nome?: string;
  modelo_id?: string;
  modelo_nome?: string;
  imei?: string;
  numero_serie?: string;
  cor?: string;
  senha_aparelho?: string;
  possui_senha: boolean;
  deixou_aparelho: boolean;
  
  // Problema e Condições
  descricao_problema: string;
  laudo_tecnico?: string;
  condicoes_equipamento?: string;
  acessorios?: string;
  checklist_entrada: string[];
  areas_defeito: string[];
  
  // Datas
  data_entrada: string;
  previsao_entrega?: string;
  hora_previsao?: string;
  data_saida?: string;
  
  // Financeiro
  valor_total: number;
  valor_pago: number;
  desconto: number;
  
  // Técnico
  tecnico_id?: string;
  tecnico_nome?: string;
  
  // Outros
  observacoes?: string;
  garantia_dias: number;
  created_at: string;
  updated_at: string;
}

export interface OrdemServicoFormData {
  cliente_id: string;
  telefone_contato: string;
  tipo_aparelho: TipoAparelho;
  marca_id: string;
  modelo_id: string;
  imei: string;
  numero_serie: string;
  cor: string;
  senha_aparelho: string;
  possui_senha: boolean;
  deixou_aparelho: boolean;
  descricao_problema: string;
  condicoes_equipamento: string;
  acessorios: string;
  previsao_entrega: string;
  hora_previsao: string;
  observacoes: string;
  checklist_entrada: string[];
  areas_defeito: string[];
}

// ==================== ITENS DA OS ====================

export interface ItemOS {
  id: string;
  os_id: string;
  produto_id?: string;
  tipo: TipoItemOS;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
  created_at: string;
}

// ==================== PAGAMENTOS ====================

export interface Pagamento {
  id: string;
  os_id: string;
  tipo: 'adiantamento' | 'pagamento_final';
  forma_pagamento: FormaPagamento;
  valor: number;
  data_pagamento: string;
  observacoes?: string;
  created_at: string;
}

// ==================== CONFIGURAÇÃO DE STATUS ====================

export interface ConfiguracaoStatus {
  id: string;
  status: StatusOS;
  mensagem_padrao: string;
  notificar_whatsapp: boolean;
  ativo: boolean;
}
