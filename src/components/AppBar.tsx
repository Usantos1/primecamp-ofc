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

  // Se o sidebar não estiver colapsado e não houver itens, não mostrar
  if (!collapsed && quickNavItems.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      collapsed ? "flex" : "hidden md:flex",
      "items-center gap-2 px-4 py-2 overflow-x-auto"
    )}>
      {quickNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2 whitespace-nowrap",
              isActive && "bg-primary text-primary-foreground"
            )}
            onClick={() => navigate(item.path)}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">
                {item.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

