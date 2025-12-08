import { ModernLayout } from "@/components/ModernLayout";
import { AdminDiscManager } from "@/components/AdminDiscManager";

export default function AdminDisc() {
  return (
    <ModernLayout
      title="Gestão de Testes DISC"
      subtitle="Monitore e gerencie testes DISC dos usuários"
    >
      <AdminDiscManager />
    </ModernLayout>
  );
}