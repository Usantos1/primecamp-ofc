import { ModernLayout } from "@/components/ModernLayout";
import { AdminLogsManager } from "@/components/AdminLogsManager";

export default function AdminLogs() {
  return (
    <ModernLayout
      title="Logs do Sistema"
      subtitle="Visualize e monitore atividades do sistema"
    >
      <AdminLogsManager />
    </ModernLayout>
  );
}