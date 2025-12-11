import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, Users, Package, Wrench, DollarSign, 
  Home, FileText, Calendar, CheckSquare, Target, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface QuickNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

// Configuração de navegação rápida por rota
const QUICK_NAV_CONFIG: Record<string, QuickNavItem[]> = {
  '/pdv': [
    { label: 'PDV', icon: ShoppingCart, path: '/pdv' },
    { label: 'Clientes', icon: Users, path: '/pdv/clientes' },
    { label: 'Produtos', icon: Package, path: '/pdv/produtos' },
    { label: 'Ordem de Serviço', icon: Wrench, path: '/pdv/os' },
  ],
  '/pdv/os': [
    { label: 'PDV', icon: ShoppingCart, path: '/pdv' },
    { label: 'Clientes', icon: Users, path: '/pdv/clientes' },
    { label: 'Produtos', icon: Package, path: '/pdv/produtos' },
    { label: 'Ordem de Serviço', icon: Wrench, path: '/pdv/os' },
  ],
  '/pdv/clientes': [
    { label: 'PDV', icon: ShoppingCart, path: '/pdv' },
    { label: 'Clientes', icon: Users, path: '/pdv/clientes' },
    { label: 'Produtos', icon: Package, path: '/pdv/produtos' },
    { label: 'Ordem de Serviço', icon: Wrench, path: '/pdv/os' },
  ],
  '/pdv/produtos': [
    { label: 'PDV', icon: ShoppingCart, path: '/pdv' },
    { label: 'Clientes', icon: Users, path: '/pdv/clientes' },
    { label: 'Produtos', icon: Package, path: '/pdv/produtos' },
    { label: 'Ordem de Serviço', icon: Wrench, path: '/pdv/os' },
  ],
  '/admin/financeiro': [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Financeiro', icon: DollarSign, path: '/admin/financeiro' },
    { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
  ],
  '/': [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Tarefas', icon: CheckSquare, path: '/tarefas' },
    { label: 'Processos', icon: FileText, path: '/processos' },
    { label: 'Calendário', icon: Calendar, path: '/calendario' },
    { label: 'Metas', icon: Target, path: '/metas' },
  ],
  '/tarefas': [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Tarefas', icon: CheckSquare, path: '/tarefas' },
    { label: 'Processos', icon: FileText, path: '/processos' },
    { label: 'Calendário', icon: Calendar, path: '/calendario' },
  ],
  '/processos': [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Tarefas', icon: CheckSquare, path: '/tarefas' },
    { label: 'Processos', icon: FileText, path: '/processos' },
    { label: 'Calendário', icon: Calendar, path: '/calendario' },
  ],
};

export function AppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  // Determinar qual configuração usar baseado na rota atual
  const getQuickNavItems = (): QuickNavItem[] => {
    const path = location.pathname;
    
    // Verificar rotas exatas primeiro
    if (QUICK_NAV_CONFIG[path]) {
      return QUICK_NAV_CONFIG[path];
    }
    
    // Verificar rotas que começam com o path
    for (const [route, items] of Object.entries(QUICK_NAV_CONFIG)) {
      if (path.startsWith(route)) {
        return items;
      }
    }
    
    // Retornar configuração padrão
    return QUICK_NAV_CONFIG['/'] || [];
  };

  const quickNavItems = getQuickNavItems();
  const currentPath = location.pathname;

  // Se não houver itens, não mostrar
  if (quickNavItems.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "flex items-center justify-center gap-1 px-4 py-1.5 overflow-x-auto"
    )}>
      {quickNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path + '/'));
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-2.5 gap-1.5 whitespace-nowrap text-xs",
              isActive 
                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            onClick={() => navigate(item.path)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-0.5 px-1 py-0.5 text-[10px] rounded-full bg-sidebar-primary-foreground/20">
                {item.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
