import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission: string | string[];
  requireAll?: boolean;
  redirectTo?: string;
}

export function PermissionRoute({ 
  children, 
  permission,
  requireAll = false,
  redirectTo
}: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading, isAdmin } = usePermissions();
  const { profile, isAdmin: isAdminAuth, loading: authLoading } = useAuth();

  // Verificar admin DIRETAMENTE do profile (mais confiável durante loading)
  const isAdminDirect = profile?.role?.toLowerCase() === 'admin' || 
                        profile?.role?.toLowerCase() === 'administrador' ||
                        profile?.role?.toLowerCase() === 'administrator';

  // Se QUALQUER indicador diz que é admin, tem acesso total
  const userIsAdmin = isAdmin || isAdminAuth || isAdminDirect;

  // Mostrar loading enquanto auth ou permissões estão carregando
  // MAS se já sabemos que é admin, liberar imediatamente
  if ((loading || authLoading) && !userIsAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Admin tem acesso a tudo
  if (userIsAdmin) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  const hasAccess = Array.isArray(permission)
    ? (requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission))
    : hasPermission(permission);

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <CardTitle>Acesso negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você não tem permissão para acessar esta página. Se acredita que isso é um erro,
              peça ao administrador para ajustar suas permissões.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}

