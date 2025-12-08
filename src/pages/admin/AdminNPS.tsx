import { ModernLayout } from "@/components/ModernLayout";
import { AdminNPSManager } from "@/components/AdminNPSManager";

export default function AdminNPS() {
  return (
    <ModernLayout
      title="Gestão de NPS"
      subtitle="Gerencie pesquisas NPS e visualize resultados"
    >
      <AdminNPSManager />
    </ModernLayout>
  );
}