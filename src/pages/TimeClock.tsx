import { ModernLayout } from '@/components/ModernLayout';
import { TimeClockWidget } from '@/components/TimeClockWidget';
import { TimeSheetManager } from '@/components/TimeSheetManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function TimeClock() {
  const isMobile = useIsMobile();
  const { isAdmin } = useAuth();

  return (
    <ModernLayout
      title="Ponto Eletrônico"
      subtitle="Controle de jornada de trabalho e presença"
    >
      <div className={`${isMobile ? 'p-2' : 'p-4'} min-h-screen`}>
        {isAdmin ? (
          <Tabs defaultValue="widget" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="widget">Registrar Ponto</TabsTrigger>
              <TabsTrigger value="timesheet">Espelho de Ponto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="widget" className="mt-6">
              <div className="flex justify-center w-full">
                <div className={`${isMobile ? 'w-full' : 'w-full max-w-md'}`}>
                  <TimeClockWidget />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timesheet" className="mt-6">
              <TimeSheetManager />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex justify-center w-full">
            <div className={`${isMobile ? 'w-full' : 'w-full max-w-md'}`}>
              <TimeClockWidget />
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}