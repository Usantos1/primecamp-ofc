import { useState, useEffect, useMemo } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
  category: string;
}

interface UserPermission {
  permission_id: string;
  granted: boolean;
  permission?: Permission;
}

interface RolePermission {
  permission_id: string;
  permission?: Permission;
}

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO DE PERMISSÕES POR FUNÇÃO
// Cada função tem acesso a diferentes áreas do sistema
// ═══════════════════════════════════════════════════════════════
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ADMINISTRADOR - Acesso total (tratado separadamente)
  admin: ['*'],
  
  // GERENTE - Quase tudo, exceto configurações críticas
  gerente: [
    'dashboard.view', 'dashboard.gestao',
    'vendas.view', 'vendas.create', 'vendas.edit', 'vendas.manage',
    'caixa.view', 'caixa.open', 'caixa.close', 'caixa.sangria', 'caixa.suprimento',
    'os.view', 'os.create', 'os.edit',
    'produtos.view', 'produtos.create', 'produtos.edit',
    'clientes.view', 'clientes.create', 'clientes.edit',
    'relatorios.vendas', 'relatorios.financeiro', 'relatorios.geral',
    'rh.view', 'rh.metas', 'rh.ponto',
    'processos.view', 'processos.create', 'processos.edit',
    'tarefas.view', 'tarefas.create', 'tarefas.edit',
    'calendario.view',
    'metricas.view',
    'nps.view',
    'admin.users', // Pode gerenciar usuários da equipe
  ],
  
  // SUPERVISOR - Supervisão de equipe e operações
  supervisor: [
    'dashboard.view', 'dashboard.gestao',
    'vendas.view', 'vendas.create', 'vendas.edit',
    'caixa.view', 'caixa.open', 'caixa.close',
    'os.view', 'os.create', 'os.edit',
    'produtos.view',
    'clientes.view', 'clientes.create', 'clientes.edit',
    'relatorios.vendas',
    'rh.view', 'rh.ponto',
    'processos.view',
    'tarefas.view', 'tarefas.create',
    'calendario.view',
    'metricas.view',
  ],
  
  // VENDEDOR - Vendas e atendimento
  vendedor: [
    'dashboard.view',
    'vendas.view', 'vendas.create',
    'caixa.view',
    'os.view', 'os.create',
    'produtos.view',
    'clientes.view', 'clientes.create',
    'calendario.view',
    'rh.ponto',
    'nps.view',
  ],
  
  // OPERADOR DE CAIXA - Apenas caixa e PDV
  caixa: [
    'dashboard.view',
    'vendas.view', 'vendas.create',
    'caixa.view', 'caixa.open', 'caixa.close',
    'produtos.view',
    'clientes.view',
    'rh.ponto',
  ],
  
  // ESTOQUISTA - Gestão de estoque
  estoquista: [
    'dashboard.view',
    'produtos.view', 'produtos.create', 'produtos.edit',
    'os.view',
    'rh.ponto',
  ],
  
  // FINANCEIRO - Relatórios e contas
  financeiro: [
    'dashboard.view', 'dashboard.gestao',
    'vendas.view',
    'caixa.view',
    'relatorios.vendas', 'relatorios.financeiro', 'relatorios.geral',
    'metricas.view',
    'clientes.view',
    'rh.ponto',
  ],
  
  // ATENDENTE - Atendimento e vendas (sem acesso financeiro)
  atendente: [
    'dashboard.view',
    'vendas.view', 'vendas.create', // PDV e vendas
    'caixa.view', // Ver caixa (mas não gerenciar)
    'clientes.view', 'clientes.create',
    'os.view', 'os.create',
    'produtos.view',
    'calendario.view',
    'rh.ponto',
  ],
  
  // MEMBRO - Acesso mínimo
  member: [
    'dashboard.view',
    'rh.ponto',
    'calendario.view',
  ],
};

export function usePermissions() {
  const { user, profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enquanto auth estiver carregando, manter loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Auth terminou mas não tem usuário - não autenticado
    if (!user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    // Usuário existe mas perfil ainda não carregou - aguardar
    if (!profile) {
      setLoading(true);
      return;
    }

    // Tudo pronto - carregar permissões
    loadPermissions();

    // Ouvir eventos de mudança de permissões
    const handlePermissionsChange = () => {
      loadPermissions();
    };

    window.addEventListener('permissions-changed', handlePermissionsChange);
    
    return () => {
      window.removeEventListener('permissions-changed', handlePermissionsChange);
    };
  }, [user, profile, authLoading]);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      const permSet = new Set<string>();
      const userRole = (profile?.role || 'member').toLowerCase();

      console.log('[usePermissions] Carregando permissões para role:', userRole);

      // Se for admin, não precisa buscar no banco - hasPermission já retorna true para admin
      if (userRole === 'admin' || userRole === 'administrador' || userRole === 'administrator') {
        // Apenas marcar como carregado, hasPermission retorna true para qualquer permissão
        setPermissions(new Set(['*'])); // Marcador de "todas as permissões"
        setLoading(false);
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // CARREGAR PERMISSÕES DA TABELA role_permissions (DO BANCO DE DADOS)
      // ═══════════════════════════════════════════════════════════════
      try {
        // Mapear role do código para role do banco (pode haver diferenças)
        const roleMapping: Record<string, string[]> = {
          'vendedor': ['sales', 'vendedor', 'vendas', 'vendedores'], // sales primeiro pois é o que está no banco
          'sales': ['sales', 'vendedor', 'vendas', 'vendedores'],
          'vendas': ['sales', 'vendas', 'vendedor', 'vendedores'],
        };
        
        const rolesToTry = roleMapping[userRole] || [userRole];
        console.log('[usePermissions] Tentando buscar role com variações:', rolesToTry);
        
        // Buscar o role no banco de dados (tentar variações)
        let roleData = null;
        for (const roleName of rolesToTry) {
          const { data, error } = await from('roles')
            .select('id, name')
            .ilike('name', roleName)
            .maybeSingle();
          
          if (error) {
            console.warn(`[usePermissions] Erro ao buscar role "${roleName}":`, error);
            continue;
          }
          
          if (data) {
            roleData = data;
            console.log(`[usePermissions] ✅ Role encontrado: ${data.name} (ID: ${data.id})`);
            break;
          }
        }

        if (roleData?.id) {
          // Buscar permissões associadas ao role
          const { data: rolePermsData, error: rolePermsError } = await from('role_permissions')
            .select('permission_id')
            .eq('role_id', roleData.id)
            .execute();

          if (rolePermsError) {
            console.warn('[usePermissions] Erro ao buscar role_permissions:', rolePermsError);
          } else if (rolePermsData && rolePermsData.length > 0) {
            console.log(`[usePermissions] Encontradas ${rolePermsData.length} permissões associadas ao role`);
            
            // Buscar detalhes das permissões
            const permissionIds = rolePermsData.map((rp: any) => rp.permission_id);
            const { data: permsData, error: permsError } = await from('permissions')
              .select('resource, action')
              .in('id', permissionIds)
              .execute();

            if (permsError) {
              console.warn('[usePermissions] Erro ao buscar detalhes das permissões:', permsError);
            } else if (permsData) {
              permsData.forEach((perm: any) => {
                const permKey = `${perm.resource}.${perm.action}`;
                permSet.add(permKey);
                console.log(`[usePermissions] ✅ Permissão adicionada: ${permKey}`);
              });
              console.log(`[usePermissions] Total de permissões carregadas do banco: ${permSet.size}`);
            }
          } else {
            console.warn('[usePermissions] Nenhuma permissão encontrada no banco para o role:', roleData.name);
          }
        } else {
          console.warn('[usePermissions] Role não encontrado no banco. Role do profile:', userRole);
        }
      } catch (e) {
        console.warn('Erro ao buscar permissões do role no banco:', e);
      }

      // ═══════════════════════════════════════════════════════════════
      // FALLBACK: Se não encontrou permissões no banco, usar objeto hardcoded
      // ═══════════════════════════════════════════════════════════════
      if (permSet.size === 0) {
        console.warn('[usePermissions] Nenhuma permissão encontrada no banco, usando fallback hardcoded');
        const rolePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['member'] || [];
        rolePermissions.forEach(p => permSet.add(p));
        console.log(`[usePermissions] Permissões do fallback (${rolePermissions.length}):`, rolePermissions);
      }

      // Buscar permissões customizadas do usuário (override)
      try {
        const { data: userPerms, error: userPermsError } = await from('user_permissions')
          .select('permission_id, granted')
          .eq('user_id', user?.id)
          .execute();

        if (userPermsError) {
          console.warn('Erro ao buscar user_permissions:', userPermsError);
        } else if (userPerms && userPerms.length > 0) {
          // Buscar detalhes das permissões
          const permissionIds = userPerms.map((up: any) => up.permission_id);
          const { data: permsData, error: permsError } = await from('permissions')
            .select('resource, action')
            .in('id', permissionIds)
            .execute();

          if (permsError) {
            console.warn('Erro ao buscar detalhes das permissões do usuário:', permsError);
          } else if (permsData) {
            // Criar mapa de permission_id para permissão
            const permMap = new Map(permsData.map((p: any) => [p.id, p]));
            
            userPerms.forEach((up: any) => {
              const perm = permMap.get(up.permission_id);
              if (perm) {
                const permKey = `${perm.resource}.${perm.action}`;
                if (up.granted === false) {
                  // Remover permissão negada
                  permSet.delete(permKey);
                } else if (up.granted === true) {
                  // Adicionar permissão concedida
                  permSet.add(permKey);
                }
              }
            });
          }
        }
      } catch (e) {
        // Tabela user_permissions pode não existir
        console.warn('Erro ao buscar permissões customizadas do usuário:', e);
      }

      console.log(`[usePermissions] ✅ Permissões finais carregadas (${permSet.size}):`, Array.from(permSet));
      setPermissions(permSet);
    } catch (error) {
      console.error('[usePermissions] ❌ Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é admin (aceita variações)
  const isAdminRole = useMemo(() => {
    if (!profile?.role) return false;
    const role = profile.role.toLowerCase();
    return role === 'admin' || role === 'administrador' || role === 'administrator';
  }, [profile?.role]);

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!user || !profile) return false;
      if (isAdminRole) return true;
      return permissions.has(permission);
    };
  }, [permissions, user, profile, isAdminRole]);

  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!user || !profile) return false;
      if (isAdminRole) return true;
      return permissionList.some(perm => permissions.has(perm));
    };
  }, [permissions, user, profile, isAdminRole]);

  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!user || !profile) return false;
      if (isAdminRole) return true;
      return permissionList.every(perm => permissions.has(perm));
    };
  }, [permissions, user, profile, isAdminRole]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: Array.from(permissions),
    loading,
    isAdmin: isAdminRole,
    refresh: loadPermissions,
  };
}

