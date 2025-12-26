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

export function usePermissions() {
  const { user, profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enquanto auth estiver carregando ou perfil não chegou, manter loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    if (!profile) {
      // Usuário autenticado mas perfil ainda não carregado
      setLoading(true);
      return;
    }

    loadPermissions();

    // Ouvir eventos de mudança de permissões
    const handlePermissionsChange = () => {
      loadPermissions();
    };

    window.addEventListener('permissions-changed', handlePermissionsChange);
    
    return () => {
      window.removeEventListener('permissions-changed', handlePermissionsChange);
    };
  }, [user, profile]);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      // Se for admin, tem todas as permissões
      if (profile?.role === 'admin') {
        const { data: allPermissions } = await from('permissions')
          .select('resource, action')
          .execute();

        if (allPermissions) {
          const permSet = new Set(
            allPermissions.map((p: any) => `${p.resource}.${p.action}`)
          );
          setPermissions(permSet);
          setLoading(false);
          return;
        }
      }

      // Buscar permissões customizadas do usuário
      const { data: userPerms, error: userPermsError } = await from('user_permissions')
        .select('permission_id, granted')
        .eq('user_id', user?.id)
        .execute();

      if (userPermsError) {
        console.error('Erro ao buscar permissões customizadas:', userPermsError);
      }

      // Buscar permissões via role
      const { data: rolePerms, error: rolePermsError } = await from('user_position_departments')
        .select('role_id')
        .eq('user_id', user?.id)
        .execute();

      if (rolePermsError) {
        console.error('Erro ao buscar permissões via role:', rolePermsError);
      }

      const permSet = new Set<string>();

      // Adicionar permissões negadas (override)
      if (userPerms) {
        userPerms.forEach((up: any) => {
          if (up.granted === false && up.permission) {
            // Não adicionar (está negada)
          } else if (up.granted === true && up.permission) {
            permSet.add(`${up.permission.resource}.${up.permission.action}`);
          }
        });
      }

      // Adicionar permissões via role (se não foram negadas)
      if (rolePerms && rolePerms.length > 0) {
        rolePerms.forEach((rp: any) => {
          if (rp.role && rp.role.role_permissions) {
            rp.role.role_permissions.forEach((rperm: any) => {
              if (rperm.permission) {
                const permKey = `${rperm.permission.resource}.${rperm.permission.action}`;
                // Só adicionar se não foi negada explicitamente
                const wasDenied = userPerms?.some(
                  (up: any) => 
                    up.permission?.resource === rperm.permission.resource &&
                    up.permission?.action === rperm.permission.action &&
                    up.granted === false
                );
                if (!wasDenied) {
                  permSet.add(permKey);
                }
              }
            });
          }
        });
      }

      // Debug: log das permissões carregadas
      console.log('Permissões carregadas:', {
        userPerms: userPerms?.length || 0,
        rolePerms: rolePerms?.length || 0,
        totalPerms: permSet.size,
        perms: Array.from(permSet)
      });

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

