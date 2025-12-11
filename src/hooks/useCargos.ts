import { useState, useEffect, useCallback } from 'react';
import { Cargo, CARGOS_LABELS } from '@/types/assistencia';

interface Colaborador {
  id: string;
  nome: string;
  cargo: Cargo;
  ativo: boolean;
  email?: string;
  telefone?: string;
  created_at: string;
}

const STORAGE_KEY = 'assistencia_colaboradores';

const COLABORADORES_PADRAO: Colaborador[] = [
  { id: '1', nome: 'Técnico 1', cargo: 'tecnico', ativo: true, created_at: new Date().toISOString() },
  { id: '2', nome: 'Técnico 2', cargo: 'tecnico', ativo: true, created_at: new Date().toISOString() },
  { id: '3', nome: 'Vendedor 1', cargo: 'vendedor', ativo: true, created_at: new Date().toISOString() },
  { id: '4', nome: 'Atendente 1', cargo: 'atendente', ativo: true, created_at: new Date().toISOString() },
];

export function useCargos() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar colaboradores
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setColaboradores(JSON.parse(stored));
      } else {
        setColaboradores(COLABORADORES_PADRAO);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(COLABORADORES_PADRAO));
      }
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      setColaboradores(COLABORADORES_PADRAO);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar colaboradores
  const saveColaboradores = useCallback((newColaboradores: Colaborador[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColaboradores));
      setColaboradores(newColaboradores);
    } catch (error) {
      console.error('Erro ao salvar colaboradores:', error);
    }
  }, []);

  // Criar colaborador
  const createColaborador = useCallback((data: Omit<Colaborador, 'id' | 'created_at'>) => {
    const newColaborador: Colaborador = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    const updated = [...colaboradores, newColaborador];
    saveColaboradores(updated);
    return newColaborador;
  }, [colaboradores, saveColaboradores]);

  // Atualizar colaborador
  const updateColaborador = useCallback((id: string, data: Partial<Colaborador>) => {
    const updated = colaboradores.map(c => 
      c.id === id ? { ...c, ...data } : c
    );
    saveColaboradores(updated);
  }, [colaboradores, saveColaboradores]);

  // Deletar colaborador
  const deleteColaborador = useCallback((id: string) => {
    const updated = colaboradores.filter(c => c.id !== id);
    saveColaboradores(updated);
  }, [colaboradores, saveColaboradores]);

  // Obter colaboradores por cargo
  const getColaboradoresByCargo = useCallback((cargo: Cargo) => {
    return colaboradores.filter(c => c.cargo === cargo && c.ativo);
  }, [colaboradores]);

  // Obter colaborador por ID
  const getColaboradorById = useCallback((id: string) => {
    return colaboradores.find(c => c.id === id);
  }, [colaboradores]);

  // Obter técnicos
  const tecnicos = colaboradores.filter(c => c.cargo === 'tecnico' && c.ativo);
  
  // Obter vendedores
  const vendedores = colaboradores.filter(c => c.cargo === 'vendedor' && c.ativo);
  
  // Obter atendentes
  const atendentes = colaboradores.filter(c => c.cargo === 'atendente' && c.ativo);

  return {
    colaboradores,
    tecnicos,
    vendedores,
    atendentes,
    isLoading,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    getColaboradoresByCargo,
    getColaboradorById,
  };
}

