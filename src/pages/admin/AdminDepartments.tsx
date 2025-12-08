import { ModernLayout } from "@/components/ModernLayout";
import { DepartmentManager } from "@/components/DepartmentManager";

export default function AdminDepartments() {
  return (
    <ModernLayout
      title="Gestão de Departamentos"
      subtitle="Gerencie departamentos e estrutura organizacional"
    >
      <DepartmentManager />
    </ModernLayout>
  );
}