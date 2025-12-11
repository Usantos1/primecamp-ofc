import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  OrdemServico, Cliente, Produto, Marca, Modelo, ItemOS, PagamentoOS,
  ConfiguracaoStatus, StatusOS, STATUS_OS_PADRAO, STATUS_OS_LABELS
} from '@/types/assistencia';

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
  ORDENS: 'assistencia_ordens',
  CLIENTES: 'assistencia_clientes',
  PRODUTOS: 'assistencia_produtos',
  MARCAS: 'assistencia_marcas',
  MODELOS: 'assistencia_modelos',
  ITENS_OS: 'assistencia_itens_os',
  PAGAMENTOS: 'assistencia_pagamentos',
  CONFIG_STATUS: 'assistencia_config_status',
  CONTADOR_OS: 'assistencia_contador_os',
};

// ==================== MARCAS E MODELOS PADRÃO ====================
const MARCAS_MODELOS_PADRAO = [
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
      'Galaxy Z Fold 5', 'Galaxy Z Fold 4', 'Galaxy Z Flip 5', 'Galaxy Z Flip 4',
      'Galaxy A54', 'Galaxy A53', 'Galaxy A34', 'Galaxy A14', 'Galaxy A04',
    ],
  },
  {
    marca: 'Motorola',
    modelos: [
      'Edge 40 Pro', 'Edge 40', 'Edge 30 Ultra', 'Edge 30',
      'Moto G84', 'Moto G73', 'Moto G53', 'Moto G34', 'Moto G24',
      'Razr 40 Ultra', 'Razr 40',
    ],
  },
  {
    marca: 'Xiaomi',
    modelos: [
      'Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14',
      'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13',
      'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13',
      'Redmi Note 12 Pro+', 'Redmi Note 12 Pro', 'Redmi Note 12',
      'POCO X6 Pro', 'POCO X6', 'POCO F5 Pro', 'POCO F5',
    ],
  },
  {
    marca: 'Realme',
    modelos: ['Realme 11 Pro+', 'Realme 11 Pro', 'Realme 11', 'Realme C55'],
  },
  {
    marca: 'OnePlus',
    modelos: ['OnePlus 12', 'OnePlus 11', 'OnePlus Nord 3'],
  },
];

// ==================== HELPERS ====================
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
  }
}

// ==================== BUSCAR CEP ====================
export async function buscarCEP(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
} | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return null;
    
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return null;
  }
}

// ==================== HOOK: ORDENS DE SERVIÇO ====================
export function useOrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(() => 
    loadFromStorage(STORAGE_KEYS.ORDENS, [])
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORDENS, ordens);
  }, [ordens]);

  const getNextNumero = useCallback((): number => {
    const contador = loadFromStorage(STORAGE_KEYS.CONTADOR_OS, 0) + 1;
    saveToStorage(STORAGE_KEYS.CONTADOR_OS, contador);
    return contador;
  }, []);

  const createOS = useCallback((data: Partial<OrdemServico>): OrdemServico => {
    const now = new Date();
    const novaOS: OrdemServico = {
      id: generateId(),
      numero: getNextNumero(),
      situacao: 'aberta',
      status: 'aberta',
      data_entrada: now.toISOString().split('T')[0],
      hora_entrada: now.toTimeString().slice(0, 5),
      cliente_id: data.cliente_id || '',
      cliente_nome: data.cliente_nome,
      telefone_contato: data.telefone_contato,
      tipo_aparelho: data.tipo_aparelho || 'Celular',
      marca_id: data.marca_id,
      marca_nome: data.marca_nome,
      modelo_id: data.modelo_id,
      modelo_nome: data.modelo_nome,
      imei: data.imei,
      numero_serie: data.numero_serie,
      cor: data.cor,
      senha_aparelho: data.senha_aparelho,
      possui_senha: data.possui_senha || false,
      deixou_aparelho: data.deixou_aparelho ?? true,
      descricao_problema: data.descricao_problema || '',
      descricao_servico: data.descricao_servico,
      checklist_entrada: data.checklist_entrada || [],
      checklist_saida: [],
      areas_defeito: data.areas_defeito || [],
      condicoes_equipamento: data.condicoes_equipamento,
      acessorios: data.acessorios,
      observacoes: data.observacoes,
      previsao_entrega: data.previsao_entrega,
      hora_previsao: data.hora_previsao,
      subtotal: 0,
      desconto: 0,
      valor_total: 0,
      created_at: now.toISOString(),
    };
    
    setOrdens(prev => [novaOS, ...prev]);
    return novaOS;
  }, [getNextNumero]);

  const updateOS = useCallback((id: string, data: Partial<OrdemServico>) => {
    setOrdens(prev => prev.map(os => 
      os.id === id ? { ...os, ...data, updated_at: new Date().toISOString() } : os
    ));
  }, []);

  const deleteOS = useCallback((id: string) => {
    setOrdens(prev => prev.filter(os => os.id !== id));
  }, []);

  const getOSById = useCallback((id: string): OrdemServico | undefined => {
    return ordens.find(os => os.id === id);
  }, [ordens]);

  const updateStatus = useCallback(async (id: string, status: StatusOS, notificar?: boolean) => {
    const updates: Partial<OrdemServico> = { status };
    
    if (status === 'entregue') {
      updates.situacao = 'fechada';
      updates.data_entrega = new Date().toISOString();
    }
    if (status === 'cancelada') {
      updates.situacao = 'cancelada';
    }
    if (status === 'finalizada') {
      updates.data_conclusao = new Date().toISOString();
    }
    
    updateOS(id, updates);
    
    if (notificar) {
      console.log(`Notificando cliente sobre status: ${STATUS_OS_LABELS[status]}`);
    }
  }, [updateOS]);

  const getEstatisticas = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0];
    
    return {
      total: ordens.length,
      abertas: ordens.filter(o => o.status === 'aberta').length,
      emAndamento: ordens.filter(o => ['em_andamento', 'aguardando_orcamento', 'aprovado'].includes(o.status)).length,
      aguardandoPeca: ordens.filter(o => o.status === 'aguardando_peca').length,
      finalizadas: ordens.filter(o => o.status === 'finalizada').length,
      aguardandoRetirada: ordens.filter(o => o.status === 'aguardando_retirada').length,
      entregues: ordens.filter(o => o.status === 'entregue').length,
      canceladas: ordens.filter(o => o.status === 'cancelada').length,
      hoje: ordens.filter(o => o.data_entrada === hoje).length,
      prazoHoje: ordens.filter(o => o.previsao_entrega === hoje && !['entregue', 'cancelada'].includes(o.status)).length,
      emAtraso: ordens.filter(o => 
        o.previsao_entrega && 
        o.previsao_entrega < hoje && 
        !['entregue', 'cancelada'].includes(o.status)
      ).length,
    };
  }, [ordens]);

  return {
    ordens,
    isLoading,
    createOS,
    updateOS,
    deleteOS,
    getOSById,
    updateStatus,
    getEstatisticas,
  };
}

// ==================== HOOK: CLIENTES ====================
export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() => 
    loadFromStorage(STORAGE_KEYS.CLIENTES, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLIENTES, clientes);
  }, [clientes]);

  const createCliente = useCallback((data: Partial<Cliente>): Cliente => {
    const novoCliente: Cliente = {
      id: generateId(),
      tipo_pessoa: data.tipo_pessoa || 'fisica',
      situacao: 'ativo',
      nome: data.nome || '',
      nome_fantasia: data.nome_fantasia,
      cpf_cnpj: data.cpf_cnpj,
      rg: data.rg,
      sexo: data.sexo,
      data_nascimento: data.data_nascimento,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      telefone: data.telefone,
      telefone2: data.telefone2,
      email: data.email,
      whatsapp: data.whatsapp,
      created_at: new Date().toISOString(),
    };
    
    setClientes(prev => [novoCliente, ...prev]);
    return novoCliente;
  }, []);

  const updateCliente = useCallback((id: string, data: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => 
      c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
    ));
  }, []);

  const deleteCliente = useCallback((id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  const getClienteById = useCallback((id: string): Cliente | undefined => {
    return clientes.find(c => c.id === id);
  }, [clientes]);

  const searchClientes = useCallback((query: string): Cliente[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(q) ||
      c.cpf_cnpj?.includes(query) ||
      c.telefone?.includes(query) ||
      c.whatsapp?.includes(query)
    );
  }, [clientes]);

  return {
    clientes,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteById,
    searchClientes,
  };
}

// ==================== HOOK: MARCAS E MODELOS ====================
export function useMarcasModelos() {
  const [marcas, setMarcas] = useState<Marca[]>(() => {
    const stored = loadFromStorage<Marca[]>(STORAGE_KEYS.MARCAS, []);
    if (stored.length === 0) {
      const marcasPadrao = MARCAS_MODELOS_PADRAO.map(m => ({
        id: generateId(),
        nome: m.marca,
        situacao: 'ativo' as const,
        created_at: new Date().toISOString(),
      }));
      saveToStorage(STORAGE_KEYS.MARCAS, marcasPadrao);
      return marcasPadrao;
    }
    return stored;
  });

  const [modelos, setModelos] = useState<Modelo[]>(() => {
    const stored = loadFromStorage<Modelo[]>(STORAGE_KEYS.MODELOS, []);
    if (stored.length === 0) {
      const modelosPadrao: Modelo[] = [];
      const marcasStored = loadFromStorage<Marca[]>(STORAGE_KEYS.MARCAS, []);
      
      MARCAS_MODELOS_PADRAO.forEach(mp => {
        const marca = marcasStored.find(m => m.nome === mp.marca);
        if (marca) {
          mp.modelos.forEach(nomeModelo => {
            modelosPadrao.push({
              id: generateId(),
              marca_id: marca.id,
              nome: nomeModelo,
              situacao: 'ativo',
              created_at: new Date().toISOString(),
            });
          });
        }
      });
      
      saveToStorage(STORAGE_KEYS.MODELOS, modelosPadrao);
      return modelosPadrao;
    }
    return stored;
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MARCAS, marcas);
  }, [marcas]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MODELOS, modelos);
  }, [modelos]);

  const getModelosByMarca = useCallback((marcaId: string): Modelo[] => {
    return modelos.filter(m => m.marca_id === marcaId && m.situacao === 'ativo');
  }, [modelos]);

  const getMarcaById = useCallback((id: string): Marca | undefined => {
    return marcas.find(m => m.id === id);
  }, [marcas]);

  const getModeloById = useCallback((id: string): Modelo | undefined => {
    return modelos.find(m => m.id === id);
  }, [modelos]);

  return {
    marcas: marcas.filter(m => m.situacao === 'ativo'),
    modelos: modelos.filter(m => m.situacao === 'ativo'),
    getModelosByMarca,
    getMarcaById,
    getModeloById,
  };
}

// ==================== HOOK: PRODUTOS ====================
export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>(() => 
    loadFromStorage(STORAGE_KEYS.PRODUTOS, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PRODUTOS, produtos);
  }, [produtos]);

  const createProduto = useCallback((data: Partial<Produto>): Produto => {
    const novoProduto: Produto = {
      id: generateId(),
      situacao: 'ativo',
      tipo: data.tipo || 'peca',
      descricao: data.descricao || '',
      descricao_abreviada: data.descricao_abreviada,
      codigo_barras: data.codigo_barras,
      referencia: data.referencia,
      preco_custo: data.preco_custo || 0,
      preco_venda: data.preco_venda || 0,
      margem_lucro: data.margem_lucro,
      estoque_atual: data.estoque_atual || 0,
      estoque_minimo: data.estoque_minimo,
      localizacao: data.localizacao,
      created_at: new Date().toISOString(),
    };
    
    setProdutos(prev => [novoProduto, ...prev]);
    return novoProduto;
  }, []);

  const updateProduto = useCallback((id: string, data: Partial<Produto>) => {
    setProdutos(prev => prev.map(p => 
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    ));
  }, []);

  const deleteProduto = useCallback((id: string) => {
    setProdutos(prev => prev.filter(p => p.id !== id));
  }, []);

  const getProdutoById = useCallback((id: string): Produto | undefined => {
    return produtos.find(p => p.id === id);
  }, [produtos]);

  const searchProdutos = useCallback((query: string): Produto[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return produtos.filter(p => 
      p.descricao.toLowerCase().includes(q) ||
      p.codigo_barras?.includes(query) ||
      p.referencia?.toLowerCase().includes(q)
    );
  }, [produtos]);

  return {
    produtos: produtos.filter(p => p.situacao === 'ativo'),
    createProduto,
    updateProduto,
    deleteProduto,
    getProdutoById,
    searchProdutos,
  };
}

// ==================== HOOK: ITENS DA OS ====================
export function useItensOS(osId: string) {
  const [allItens, setAllItens] = useState<ItemOS[]>(() => 
    loadFromStorage(STORAGE_KEYS.ITENS_OS, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ITENS_OS, allItens);
  }, [allItens]);

  const itens = useMemo(() => 
    allItens.filter(i => i.ordem_servico_id === osId),
    [allItens, osId]
  );

  const total = useMemo(() => 
    itens.reduce((acc, i) => acc + i.valor_total, 0),
    [itens]
  );

  const addItem = useCallback((data: Omit<ItemOS, 'id' | 'ordem_servico_id' | 'created_at'>) => {
    const novoItem: ItemOS = {
      ...data,
      id: generateId(),
      ordem_servico_id: osId,
      created_at: new Date().toISOString(),
    };
    setAllItens(prev => [...prev, novoItem]);
    return novoItem;
  }, [osId]);

  const updateItem = useCallback((id: string, data: Partial<ItemOS>) => {
    setAllItens(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  }, []);

  const removeItem = useCallback((id: string) => {
    setAllItens(prev => prev.filter(i => i.id !== id));
  }, []);

  return { itens, total, addItem, updateItem, removeItem };
}

// ==================== HOOK: PAGAMENTOS ====================
export function usePagamentos(osId: string) {
  const [allPagamentos, setAllPagamentos] = useState<PagamentoOS[]>(() => 
    loadFromStorage(STORAGE_KEYS.PAGAMENTOS, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAGAMENTOS, allPagamentos);
  }, [allPagamentos]);

  const pagamentos = useMemo(() => 
    allPagamentos.filter(p => p.ordem_servico_id === osId),
    [allPagamentos, osId]
  );

  const totalPago = useMemo(() => 
    pagamentos.reduce((acc, p) => acc + p.valor, 0),
    [pagamentos]
  );

  const addPagamento = useCallback((data: Omit<PagamentoOS, 'id' | 'ordem_servico_id' | 'created_at'>) => {
    const novoPagamento: PagamentoOS = {
      ...data,
      id: generateId(),
      ordem_servico_id: osId,
      created_at: new Date().toISOString(),
    };
    setAllPagamentos(prev => [...prev, novoPagamento]);
    return novoPagamento;
  }, [osId]);

  return { pagamentos, totalPago, addPagamento };
}

// ==================== HOOK: CONFIGURAÇÃO DE STATUS ====================
export function useConfiguracaoStatus() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoStatus[]>(() => {
    const stored = loadFromStorage<ConfiguracaoStatus[]>(STORAGE_KEYS.CONFIG_STATUS, []);
    if (stored.length === 0) {
      saveToStorage(STORAGE_KEYS.CONFIG_STATUS, STATUS_OS_PADRAO);
      return STATUS_OS_PADRAO;
    }
    return stored;
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIG_STATUS, configuracoes);
  }, [configuracoes]);

  const getConfigByStatus = useCallback((status: StatusOS): ConfiguracaoStatus | undefined => {
    return configuracoes.find(c => c.status === status);
  }, [configuracoes]);

  const updateConfig = useCallback((id: string, data: Partial<ConfiguracaoStatus>) => {
    setConfiguracoes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  return { configuracoes, getConfigByStatus, updateConfig };
}
