import { ModernLayout } from "@/components/ModernLayout";
import { PositionManager } from "@/components/PositionManager";

export default function AdminPositions() {
  return (
    <ModernLayout
      title="Gestão de Cargos"
      subtitle="Gerencie cargos e hierarquias organizacionais"
    >
      <PositionManager />
    </ModernLayout>
  );
}