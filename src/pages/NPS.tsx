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
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <Tabs defaultValue="surveys" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} border-2 border-gray-300 bg-gray-50`}>
            <TabsTrigger 
              value="surveys"
              className="text-xs md:text-sm border-r-2 border-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              Responder Pesquisas
            </TabsTrigger>
            <TabsTrigger 
              value="personal"
              className={`text-xs md:text-sm ${isAdmin ? 'border-r-2 border-gray-300' : ''} data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white`}
            >
              Meu NPS
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="management"
                className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
              >
                Gerenciar NPS
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="surveys" className="mt-4 md:mt-6">
            <NPSManager />
          </TabsContent>
          
          <TabsContent value="personal" className="mt-4 md:mt-6">
            <PersonalNPSReport />
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="management" className="mt-4 md:mt-6">
              <NPSManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ModernLayout>
  );
}