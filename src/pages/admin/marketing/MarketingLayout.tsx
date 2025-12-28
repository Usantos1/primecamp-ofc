import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  BarChart3, 
  Target,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/marketing' },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone, path: '/admin/marketing/campanhas' },
  { id: 'leads', label: 'Leads', icon: Users, path: '/admin/marketing/leads' },
  { id: 'metricas', label: 'Métricas', icon: BarChart3, path: '/admin/marketing/metricas' },
  { id: 'metas', label: 'Metas', icon: Target, path: '/admin/marketing/metas' },
];

export function MarketingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mês selecionado (padrão: mês atual)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // Gerar lista de meses (últimos 12 meses)
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().slice(0, 7);
  });

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0];

  return (
    <ModernLayout title="Marketing & Ads" subtitle="Gestão de campanhas, leads e métricas de marketing">
      <div className="flex flex-col h-full overflow-hidden gap-3">
        {/* Header compacto */}
        <Card className="flex-shrink-0">
          <CardContent className="p-2 md:p-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1 md:flex-none">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location.pathname === tab.path || 
                    (tab.id === 'dashboard' && location.pathname === '/admin/marketing');
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap',
                        isActive && 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      )}
                      onClick={() => navigate(tab.path)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1 md:mr-1.5" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </Button>
                  );
                })}
              </div>
              
              {/* Seletor de Período */}
              <div className="flex items-center gap-2 ml-auto">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet context={{ month: selectedMonth, setMonth: setSelectedMonth }} />
        </div>
      </div>
    </ModernLayout>
  );
}

