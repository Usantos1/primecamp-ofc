import { ModernLayout } from "@/components/ModernLayout";
import { AdminGoalsManager } from "@/components/AdminGoalsManager";

export default function AdminGoals() {
  return (
    <ModernLayout
      title="Gestão de Metas"
      subtitle="Monitore e gerencie metas de todos os usuários"
    >
      <AdminGoalsManager />
    </ModernLayout>
  );
}