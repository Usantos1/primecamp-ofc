import { ModernLayout } from "@/components/ModernLayout";
import { TagManager } from "@/components/TagManager";

export default function AdminTags() {
  return (
    <ModernLayout
      title="Gestão de Tags"
      subtitle="Gerencie tags para classificação e organização"
    >
      <TagManager />
    </ModernLayout>
  );
}