import { ModernLayout } from '@/components/ModernLayout';
import { NPSManager } from '@/components/NPSManager';
import { PersonalNPSReport } from '@/components/PersonalNPSReport';
import { useAuth } from '@/contexts/AuthContext';
import { useNPS } from '@/hooks/useNPS';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export default function NPS() {
  const { isAdmin } = useAuth();
  const { surveys, responses, loading: npsLoading } = useNPS();
  const [activeTab, setActiveTab] = useState<'surveys' | 'personal' | 'management'>('surveys');
  
  const activeSurveys = surveys.filter(s => s.is_active);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayResponses = responses.filter(r => (r.date || '').toString().split('T')[0] === todayStr);
  const showCount = (n: number) => npsLoading ? '...' : n;
  
  return (
    <ModernLayout
      title="Sistema NPS"
      subtitle="Pesquisas de satisfação e feedback interno"
    >
      <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col gap-2">
        {/* Mobile: Header ultra compacto */}
        <div className="md:hidden flex-shrink-0 flex items-center gap-2 p-2 bg-white/80 dark:bg-slate-900/50 border border-gray-200 rounded-lg">
          <div className="inline-flex h-8 items-center justify-center rounded-md bg-muted p-0.5">
            <button onClick={() => setActiveTab('surveys')} className={`px-2 py-1 text-[10px] font-medium rounded ${activeTab === 'surveys' ? 'bg-green-500 text-white' : 'text-muted-foreground'}`}>Responder</button>
            <button onClick={() => setActiveTab('personal')} className={`px-2 py-1 text-[10px] font-medium rounded ${activeTab === 'personal' ? 'bg-green-500 text-white' : 'text-muted-foreground'}`}>Meu NPS</button>
            {isAdmin && <button onClick={() => setActiveTab('management')} className={`px-2 py-1 text-[10px] font-medium rounded ${activeTab === 'management' ? 'bg-green-500 text-white' : 'text-muted-foreground'}`}>Gerenciar</button>}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">{activeSurveys.length} ativas</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">{showCount(responses.length)} resp.</span>
          </div>
        </div>

        {/* Desktop: Header completo */}
        <Card className="hidden md:block flex-shrink-0 border border-gray-200 shadow-sm">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1">
                <button onClick={() => setActiveTab('surveys')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === 'surveys' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Responder</button>
                <button onClick={() => setActiveTab('personal')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === 'personal' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Meu NPS</button>
                {isAdmin && (<button onClick={() => setActiveTab('management')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === 'management' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Gerenciar</button>)}
              </div>
              <div className="h-9 flex flex-col items-center justify-center px-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 min-w-[90px]">
                <span className="text-[9px] text-green-600 dark:text-green-400 font-medium leading-none">Pesquisas Ativas</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-300 leading-none">{activeSurveys.length}</span>
              </div>
              <div className="h-9 flex flex-col items-center justify-center px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 min-w-[90px]">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium leading-none">Respostas Hoje</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-none">{showCount(todayResponses.length)}</span>
              </div>
              <div className="h-9 flex flex-col items-center justify-center px-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 min-w-[100px]">
                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-medium leading-none">Total Respostas</span>
                <span className="text-sm font-bold text-purple-700 dark:text-purple-300 leading-none">{showCount(responses.length)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {activeTab === 'surveys' && (
            <NPSManager mode="surveys" hideTabs={true} hideStats={true} />
          )}
          
          {activeTab === 'personal' && (
            <PersonalNPSReport />
          )}
          
          {activeTab === 'management' && isAdmin && (
            <NPSManager mode="manage" hideTabs={true} hideStats={true} />
          )}
        </div>
      </div>
    </ModernLayout>
  );
}