import { ModernLayout } from "@/components/ModernLayout";
import { UserManagement } from "@/components/UserManagement";

export default function AdminUsers() {
  return (
    <ModernLayout
      title="Gestão de Usuários"
      subtitle="Gerencie usuários, departamentos e permissões do sistema"
    >
      <UserManagement />
    </ModernLayout>
  );
}