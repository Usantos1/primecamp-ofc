// ==========================================
// TIPOS PARA SISTEMA DE ASSISTÊNCIA TÉCNICA
// ==========================================

// ==================== TIPOS BASE ====================

export type TipoAparelho = 'celular' | 'tablet' | 'notebook' | 'outro';
export type TipoPessoa = 'fisica' | 'juridica';
export type TipoCliente = 'cliente' | 'fornecedor' | 'ambos';
export type TipoProduto = 'peca' | 'servico' | 'produto';
export type TipoItemOS = 'peca' | 'servico' | 'mao_de_obra';
export type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'boleto' | 'transferencia';

// ==================== STATUS DA OS ====================

export type StatusOS = 
  | 'aberta'
  | 'aguardando_orcamento'
  | 'orcamento_enviado'
  | 'aprovado'
  | 'em_andamento'
  | 'aguardando_peca'
  | 'finalizada'
  | 'aguardando_retirada'
  | 'entregue'
  | 'cancelada';

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  aberta: 'Aberta',
  aguardando_orcamento: 'Aguardando Orçamento',
  orcamento_enviado: 'Orçamento Enviado',
  aprovado: 'Aprovado',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguardando Peça',
  finalizada: 'Finalizada',
  aguardando_retirada: 'Aguardando Retirada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

export const STATUS_OS_COLORS: Record<StatusOS, string> = {
  aberta: 'bg-blue-500',
  aguardando_orcamento: 'bg-yellow-500',
  orcamento_enviado: 'bg-orange-500',
  aprovado: 'bg-green-500',
  em_andamento: 'bg-purple-500',
  aguardando_peca: 'bg-red-500',
  finalizada: 'bg-emerald-500',
  aguardando_retirada: 'bg-cyan-500',
  entregue: 'bg-gray-500',
  cancelada: 'bg-gray-400',
};

// ==================== CONFIGURAÇÃO DE STATUS ====================

export interface ConfiguracaoStatus {
  id: string;
  status: StatusOS;
  label: string;
  cor: string;
  notificar_whatsapp: boolean;
  mensagem_whatsapp?: string;
  ordem: number;
  ativo: boolean;
}

export const STATUS_OS_PADRAO: ConfiguracaoStatus[] = [
  { id: '1', status: 'aberta', label: 'Aberta', cor: 'bg-blue-500', notificar_whatsapp: false, ordem: 1, ativo: true },
  { id: '2', status: 'aguardando_orcamento', label: 'Aguardando Orçamento', cor: 'bg-yellow-500', notificar_whatsapp: false, ordem: 2, ativo: true },
  { id: '3', status: 'orcamento_enviado', label: 'Orçamento Enviado', cor: 'bg-orange-500', notificar_whatsapp: true, mensagem_whatsapp: 'Olá {cliente}! O orçamento da sua OS #{numero} está pronto.', ordem: 3, ativo: true },
  { id: '4', status: 'aprovado', label: 'Aprovado', cor: 'bg-green-500', notificar_whatsapp: false, ordem: 4, ativo: true },
  { id: '5', status: 'em_andamento', label: 'Em Andamento', cor: 'bg-purple-500', notificar_whatsapp: false, ordem: 5, ativo: true },
  { id: '6', status: 'aguardando_peca', label: 'Aguardando Peça', cor: 'bg-red-500', notificar_whatsapp: true, mensagem_whatsapp: 'Olá {cliente}! Sua OS #{numero} está aguardando peça.', ordem: 6, ativo: true },
  { id: '7', status: 'finalizada', label: 'Finalizada', cor: 'bg-emerald-500', notificar_whatsapp: true, mensagem_whatsapp: 'Olá {cliente}! Seu aparelho da OS #{numero} está pronto!', ordem: 7, ativo: true },
  { id: '8', status: 'aguardando_retirada', label: 'Aguardando Retirada', cor: 'bg-cyan-500', notificar_whatsapp: false, ordem: 8, ativo: true },
  { id: '9', status: 'entregue', label: 'Entregue', cor: 'bg-gray-500', notificar_whatsapp: true, mensagem_whatsapp: 'Obrigado pela preferência!', ordem: 9, ativo: true },
  { id: '10', status: 'cancelada', label: 'Cancelada', cor: 'bg-gray-400', notificar_whatsapp: false, ordem: 10, ativo: true },
];

// ==================== CHECKLIST ====================

export interface ChecklistItem {
  id: string;
  nome: string;
  categoria: 'fisico' | 'funcional';
}

export const CHECKLIST_ITENS: ChecklistItem[] = [
  // Estado Físico
  { id: 'tela_trincada', nome: 'Tela Trincada', categoria: 'fisico' },
  { id: 'tela_riscada', nome: 'Tela Riscada', categoria: 'fisico' },
  { id: 'tampa_trincada', nome: 'Tampa Traseira Trincada', categoria: 'fisico' },
  { id: 'tampa_riscada', nome: 'Tampa Traseira Riscada', categoria: 'fisico' },
  { id: 'aro_amassado', nome: 'Aro/Lateral Amassado', categoria: 'fisico' },
  { id: 'aro_riscado', nome: 'Aro/Lateral Riscado', categoria: 'fisico' },
  { id: 'botoes_quebrados', nome: 'Botões Quebrados', categoria: 'fisico' },
  { id: 'camera_trincada', nome: 'Lente da Câmera Trincada', categoria: 'fisico' },
  { id: 'entrada_danificada', nome: 'Entrada Carregamento Danificada', categoria: 'fisico' },
  
  // Estado Funcional
  { id: 'touch_ok', nome: 'Touch Funcionando', categoria: 'funcional' },
  { id: 'display_ok', nome: 'Display Funcionando', categoria: 'funcional' },
  { id: 'som_ok', nome: 'Som Funcionando', categoria: 'funcional' },
  { id: 'microfone_ok', nome: 'Microfone Funcionando', categoria: 'funcional' },
  { id: 'camera_traseira_ok', nome: 'Câmera Traseira Funcionando', categoria: 'funcional' },
  { id: 'camera_frontal_ok', nome: 'Câmera Frontal Funcionando', categoria: 'funcional' },
  { id: 'wifi_ok', nome: 'Wi-Fi Funcionando', categoria: 'funcional' },
  { id: 'bluetooth_ok', nome: 'Bluetooth Funcionando', categoria: 'funcional' },
  { id: 'carregamento_ok', nome: 'Carregamento Funcionando', categoria: 'funcional' },
  { id: 'bateria_ok', nome: 'Bateria em Bom Estado', categoria: 'funcional' },
  { id: 'biometria_ok', nome: 'Biometria Funcionando', categoria: 'funcional' },
  { id: 'face_id_ok', nome: 'Face ID Funcionando', categoria: 'funcional' },
  { id: 'sensores_ok', nome: 'Sensores Funcionando', categoria: 'funcional' },
  { id: 'botoes_ok', nome: 'Botões Funcionando', categoria: 'funcional' },
  { id: 'vibracall_ok', nome: 'Vibracall Funcionando', categoria: 'funcional' },
];

// ==================== CLIENTE ====================

export interface Cliente {
  id: string;
  codigo?: number;
  tipo_pessoa: TipoPessoa;
  tipo_cliente?: TipoCliente;
  situacao?: 'ativo' | 'inativo';
  
  // Dados pessoais
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg?: string;
  sexo?: 'M' | 'F' | 'O';
  data_nascimento?: string;
  
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  
  // Contato
  telefone?: string;
  telefone2?: string;
  email?: string;
  whatsapp?: string;
  
  // Outros
  observacoes?: string;
  ativo?: boolean;
  limite_credito?: number;
  
  // Metadata
  created_at: string;
  updated_at?: string;
}

export interface ClienteFormData {
  tipo_pessoa: TipoPessoa;
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg?: string;
  sexo?: 'M' | 'F' | 'O';
  data_nascimento?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  telefone2?: string;
  email?: string;
  whatsapp?: string;
}

// ==================== MARCA E MODELO ====================

export interface Marca {
  id: string;
  nome: string;
  situacao?: 'ativo' | 'inativo';
  ativo?: boolean;
  created_at?: string;
}

export interface Modelo {
  id: string;
  marca_id: string;
  nome: string;
  situacao?: 'ativo' | 'inativo';
  ativo?: boolean;
  created_at?: string;
}

// ==================== PRODUTO ====================

export interface Produto {
  id: string;
  codigo?: number;
  codigo_barras?: string;
  situacao?: 'ativo' | 'inativo';
  ativo?: boolean;
  tipo: TipoProduto;
  
  descricao: string;
  descricao_abreviada?: string;
  referencia?: string;
  categoria?: string;
  
  grupo_id?: string;
  marca?: string;
  marca_id?: string;
  modelo_id?: string;
  modelo_compativel?: string;
  
  preco_custo: number;
  preco_venda: number;
  margem_lucro?: number;
  
  estoque_atual: number;
  estoque_minimo?: number;
  localizacao?: string;
  
  ncm?: string;
  unidade?: string;
  
  created_at: string;
  updated_at?: string;
}

export interface ProdutoFormData {
  tipo: TipoProduto;
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

// ==================== CARGO ====================

export type Cargo = 'tecnico' | 'vendedor' | 'atendente' | 'admin';

export const CARGOS_LABELS: Record<Cargo, string> = {
  tecnico: 'Técnico',
  vendedor: 'Vendedor',
  atendente: 'Atendente',
  admin: 'Administrador',
};

// ==================== ORDEM DE SERVIÇO ====================

export interface OrdemServico {
  id: string;
  numero: number;
  situacao: 'aberta' | 'fechada' | 'cancelada';
  status: StatusOS;
  
  // Datas
  data_entrada: string;
  hora_entrada?: string;
  previsao_entrega?: string;
  hora_previsao?: string;
  data_conclusao?: string;
  data_entrega?: string;
  data_saida?: string;
  
  // Cliente
  cliente_id: string;
  cliente_nome?: string;
  cliente_empresa?: string; // Nome da empresa (se existir)
  telefone_contato: string; // Obrigatório
  
  // Aparelho
  tipo_aparelho: TipoAparelho | string;
  marca_id?: string;
  marca_nome?: string;
  modelo_id?: string;
  modelo_nome?: string;
  imei?: string;
  numero_serie?: string;
  cor?: string;
  senha_aparelho?: string;
  senha_numerica?: string; // Para iPhone
  padrao_desbloqueio?: string; // Padrão de desbloqueio (bolinhas)
  possui_senha: boolean;
  deixou_aparelho: boolean;
  apenas_agendamento: boolean; // Se é apenas agendamento ou deixou aparelho
  
  // Problema
  descricao_problema: string;
  descricao_servico?: string;
  problema_constatado?: string; // Problema constatado na resolução
  laudo_tecnico?: string;
  
  // Resolução
  tecnico_id?: string;
  tecnico_nome?: string;
  servico_executado?: string; // Serviço executado
  
  // Checklist
  checklist_entrada: string[];
  checklist_saida?: string[];
  areas_defeito: string[];
  observacoes_checklist?: string; // Observações gerais do checklist
  
  // Condições
  condicoes_equipamento?: string;
  observacoes?: string;
  observacoes_internas?: string; // Informações técnicas internas
  
  // Orçamento pré-autorizado
  orcamento_parcelado?: number; // Valor parcelado (débito/crédito até 6x)
  orcamento_desconto?: number; // Valor com desconto (dinheiro/PIX)
  orcamento_autorizado?: boolean;
  
  // Valores
  subtotal?: number;
  desconto?: number;
  valor_total: number;
  valor_pago?: number;
  
  // Vendedor/Atendente
  vendedor_id?: string;
  vendedor_nome?: string;
  atendente_id?: string;
  atendente_nome?: string;
  
  // Garantia
  garantia_dias?: number;
  
  // Fotos
  fotos_entrada?: string[];
  fotos_saida?: string[];
  fotos_drive_folder_id?: string; // ID da pasta no Google Drive
  
  // Metadata
  created_at: string;
  updated_at?: string;
}

export interface OrdemServicoFormData {
  cliente_id: string;
  telefone_contato: string; // Obrigatório
  tipo_aparelho: string;
  marca_id?: string;
  modelo_id?: string;
  imei?: string;
  numero_serie?: string;
  cor?: string;
  senha_aparelho?: string;
  senha_numerica?: string; // Para iPhone
  padrao_desbloqueio?: string; // Padrão de desbloqueio
  possui_senha: boolean;
  deixou_aparelho: boolean;
  apenas_agendamento: boolean;
  descricao_problema: string;
  condicoes_equipamento?: string;
  previsao_entrega?: string;
  hora_previsao?: string;
  observacoes?: string;
  observacoes_internas?: string;
  checklist_entrada: string[];
  areas_defeito: string[];
  observacoes_checklist?: string;
  // Resolução
  problema_constatado?: string;
  tecnico_id?: string;
  servico_executado?: string;
  // Orçamento
  orcamento_parcelado?: number;
  orcamento_desconto?: number;
  orcamento_autorizado?: boolean;
}

// ==================== ITENS DA OS ====================

export interface ItemOS {
  id: string;
  os_id?: string;
  ordem_servico_id?: string;
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

export interface PagamentoOS {
  id: string;
  ordem_servico_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  parcelas?: number;
  data_pagamento: string;
  observacao?: string;
  tipo: 'adiantamento' | 'pagamento_final';
  created_at: string;
}

// ==================== ESTATÍSTICAS ====================

export interface EstatisticasOS {
  total: number;
  abertas: number;
  emAndamento: number;
  aguardando: number;
  finalizadas: number;
  entregues: number;
  atrasadas: number;
  valorTotal: number;
  valorPendente: number;
}
