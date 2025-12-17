import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Vamos exibir somente usuários reais. Nenhum fallback fictício.
const COLABORADORES_PADRAO: Colaborador[] = [];

export function useCargos() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar colaboradores
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      console.log('[useCargos] 🔄 Iniciando carregamento de colaboradores...');
      
      try {
        // 1) Buscar perfis (nome/email)
        // Usar query igual ao UserManagement que funciona
        console.log('[useCargos] 📡 Buscando profiles do Supabase...');
        console.log('[useCargos] Usuário autenticado:', await supabase.auth.getUser().then(r => r.data.user?.id));
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('display_name', { ascending: true });
        
        // Se der erro de RLS, tentar sem order
        if (profilesError && profilesError.code === '42501') {
          console.warn('[useCargos] ⚠️ Erro de permissão, tentando sem order...');
          const { data: profilesData2, error: profilesError2 } = await supabase
            .from('profiles')
            .select('*');
          
          if (!profilesError2 && profilesData2) {
            console.log('[useCargos] ✅ Profiles carregados sem order:', profilesData2.length);
            // Continuar com profilesData2
            const todosColaboradores = profilesData2.map((profile: any) => ({
              id: profile.user_id || profile.id || profile.email || '',
              nome: profile.display_name || profile.email || 'Usuário',
              cargo: 'tecnico' as Cargo,
              ativo: true,
              email: profile.email || undefined,
              created_at: profile.created_at || new Date().toISOString(),
            })) as Colaborador[];
            
            console.log('[useCargos] ✅ Colaboradores criados:', todosColaboradores.length);
            setColaboradores(todosColaboradores);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todosColaboradores));
            setIsLoading(false);
            return;
          }
        }

        if (profilesError) {
          console.error('[useCargos] ❌ ERRO ao carregar profiles:', profilesError);
          console.error('[useCargos] Detalhes do erro:', {
            message: profilesError.message,
            code: profilesError.code,
            details: profilesError.details,
            hint: profilesError.hint
          });
          
          // Se for erro de RLS (42501), tentar sem order
          if (profilesError.code === '42501' || profilesError.message?.includes('permission') || profilesError.message?.includes('policy')) {
            console.warn('[useCargos] ⚠️ Erro de permissão RLS detectado, tentando query simplificada...');
            const { data: profilesData2, error: profilesError2 } = await supabase
              .from('profiles')
              .select('*')
              .limit(100);
            
            if (!profilesError2 && profilesData2 && profilesData2.length > 0) {
              console.log('[useCargos] ✅ Profiles carregados com query simplificada:', profilesData2.length);
              const todosColaboradores = profilesData2.map((profile: any) => ({
                id: profile.user_id || profile.id || profile.email || '',
                nome: profile.display_name || profile.email || 'Usuário',
                cargo: 'tecnico' as Cargo,
                ativo: true,
                email: profile.email || undefined,
                created_at: profile.created_at || new Date().toISOString(),
              })) as Colaborador[];
              
              console.log('[useCargos] ✅ Colaboradores criados:', todosColaboradores.length);
              setColaboradores(todosColaboradores);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(todosColaboradores));
              setIsLoading(false);
              return;
            }
          }
          
          // Tentar usar localStorage como fallback
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const storedData = JSON.parse(stored);
              if (Array.isArray(storedData) && storedData.length > 0) {
                console.log('[useCargos] ⚠️ Usando dados do localStorage devido a erro:', storedData.length);
                setColaboradores(storedData);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.warn('[useCargos] Erro ao ler localStorage:', e);
            }
          }
          setColaboradores([]);
          setIsLoading(false);
          return;
        }

        console.log('[useCargos] ✅ Profiles carregados:', profilesData?.length || 0);
        console.log('[useCargos] Profiles:', profilesData);

        if (!profilesData || profilesData.length === 0) {
          console.warn('[useCargos] ⚠️ Nenhum perfil encontrado no Supabase');
          setColaboradores([]);
          setIsLoading(false);
          return;
        }

        // 2) Buscar posições dos usuários (como no UserManagement)
        let positionsData: any[] = [];
        try {
          const { data: posData, error: positionsError } = await supabase
            .from('user_position_departments')
            .select(`
              *,
              position:positions(*)
            `);

          if (positionsError) {
            console.warn('[useCargos] Erro ao carregar posições:', positionsError);
          } else {
            positionsData = posData || [];
          }
        } catch (e) {
          console.warn('[useCargos] Tabela user_position_departments pode não existir:', e);
        }

        // 3) Montar lista de colaboradores
        // SIMPLIFICADO: Criar lista com TODOS os usuários como colaboradores
        // Todos aparecem como 'tecnico' para que possam ser selecionados em ambos os campos
        const todosColaboradores: Colaborador[] = profilesData.map((profile: any) => {
          const userPositions = positionsData.filter(
            (up: any) => up.user_id === profile.user_id
          );

          // Verificar se é técnico (por posição, departamento ou role)
          const hasTecnicoPosition = userPositions.some(
            (up: any) =>
              up.position &&
              typeof up.position.name === 'string' &&
              up.position.name.toLowerCase().includes('técni')
          );

          const hasTecnicoDepartment = userPositions.some(
            (up: any) =>
              up.department_name &&
              typeof up.department_name === 'string' &&
              up.department_name.toLowerCase().includes('técni')
          );

          const isTecnicoByProfile = profile.department && 
            typeof profile.department === 'string' &&
            profile.department.toLowerCase().includes('técni');

          // Determinar cargo
          // SIMPLIFICADO: Todos começam como 'tecnico' para aparecer na lista de técnicos
          // O cargo pode ser ajustado, mas todos ainda aparecem como técnicos
          let cargo: Cargo = 'tecnico'; // Padrão: todos como técnico
          
          // Ajustar cargo apenas para exibição, mas não afeta a lista de técnicos
          if (profile.role === 'admin') {
            cargo = 'vendedor';
          } else if (profile.department && profile.department.toLowerCase().includes('venda')) {
            cargo = 'vendedor';
          }

          // Usar user_id como ID principal
          const colaboradorId = profile.user_id || profile.id || profile.email || '';
          
          return {
            id: colaboradorId,
            nome: profile.display_name || profile.email || 'Usuário',
            cargo: cargo,
            ativo: true,
            email: profile.email || undefined,
            created_at: profile.created_at || new Date().toISOString(),
          } as Colaborador;
        });

        console.log(`[useCargos] ✅ Total de profiles: ${profilesData.length}`);
        console.log(`[useCargos] ✅ Total de posições: ${positionsData.length}`);
        console.log(`[useCargos] ✅ Total de colaboradores criados: ${todosColaboradores.length}`);
        console.log(`[useCargos] ✅ Colaboradores:`, todosColaboradores.map(t => `${t.nome} (${t.cargo})`));
        console.log(`[useCargos] ✅ Colaboradores completos:`, todosColaboradores);

        setColaboradores(todosColaboradores);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todosColaboradores));
        
        console.log('[useCargos] ✅ Estado atualizado e salvo no localStorage');
      } catch (supabaseError) {
        console.error('[useCargos] Erro ao carregar colaboradores:', supabaseError);
        // Tentar usar localStorage como fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const storedData = JSON.parse(stored);
            if (Array.isArray(storedData) && storedData.length > 0) {
              console.log('[useCargos] ⚠️ Usando dados do localStorage devido a erro:', storedData.length);
              setColaboradores(storedData);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('[useCargos] Erro ao ler localStorage:', e);
          }
        }
        setColaboradores([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
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
  // Retornar TODOS os colaboradores ativos como técnicos (para que todos possam ser selecionados)
  const tecnicos = colaboradores.filter(c => c.ativo);
  
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
