import { ModernLayout } from "@/components/ModernLayout";
import { CategoryManager } from "@/components/CategoryManager";

export default function AdminCategories() {
  return (
    <ModernLayout
      title="Gestão de Categorias"
      subtitle="Gerencie categorias para organização de tarefas e processos"
    >
      <CategoryManager />
    </ModernLayout>
  );
}