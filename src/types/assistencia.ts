// ==========================================
// TIPOS PARA SISTEMA DE ASSISTÊNCIA TÉCNICA
// ==========================================

// Cliente
export interface Cliente {
  id: string;
  codigo?: number;
  tipo_pessoa: 'fisica' | 'juridica';
  tipo_cadastro: 'cliente' | 'fornecedor' | 'colaborador';
  situacao: 'ativo' | 'inativo';
  
  // Dados pessoais
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg?: string;
  inscricao_municipal?: string;
  sexo?: 'M' | 'F' | 'O';
  data_nascimento?: string;
  
  // Endereço
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  
  // Contato
  telefone?: string;
  telefone2?: string;
  email?: string;
  whatsapp?: string;
  
  // Financeiro
  limite_credito?: number;
  dia_vencimento?: number;
  
  // Metadata
  created_at: string;
  updated_at?: string;
}

// Marca de celular
export interface Marca {
  id: string;
  nome: string;
  logo_url?: string;
  situacao: 'ativo' | 'inativo';
  created_at: string;
}

// Modelo de celular
export interface Modelo {
  id: string;
  marca_id: string;
  marca?: Marca;
  nome: string;
  imagem_url?: string;
  situacao: 'ativo' | 'inativo';
  created_at: string;
}

// Grupo de produto
export interface GrupoProduto {
  id: string;
  nome: string;
  situacao: 'ativo' | 'inativo';
}

// Produto/Peça
export interface Produto {
  id: string;
  codigo?: number;
  codigo_barras?: string;
  situacao: 'ativo' | 'inativo';
  tipo: 'produto' | 'servico' | 'peca';
  
  // Descrição
  descricao: string;
  descricao_abreviada?: string;
  referencia?: string;
  
  // Classificação
  grupo_id?: string;
  grupo?: GrupoProduto;
  marca_id?: string;
  marca?: Marca;
  modelo_id?: string;
  modelo?: Modelo;
  
  // Valores
  preco_custo: number;
  preco_venda: number;
  margem_lucro?: number;
  
  // Estoque
  estoque_atual: number;
  estoque_minimo?: number;
  localizacao?: string;
  
  // Metadata
  created_at: string;
  updated_at?: string;
}

// Status da Ordem de Serviço
export type StatusOS = 
  | 'aberto'
  | 'aguardando_orcamento'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'em_andamento'
  | 'aguardando_peca'
  | 'concluido'
  | 'aguardando_retirada'
  | 'entregue'
  | 'cancelado';

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  aberto: 'Aberto',
  aguardando_orcamento: 'Aguardando Orçamento',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguardando Peça',
  concluido: 'Concluído',
  aguardando_retirada: 'Aguardando Retirada',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const STATUS_OS_COLORS: Record<StatusOS, string> = {
  aberto: 'bg-blue-500',
  aguardando_orcamento: 'bg-yellow-500',
  aguardando_aprovacao: 'bg-orange-500',
  aprovado: 'bg-green-500',
  em_andamento: 'bg-purple-500',
  aguardando_peca: 'bg-red-500',
  concluido: 'bg-emerald-500',
  aguardando_retirada: 'bg-cyan-500',
  entregue: 'bg-gray-500',
  cancelado: 'bg-gray-400',
};

// Filtros de OS
export interface FiltrosOS {
  status?: StatusOS;
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
  tecnico_id?: string;
}

// Estatísticas de OS
export interface EstatisticasOS {
  total: number;
  abertas: number;
  emAndamento: number;
  aguardandoAprovacao: number;
  finalizadas: number;
  entregues: number;
  atrasadas: number;
  valorTotal: number;
}

// Ordem de Serviço
export interface OrdemServico {
  id: string;
  numero: number;
  situacao: 'aberto' | 'fechado' | 'cancelado';
  status: StatusOS;
  
  // Datas
  data_entrada: string;
  hora_entrada: string;
  data_previsao?: string;
  hora_previsao?: string;
  data_conclusao?: string;
  data_entrega?: string;
  
  // Cliente
  cliente_id: string;
  cliente?: Cliente;
  telefone_contato?: string;
  
  // Aparelho
  tipo_aparelho: string;
  marca_id?: string;
  marca?: Marca;
  modelo_id?: string;
  modelo?: Modelo;
  imei?: string;
  numero_serie?: string;
  cor?: string;
  senha_aparelho?: string;
  possui_senha: boolean;
  deixou_aparelho: boolean;
  
  // Problema
  descricao_problema: string;
  condicoes_equipamento?: string;
  acessorios?: string;
  
  // Checklist de entrada
  tela_ok?: boolean;
  touch_ok?: boolean;
  botoes_ok?: boolean;
  camera_ok?: boolean;
  alto_falante_ok?: boolean;
  microfone_ok?: boolean;
  wifi_ok?: boolean;
  bluetooth_ok?: boolean;
  carregamento_ok?: boolean;
  bateria_ok?: boolean;
  
  // Autorizações
  risco_peca: boolean;
  backup_autorizado: boolean;
  chip_cartao_memoria: boolean;
  formatacao_autorizada: boolean;
  
  // Orçamento
  orcamento_pre_autorizado?: string;
  
  // Valores
  subtotal: number;
  desconto: number;
  valor_total: number;
  
  // Resolução
  descricao_solucao?: string;
  
  // Técnico
  tecnico_id?: string;
  tecnico_nome?: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  
  // Observações
  observacoes_internas?: string;
  observacoes_cliente?: string;
  informacoes_tecnicas?: string;
  
  // Metadata
  created_at: string;
  updated_at?: string;
}

// Item da OS (peças e serviços)
export interface ItemOS {
  id: string;
  ordem_servico_id: string;
  produto_id?: string;
  produto?: Produto;
  tipo: 'peca' | 'servico' | 'mao_de_obra';
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
}

// Adiantamento/Pagamento da OS
export interface AdiantamentoOS {
  id: string;
  ordem_servico_id: string;
  valor: number;
  forma_pagamento: 'dinheiro' | 'pix' | 'credito' | 'debito' | 'boleto';
  parcelas?: number;
  data_pagamento: string;
  observacao?: string;
  created_at: string;
}

// Histórico de status da OS
export interface HistoricoOS {
  id: string;
  ordem_servico_id: string;
  status_anterior: StatusOS;
  status_novo: StatusOS;
  observacao?: string;
  usuario_id?: string;
  usuario_nome?: string;
  created_at: string;
}

// Foto da OS
export interface FotoOS {
  id: string;
  ordem_servico_id: string;
  url: string;
  descricao?: string;
  tipo: 'entrada' | 'durante' | 'saida';
  created_at: string;
}

// Checklist da OS
export interface ChecklistOS {
  id: string;
  ordem_servico_id: string;
  tipo: 'entrada' | 'saida';
  item: string;
  status: boolean;
  observacao?: string;
  created_at: string;
}

// Form Data
export interface ClienteFormData {
  tipo_pessoa: 'fisica' | 'juridica';
  tipo_cadastro: 'cliente' | 'fornecedor' | 'colaborador';
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg?: string;
  sexo?: 'M' | 'F' | 'O';
  data_nascimento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  telefone2?: string;
  email?: string;
  whatsapp?: string;
  limite_credito?: number;
}

export interface ProdutoFormData {
  tipo: 'produto' | 'servico' | 'peca';
  descricao: string;
  descricao_abreviada?: string;
  codigo_barras?: string;
  referencia?: string;
  grupo_id?: string;
  marca_id?: string;
  modelo_id?: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo?: number;
  localizacao?: string;
}

export interface OrdemServicoFormData {
  cliente_id: string;
  telefone_contato?: string;
  tipo_aparelho: string;
  marca_id?: string;
  modelo_id?: string;
  imei?: string;
  numero_serie?: string;
  cor?: string;
  senha_aparelho?: string;
  possui_senha: boolean;
  deixou_aparelho: boolean;
  descricao_problema: string;
  condicoes_equipamento?: string;
  acessorios?: string;
  data_previsao?: string;
  hora_previsao?: string;
  orcamento_pre_autorizado?: string;
  risco_peca: boolean;
  backup_autorizado: boolean;
  chip_cartao_memoria: boolean;
  formatacao_autorizada: boolean;
  observacoes_cliente?: string;
}
