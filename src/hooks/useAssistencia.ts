import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  OrdemServico, Cliente, Produto, Marca, Modelo, ItemOS, Pagamento,
  ConfiguracaoStatus, StatusOS, MARCAS_MODELOS_PADRAO, STATUS_OS_LABELS
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
    const novaOS: OrdemServico = {
      id: generateId(),
      numero: getNextNumero(),
      status: 'aguardando_aprovacao',
      cliente_id: data.cliente_id || '',
      cliente_nome: data.cliente_nome,
      telefone_contato: data.telefone_contato,
      tipo_aparelho: data.tipo_aparelho || 'celular',
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
      laudo_tecnico: data.laudo_tecnico,
      condicoes_equipamento: data.condicoes_equipamento,
      acessorios: data.acessorios,
      checklist_entrada: data.checklist_entrada || [],
      areas_defeito: data.areas_defeito || [],
      data_entrada: new Date().toISOString(),
      previsao_entrega: data.previsao_entrega,
      hora_previsao: data.hora_previsao,
      valor_total: 0,
      valor_pago: 0,
      desconto: 0,
      garantia_dias: 90,
      observacoes: data.observacoes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    updateOS(id, { 
      status,
      data_saida: status === 'entregue' ? new Date().toISOString() : undefined 
    });
    
    if (notificar) {
      // TODO: Integrar com WhatsApp API
      console.log(`Notificando cliente sobre status: ${STATUS_OS_LABELS[status]}`);
    }
  }, [updateOS]);

  const getEstatisticas = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0];
    
    return {
      total: ordens.length,
      aguardando_aprovacao: ordens.filter(o => o.status === 'aguardando_aprovacao').length,
      em_analise: ordens.filter(o => o.status === 'em_analise').length,
      aguardando_peca: ordens.filter(o => o.status === 'aguardando_peca').length,
      em_reparo: ordens.filter(o => o.status === 'em_reparo').length,
      pronto: ordens.filter(o => o.status === 'pronto').length,
      entregue: ordens.filter(o => o.status === 'entregue').length,
      cancelado: ordens.filter(o => o.status === 'cancelado').length,
      hoje: ordens.filter(o => o.data_entrada.split('T')[0] === hoje).length,
      prazoHoje: ordens.filter(o => o.previsao_entrega === hoje && !['entregue', 'cancelado'].includes(o.status)).length,
      emAtraso: ordens.filter(o => 
        o.previsao_entrega && 
        o.previsao_entrega < hoje && 
        !['entregue', 'cancelado'].includes(o.status)
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
      tipo_cliente: data.tipo_cliente || 'cliente',
      nome: data.nome || '',
      cpf_cnpj: data.cpf_cnpj,
      rg_ie: data.rg_ie,
      email: data.email,
      telefone: data.telefone,
      whatsapp: data.whatsapp,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      observacoes: data.observacoes,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      // Inicializar com marcas padrão
      const marcasPadrao = MARCAS_MODELOS_PADRAO.map(m => ({
        id: generateId(),
        nome: m.marca,
        ativo: true,
      }));
      saveToStorage(STORAGE_KEYS.MARCAS, marcasPadrao);
      return marcasPadrao;
    }
    return stored;
  });

  const [modelos, setModelos] = useState<Modelo[]>(() => {
    const stored = loadFromStorage<Modelo[]>(STORAGE_KEYS.MODELOS, []);
    if (stored.length === 0) {
      // Inicializar com modelos padrão
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
              ativo: true,
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
    return modelos.filter(m => m.marca_id === marcaId && m.ativo);
  }, [modelos]);

  const getMarcaById = useCallback((id: string): Marca | undefined => {
    return marcas.find(m => m.id === id);
  }, [marcas]);

  const getModeloById = useCallback((id: string): Modelo | undefined => {
    return modelos.find(m => m.id === id);
  }, [modelos]);

  const createMarca = useCallback((nome: string): Marca => {
    const nova: Marca = { id: generateId(), nome, ativo: true };
    setMarcas(prev => [...prev, nova]);
    return nova;
  }, []);

  const createModelo = useCallback((marcaId: string, nome: string): Modelo => {
    const novo: Modelo = { id: generateId(), marca_id: marcaId, nome, ativo: true };
    setModelos(prev => [...prev, novo]);
    return novo;
  }, []);

  return {
    marcas: marcas.filter(m => m.ativo),
    modelos: modelos.filter(m => m.ativo),
    getModelosByMarca,
    getMarcaById,
    getModeloById,
    createMarca,
    createModelo,
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
      codigo: data.codigo,
      codigo_barras: data.codigo_barras,
      descricao: data.descricao || '',
      tipo: data.tipo || 'peca',
      categoria: data.categoria,
      marca: data.marca,
      modelo_compativel: data.modelo_compativel,
      preco_custo: data.preco_custo || 0,
      preco_venda: data.preco_venda || 0,
      margem_lucro: data.margem_lucro || 0,
      estoque_atual: data.estoque_atual || 0,
      estoque_minimo: data.estoque_minimo || 0,
      localizacao: data.localizacao,
      ncm: data.ncm,
      unidade: data.unidade || 'UN',
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      p.codigo?.toLowerCase().includes(q) ||
      p.codigo_barras?.includes(query)
    );
  }, [produtos]);

  return {
    produtos,
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
    allItens.filter(i => i.os_id === osId),
    [allItens, osId]
  );

  const total = useMemo(() => 
    itens.reduce((acc, i) => acc + i.valor_total, 0),
    [itens]
  );

  const addItem = useCallback((data: Omit<ItemOS, 'id' | 'os_id' | 'created_at'>) => {
    const novoItem: ItemOS = {
      ...data,
      id: generateId(),
      os_id: osId,
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
  const [allPagamentos, setAllPagamentos] = useState<Pagamento[]>(() => 
    loadFromStorage(STORAGE_KEYS.PAGAMENTOS, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAGAMENTOS, allPagamentos);
  }, [allPagamentos]);

  const pagamentos = useMemo(() => 
    allPagamentos.filter(p => p.os_id === osId),
    [allPagamentos, osId]
  );

  const totalPago = useMemo(() => 
    pagamentos.reduce((acc, p) => acc + p.valor, 0),
    [pagamentos]
  );

  const addPagamento = useCallback((data: Omit<Pagamento, 'id' | 'os_id' | 'created_at'>) => {
    const novoPagamento: Pagamento = {
      ...data,
      id: generateId(),
      os_id: osId,
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
      // Configurações padrão
      const defaultConfig: ConfiguracaoStatus[] = [
        { id: generateId(), status: 'aguardando_aprovacao', mensagem_padrao: 'Sua OS foi criada e está aguardando aprovação.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'aprovado', mensagem_padrao: 'Sua OS foi aprovada e entrará em análise em breve.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'em_analise', mensagem_padrao: 'Seu aparelho está em análise técnica.', notificar_whatsapp: false, ativo: true },
        { id: generateId(), status: 'aguardando_peca', mensagem_padrao: 'Estamos aguardando a chegada de uma peça para continuar o reparo.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'em_reparo', mensagem_padrao: 'Seu aparelho está sendo reparado.', notificar_whatsapp: false, ativo: true },
        { id: generateId(), status: 'pronto', mensagem_padrao: 'Seu aparelho está pronto! Venha buscar.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'entregue', mensagem_padrao: 'Obrigado pela preferência! Seu aparelho foi entregue.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'cancelado', mensagem_padrao: 'Sua OS foi cancelada.', notificar_whatsapp: true, ativo: true },
        { id: generateId(), status: 'garantia', mensagem_padrao: 'Seu aparelho está em atendimento de garantia.', notificar_whatsapp: true, ativo: true },
      ];
      saveToStorage(STORAGE_KEYS.CONFIG_STATUS, defaultConfig);
      return defaultConfig;
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
