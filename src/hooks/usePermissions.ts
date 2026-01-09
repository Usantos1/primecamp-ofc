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
      const userRole = profile?.role || 'member';

      // Se for admin, não precisa buscar no banco - hasPermission já retorna true para admin
      if (userRole === 'admin') {
        // Apenas marcar como carregado, hasPermission retorna true para qualquer permissão
        setPermissions(new Set(['*'])); // Marcador de "todas as permissões"
        setLoading(false);
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // CARREGAR PERMISSÕES BASEADO NA FUNÇÃO (ROLE)
      // ═══════════════════════════════════════════════════════════════
      const rolePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['member'] || [];
      rolePermissions.forEach(p => permSet.add(p));

      // Buscar permissões customizadas do usuário (override)
      try {
        const { data: userPerms } = await from('user_permissions')
          .select('permission_id, granted')
          .eq('user_id', user?.id)
          .execute();

        if (userPerms && userPerms.length > 0) {
          userPerms.forEach((up: any) => {
            if (up.granted === false && up.permission) {
              // Remover permissão negada
              permSet.delete(`${up.permission.resource}.${up.permission.action}`);
            } else if (up.granted === true && up.permission) {
              // Adicionar permissão concedida
              permSet.add(`${up.permission.resource}.${up.permission.action}`);
            }
          });
        }
      } catch (e) {
        // Tabela user_permissions pode não existir
      }

      setPermissions(permSet);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!user || !profile) return false;
      if (profile.role === 'admin') return true;
      return permissions.has(permission);
    };
  }, [permissions, user, profile]);

  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!user || !profile) return false;
      if (profile.role === 'admin') return true;
      return permissionList.some(perm => permissions.has(perm));
    };
  }, [permissions, user, profile]);

  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!user || !profile) return false;
      if (profile.role === 'admin') return true;
      return permissionList.every(perm => permissions.has(perm));
    };
  }, [permissions, user, profile]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: Array.from(permissions),
    loading,
    refresh: loadPermissions,
  };
}

