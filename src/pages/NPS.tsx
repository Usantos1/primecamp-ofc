import { ModernLayout } from '@/components/ModernLayout';
import { NPSManager } from '@/components/NPSManager';
import { PersonalNPSReport } from '@/components/PersonalNPSReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function NPS() {
  const { isAdmin } = useAuth();
  
  return (
    <ModernLayout
      title="Sistema NPS"
      subtitle="Pesquisas de satisfação e feedback interno"
    >
      <Tabs defaultValue="surveys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="surveys">Responder Pesquisas</TabsTrigger>
          <TabsTrigger value="personal">Meu NPS</TabsTrigger>
          {isAdmin && <TabsTrigger value="management">Gerenciar NPS</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="surveys" className="mt-6">
          <NPSManager />
        </TabsContent>
        
        <TabsContent value="personal" className="mt-6">
          <PersonalNPSReport />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="management" className="mt-6">
            <NPSManager />
          </TabsContent>
        )}
      </Tabs>
    </ModernLayout>
  );
}