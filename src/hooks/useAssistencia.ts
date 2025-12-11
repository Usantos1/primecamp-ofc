import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './use-toast';
import { 
  Cliente, Marca, Modelo, GrupoProduto, Produto, 
  OrdemServico, ItemOS, AdiantamentoOS, FotoOS,
  ClienteFormData, ProdutoFormData, OrdemServicoFormData,
  StatusOS, EstatisticasOS
} from '@/types/assistencia';

// ==========================================
// FUNÇÕES DE STORAGE
// ==========================================

const STORAGE_KEYS = {
  clientes: 'assistencia_clientes',
  marcas: 'assistencia_marcas',
  modelos: 'assistencia_modelos',
  grupos: 'assistencia_grupos',
  produtos: 'assistencia_produtos',
  ordens: 'assistencia_ordens',
  itensOS: 'assistencia_itens_os',
  adiantamentos: 'assistencia_adiantamentos',
  fotos: 'assistencia_fotos',
  ultimoNumeroOS: 'assistencia_ultimo_numero_os',
};

function loadFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getNextNumeroOS(): number {
  const ultimo = localStorage.getItem(STORAGE_KEYS.ultimoNumeroOS);
  const proximo = ultimo ? parseInt(ultimo) + 1 : 1;
  localStorage.setItem(STORAGE_KEYS.ultimoNumeroOS, proximo.toString());
  return proximo;
}

// ==========================================
// HOOK: CLIENTES
// ==========================================

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setClientes(loadFromStorage<Cliente>(STORAGE_KEYS.clientes));
    setIsLoading(false);
  }, []);

  const createCliente = useCallback((data: ClienteFormData) => {
    const newCliente: Cliente = {
      id: crypto.randomUUID(),
      codigo: clientes.length + 1,
      situacao: 'ativo',
      ...data,
      created_at: new Date().toISOString(),
    };
    const updated = [...clientes, newCliente];
    setClientes(updated);
    saveToStorage(STORAGE_KEYS.clientes, updated);
    toast({ title: 'Cliente cadastrado!' });
    return newCliente;
  }, [clientes, toast]);

  const updateCliente = useCallback((id: string, data: Partial<Cliente>) => {
    const updated = clientes.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c);
    setClientes(updated);
    saveToStorage(STORAGE_KEYS.clientes, updated);
    toast({ title: 'Cliente atualizado!' });
  }, [clientes, toast]);

  const deleteCliente = useCallback((id: string) => {
    const updated = clientes.filter(c => c.id !== id);
    setClientes(updated);
    saveToStorage(STORAGE_KEYS.clientes, updated);
    toast({ title: 'Cliente excluído!' });
  }, [clientes, toast]);

  const searchClientes = useCallback((termo: string) => {
    const search = termo.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(search) ||
      c.cpf_cnpj?.includes(search) ||
      c.telefone?.includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }, [clientes]);

  const getClienteById = useCallback((id: string) => {
    return clientes.find(c => c.id === id);
  }, [clientes]);

  return { clientes, isLoading, createCliente, updateCliente, deleteCliente, searchClientes, getClienteById };
}

// ==========================================
// HOOK: MARCAS
// ==========================================

export function useMarcas() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = loadFromStorage<Marca>(STORAGE_KEYS.marcas);
    if (stored.length === 0) {
      // Marcas padrão
      const defaults: Marca[] = [
        { id: '1', nome: 'Apple', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '2', nome: 'Samsung', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '3', nome: 'Motorola', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '4', nome: 'Xiaomi', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '5', nome: 'LG', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '6', nome: 'Asus', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '7', nome: 'Realme', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '8', nome: 'OnePlus', situacao: 'ativo', created_at: new Date().toISOString() },
      ];
      saveToStorage(STORAGE_KEYS.marcas, defaults);
      setMarcas(defaults);
    } else {
      setMarcas(stored);
    }
    setIsLoading(false);
  }, []);

  const createMarca = useCallback((nome: string) => {
    const newMarca: Marca = {
      id: crypto.randomUUID(),
      nome,
      situacao: 'ativo',
      created_at: new Date().toISOString(),
    };
    const updated = [...marcas, newMarca];
    setMarcas(updated);
    saveToStorage(STORAGE_KEYS.marcas, updated);
    toast({ title: 'Marca cadastrada!' });
    return newMarca;
  }, [marcas, toast]);

  const updateMarca = useCallback((id: string, data: Partial<Marca>) => {
    const updated = marcas.map(m => m.id === id ? { ...m, ...data } : m);
    setMarcas(updated);
    saveToStorage(STORAGE_KEYS.marcas, updated);
    toast({ title: 'Marca atualizada!' });
  }, [marcas, toast]);

  const deleteMarca = useCallback((id: string) => {
    const updated = marcas.filter(m => m.id !== id);
    setMarcas(updated);
    saveToStorage(STORAGE_KEYS.marcas, updated);
    toast({ title: 'Marca excluída!' });
  }, [marcas, toast]);

  return { marcas, isLoading, createMarca, updateMarca, deleteMarca };
}

// ==========================================
// HOOK: MODELOS
// ==========================================

export function useModelos(marcaId?: string) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = loadFromStorage<Modelo>(STORAGE_KEYS.modelos);
    if (marcaId) {
      setModelos(stored.filter(m => m.marca_id === marcaId));
    } else {
      setModelos(stored);
    }
    setIsLoading(false);
  }, [marcaId]);

  const createModelo = useCallback((marcaId: string, nome: string) => {
    const newModelo: Modelo = {
      id: crypto.randomUUID(),
      marca_id: marcaId,
      nome,
      situacao: 'ativo',
      created_at: new Date().toISOString(),
    };
    const all = loadFromStorage<Modelo>(STORAGE_KEYS.modelos);
    const updated = [...all, newModelo];
    saveToStorage(STORAGE_KEYS.modelos, updated);
    setModelos(prev => [...prev, newModelo]);
    toast({ title: 'Modelo cadastrado!' });
    return newModelo;
  }, [toast]);

  const updateModelo = useCallback((id: string, data: Partial<Modelo>) => {
    const all = loadFromStorage<Modelo>(STORAGE_KEYS.modelos);
    const updated = all.map(m => m.id === id ? { ...m, ...data } : m);
    saveToStorage(STORAGE_KEYS.modelos, updated);
    setModelos(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    toast({ title: 'Modelo atualizado!' });
  }, [toast]);

  const deleteModelo = useCallback((id: string) => {
    const all = loadFromStorage<Modelo>(STORAGE_KEYS.modelos);
    const updated = all.filter(m => m.id !== id);
    saveToStorage(STORAGE_KEYS.modelos, updated);
    setModelos(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Modelo excluído!' });
  }, [toast]);

  return { modelos, isLoading, createModelo, updateModelo, deleteModelo };
}

// ==========================================
// HOOK: PRODUTOS
// ==========================================

export function useProdutos(filters?: { tipo?: string; grupo_id?: string; marca_id?: string }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let stored = loadFromStorage<Produto>(STORAGE_KEYS.produtos);
    
    if (filters?.tipo) {
      stored = stored.filter(p => p.tipo === filters.tipo);
    }
    if (filters?.grupo_id) {
      stored = stored.filter(p => p.grupo_id === filters.grupo_id);
    }
    if (filters?.marca_id) {
      stored = stored.filter(p => p.marca_id === filters.marca_id);
    }
    
    setProdutos(stored.filter(p => p.situacao === 'ativo'));
    setIsLoading(false);
  }, [filters?.tipo, filters?.grupo_id, filters?.marca_id]);

  const createProduto = useCallback((data: ProdutoFormData) => {
    const all = loadFromStorage<Produto>(STORAGE_KEYS.produtos);
    const newProduto: Produto = {
      id: crypto.randomUUID(),
      codigo: all.length + 1,
      situacao: 'ativo',
      ...data,
      margem_lucro: data.preco_custo > 0 ? ((data.preco_venda - data.preco_custo) / data.preco_custo) * 100 : 0,
      created_at: new Date().toISOString(),
    };
    const updated = [...all, newProduto];
    saveToStorage(STORAGE_KEYS.produtos, updated);
    setProdutos(prev => [...prev, newProduto]);
    toast({ title: 'Produto cadastrado!' });
    return newProduto;
  }, [toast]);

  const updateProduto = useCallback((id: string, data: Partial<Produto>) => {
    const all = loadFromStorage<Produto>(STORAGE_KEYS.produtos);
    const updated = all.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p);
    saveToStorage(STORAGE_KEYS.produtos, updated);
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    toast({ title: 'Produto atualizado!' });
  }, [toast]);

  const deleteProduto = useCallback((id: string) => {
    const all = loadFromStorage<Produto>(STORAGE_KEYS.produtos);
    const updated = all.map(p => p.id === id ? { ...p, situacao: 'inativo' as const } : p);
    saveToStorage(STORAGE_KEYS.produtos, updated);
    setProdutos(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Produto inativado!' });
  }, [toast]);

  const searchProdutos = useCallback((termo: string) => {
    const search = termo.toLowerCase();
    return produtos.filter(p => 
      p.descricao.toLowerCase().includes(search) ||
      p.codigo_barras?.includes(search) ||
      p.referencia?.toLowerCase().includes(search)
    );
  }, [produtos]);

  const ajustarEstoque = useCallback((id: string, quantidade: number, tipo: 'entrada' | 'saida') => {
    const all = loadFromStorage<Produto>(STORAGE_KEYS.produtos);
    const updated = all.map(p => {
      if (p.id === id) {
        const novoEstoque = tipo === 'entrada' 
          ? p.estoque_atual + quantidade 
          : p.estoque_atual - quantidade;
        return { ...p, estoque_atual: Math.max(0, novoEstoque) };
      }
      return p;
    });
    saveToStorage(STORAGE_KEYS.produtos, updated);
    setProdutos(prev => prev.map(p => {
      if (p.id === id) {
        const novoEstoque = tipo === 'entrada' 
          ? p.estoque_atual + quantidade 
          : p.estoque_atual - quantidade;
        return { ...p, estoque_atual: Math.max(0, novoEstoque) };
      }
      return p;
    }));
    toast({ title: `Estoque ${tipo === 'entrada' ? 'adicionado' : 'removido'}!` });
  }, [toast]);

  return { produtos, isLoading, createProduto, updateProduto, deleteProduto, searchProdutos, ajustarEstoque };
}

// ==========================================
// HOOK: ORDENS DE SERVIÇO
// ==========================================

export function useOrdensServico(filters?: { 
  status?: StatusOS; 
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let stored = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    
    if (filters?.status) {
      stored = stored.filter(o => o.status === filters.status);
    }
    if (filters?.cliente_id) {
      stored = stored.filter(o => o.cliente_id === filters.cliente_id);
    }
    if (filters?.data_inicio) {
      stored = stored.filter(o => o.data_entrada >= filters.data_inicio!);
    }
    if (filters?.data_fim) {
      stored = stored.filter(o => o.data_entrada <= filters.data_fim!);
    }
    
    // Ordenar por número decrescente
    stored.sort((a, b) => b.numero - a.numero);
    
    setOrdens(stored);
    setIsLoading(false);
  }, [filters?.status, filters?.cliente_id, filters?.data_inicio, filters?.data_fim]);

  const createOrdem = useCallback((data: OrdemServicoFormData) => {
    const all = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    const numero = getNextNumeroOS();
    const now = new Date();
    
    const newOrdem: OrdemServico = {
      id: crypto.randomUUID(),
      numero,
      situacao: 'aberto',
      status: 'aberto',
      data_entrada: now.toISOString().split('T')[0],
      hora_entrada: now.toTimeString().slice(0, 5),
      ...data,
      subtotal: 0,
      desconto: 0,
      valor_total: 0,
      risco_peca: data.risco_peca || false,
      backup_autorizado: data.backup_autorizado || false,
      chip_cartao_memoria: data.chip_cartao_memoria || false,
      formatacao_autorizada: data.formatacao_autorizada || false,
      created_at: now.toISOString(),
    };
    
    const updated = [...all, newOrdem];
    saveToStorage(STORAGE_KEYS.ordens, updated);
    setOrdens(prev => [newOrdem, ...prev]);
    toast({ title: `OS #${numero} criada!` });
    return newOrdem;
  }, [toast]);

  const updateOrdem = useCallback((id: string, data: Partial<OrdemServico>) => {
    const all = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    const updated = all.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o);
    saveToStorage(STORAGE_KEYS.ordens, updated);
    setOrdens(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    toast({ title: 'OS atualizada!' });
  }, [toast]);

  const updateStatus = useCallback((id: string, status: StatusOS, observacao?: string) => {
    const all = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    const ordem = all.find(o => o.id === id);
    
    if (ordem) {
      const updated = all.map(o => o.id === id ? { 
        ...o, 
        status,
        situacao: status === 'entregue' || status === 'cancelado' ? 'fechado' as const : 'aberto' as const,
        data_conclusao: status === 'concluido' ? new Date().toISOString().split('T')[0] : o.data_conclusao,
        data_entrega: status === 'entregue' ? new Date().toISOString().split('T')[0] : o.data_entrega,
        updated_at: new Date().toISOString(),
      } : o);
      saveToStorage(STORAGE_KEYS.ordens, updated);
      setOrdens(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast({ title: `Status alterado para ${status}!` });
    }
  }, [toast]);

  const deleteOrdem = useCallback((id: string) => {
    const all = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    const updated = all.filter(o => o.id !== id);
    saveToStorage(STORAGE_KEYS.ordens, updated);
    setOrdens(prev => prev.filter(o => o.id !== id));
    toast({ title: 'OS excluída!' });
  }, [toast]);

  const getOrdemById = useCallback((id: string) => {
    const all = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    return all.find(o => o.id === id);
  }, []);

  // Estatísticas de OS
  const getEstatisticas = useCallback((): EstatisticasOS => {
    const hoje = new Date().toISOString().split('T')[0];
    return {
      total: ordens.length,
      abertas: ordens.filter(o => o.status === 'aberto').length,
      emAndamento: ordens.filter(o => o.status === 'em_andamento').length,
      aguardandoAprovacao: ordens.filter(o => o.status === 'aguardando_aprovacao' || o.status === 'aguardando_orcamento').length,
      finalizadas: ordens.filter(o => o.status === 'concluido').length,
      entregues: ordens.filter(o => o.status === 'entregue').length,
      atrasadas: ordens.filter(o => 
        o.data_previsao && 
        o.data_previsao < hoje && 
        !['concluido', 'entregue', 'cancelado'].includes(o.status)
      ).length,
      valorTotal: ordens.reduce((sum, o) => sum + (o.valor_total || 0), 0),
    };
  }, [ordens]);

  // Alias para compatibilidade
  const createOS = createOrdem;

  return { 
    ordens, isLoading, 
    createOrdem, createOS, 
    updateOrdem, updateStatus, deleteOrdem, getOrdemById,
    getEstatisticas
  };
}

// ==========================================
// HOOK: ITENS DA OS
// ==========================================

export function useItensOS(ordemId: string) {
  const [itens, setItens] = useState<ItemOS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const all = loadFromStorage<ItemOS>(STORAGE_KEYS.itensOS);
    setItens(all.filter(i => i.ordem_servico_id === ordemId));
    setIsLoading(false);
  }, [ordemId]);

  const addItem = useCallback((data: Omit<ItemOS, 'id' | 'ordem_servico_id' | 'created_at'>) => {
    const all = loadFromStorage<ItemOS>(STORAGE_KEYS.itensOS);
    const newItem: ItemOS = {
      id: crypto.randomUUID(),
      ordem_servico_id: ordemId,
      ...data,
      created_at: new Date().toISOString(),
    };
    const updated = [...all, newItem];
    saveToStorage(STORAGE_KEYS.itensOS, updated);
    setItens(prev => [...prev, newItem]);
    
    // Atualizar valor total da OS
    recalcularTotalOS(ordemId);
    
    toast({ title: 'Item adicionado!' });
    return newItem;
  }, [ordemId, toast]);

  const removeItem = useCallback((id: string) => {
    const all = loadFromStorage<ItemOS>(STORAGE_KEYS.itensOS);
    const updated = all.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.itensOS, updated);
    setItens(prev => prev.filter(i => i.id !== id));
    
    // Atualizar valor total da OS
    recalcularTotalOS(ordemId);
    
    toast({ title: 'Item removido!' });
  }, [ordemId, toast]);

  const recalcularTotalOS = (osId: string) => {
    const todosItens = loadFromStorage<ItemOS>(STORAGE_KEYS.itensOS);
    const itensOS = todosItens.filter(i => i.ordem_servico_id === osId);
    const subtotal = itensOS.reduce((sum, i) => sum + i.valor_total, 0);
    
    const ordens = loadFromStorage<OrdemServico>(STORAGE_KEYS.ordens);
    const updated = ordens.map(o => {
      if (o.id === osId) {
        return { ...o, subtotal, valor_total: subtotal - (o.desconto || 0) };
      }
      return o;
    });
    saveToStorage(STORAGE_KEYS.ordens, updated);
  };

  const total = itens.reduce((sum, i) => sum + i.valor_total, 0);

  return { itens, total, isLoading, addItem, removeItem };
}

// ==========================================
// HOOK: ADIANTAMENTOS
// ==========================================

export function useAdiantamentos(ordemId: string) {
  const [adiantamentos, setAdiantamentos] = useState<AdiantamentoOS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const all = loadFromStorage<AdiantamentoOS>(STORAGE_KEYS.adiantamentos);
    setAdiantamentos(all.filter(a => a.ordem_servico_id === ordemId));
    setIsLoading(false);
  }, [ordemId]);

  const addAdiantamento = useCallback((data: Omit<AdiantamentoOS, 'id' | 'ordem_servico_id' | 'created_at'>) => {
    const all = loadFromStorage<AdiantamentoOS>(STORAGE_KEYS.adiantamentos);
    const newAdiantamento: AdiantamentoOS = {
      id: crypto.randomUUID(),
      ordem_servico_id: ordemId,
      ...data,
      created_at: new Date().toISOString(),
    };
    const updated = [...all, newAdiantamento];
    saveToStorage(STORAGE_KEYS.adiantamentos, updated);
    setAdiantamentos(prev => [...prev, newAdiantamento]);
    toast({ title: 'Adiantamento registrado!' });
    return newAdiantamento;
  }, [ordemId, toast]);

  const removeAdiantamento = useCallback((id: string) => {
    const all = loadFromStorage<AdiantamentoOS>(STORAGE_KEYS.adiantamentos);
    const updated = all.filter(a => a.id !== id);
    saveToStorage(STORAGE_KEYS.adiantamentos, updated);
    setAdiantamentos(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Adiantamento removido!' });
  }, [toast]);

  const totalAdiantado = adiantamentos.reduce((sum, a) => sum + a.valor, 0);

  return { adiantamentos, totalAdiantado, isLoading, addAdiantamento, removeAdiantamento };
}

// ==========================================
// HOOK: GRUPOS DE PRODUTO
// ==========================================

export function useGruposProduto() {
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = loadFromStorage<GrupoProduto>(STORAGE_KEYS.grupos);
    if (stored.length === 0) {
      const defaults: GrupoProduto[] = [
        { id: '1', nome: 'Telas', situacao: 'ativo' },
        { id: '2', nome: 'Baterias', situacao: 'ativo' },
        { id: '3', nome: 'Conectores', situacao: 'ativo' },
        { id: '4', nome: 'Alto-Falantes', situacao: 'ativo' },
        { id: '5', nome: 'Câmeras', situacao: 'ativo' },
        { id: '6', nome: 'Botões', situacao: 'ativo' },
        { id: '7', nome: 'Capas e Películas', situacao: 'ativo' },
        { id: '8', nome: 'Serviços', situacao: 'ativo' },
      ];
      saveToStorage(STORAGE_KEYS.grupos, defaults);
      setGrupos(defaults);
    } else {
      setGrupos(stored);
    }
    setIsLoading(false);
  }, []);

  const createGrupo = useCallback((nome: string) => {
    const newGrupo: GrupoProduto = {
      id: crypto.randomUUID(),
      nome,
      situacao: 'ativo',
    };
    const updated = [...grupos, newGrupo];
    setGrupos(updated);
    saveToStorage(STORAGE_KEYS.grupos, updated);
    toast({ title: 'Grupo cadastrado!' });
    return newGrupo;
  }, [grupos, toast]);

  return { grupos, isLoading, createGrupo };
}

// ==========================================
// HOOK: MARCAS E MODELOS COMBINADOS
// ==========================================

export function useMarcasModelos() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Carregar marcas
    const storedMarcas = loadFromStorage<Marca>(STORAGE_KEYS.marcas);
    if (storedMarcas.length === 0) {
      const defaultMarcas: Marca[] = [
        { id: '1', nome: 'Apple', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '2', nome: 'Samsung', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '3', nome: 'Motorola', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '4', nome: 'Xiaomi', situacao: 'ativo', created_at: new Date().toISOString() },
        { id: '5', nome: 'LG', situacao: 'ativo', created_at: new Date().toISOString() },
      ];
      saveToStorage(STORAGE_KEYS.marcas, defaultMarcas);
      setMarcas(defaultMarcas);
    } else {
      setMarcas(storedMarcas);
    }
    
    // Carregar modelos
    const storedModelos = loadFromStorage<Modelo>(STORAGE_KEYS.modelos);
    setModelos(storedModelos);
    
    setIsLoading(false);
  }, []);

  const createMarca = useCallback((nome: string) => {
    const newMarca: Marca = {
      id: crypto.randomUUID(),
      nome,
      situacao: 'ativo',
      created_at: new Date().toISOString(),
    };
    const updated = [...marcas, newMarca];
    setMarcas(updated);
    saveToStorage(STORAGE_KEYS.marcas, updated);
    toast({ title: 'Marca cadastrada!' });
    return newMarca;
  }, [marcas, toast]);

  const createModelo = useCallback((marcaId: string, nome: string) => {
    const newModelo: Modelo = {
      id: crypto.randomUUID(),
      marca_id: marcaId,
      nome,
      situacao: 'ativo',
      created_at: new Date().toISOString(),
    };
    const updated = [...modelos, newModelo];
    setModelos(updated);
    saveToStorage(STORAGE_KEYS.modelos, updated);
    toast({ title: 'Modelo cadastrado!' });
    return newModelo;
  }, [modelos, toast]);

  const getModelosByMarca = useCallback((marcaId: string) => {
    return modelos.filter(m => m.marca_id === marcaId);
  }, [modelos]);

  return { marcas, modelos, isLoading, createMarca, createModelo, getModelosByMarca };
}
