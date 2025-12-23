import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedRoute } from './ProtectedRoute';

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
  redirectTo = '/'
}: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const hasAccess = Array.isArray(permission)
    ? (requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission))
    : hasPermission(permission);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}

