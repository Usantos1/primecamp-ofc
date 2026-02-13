import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, Users, Package, Wrench, DollarSign, 
  Home, FileText, Calendar, CheckSquare, Target, BarChart3, Plus, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface QuickNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

// Navegação rápida do PDV (atalhos globais)
const PDV_NAV_ITEMS: QuickNavItem[] = [
  { label: 'PDV', icon: ShoppingCart, path: '/pdv' },
  { label: 'Vendas', icon: Receipt, path: '/pdv/vendas' },
  { label: 'Caixa', icon: DollarSign, path: '/pdv/caixa' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Produtos', icon: Package, path: '/produtos' },
  { label: 'Ordem de Serviço', icon: Wrench, path: '/os' },
];

// Configuração de navegação rápida por rota
const QUICK_NAV_CONFIG: Record<string, QuickNavItem[]> = {
  '/pdv': PDV_NAV_ITEMS,
  '/pdv/vendas': PDV_NAV_ITEMS,
  '/pdv/venda': PDV_NAV_ITEMS,
  '/os': PDV_NAV_ITEMS,
  '/clientes': PDV_NAV_ITEMS,
  '/produtos': PDV_NAV_ITEMS,
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
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "flex items-center justify-center gap-0 px-2 py-1.5 overflow-x-auto max-w-full",
      "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
    )}>
      {quickNavItems.map((item, index) => {
        const Icon = item.icon;
        // Corrigir lógica: só marcar como ativo se for exatamente o path ou começar com o path + '/'
        // Mas não marcar se outro path mais específico também começar com o mesmo prefixo
        let isActive = false;
        if (item.path === '/') {
          isActive = currentPath === '/';
        } else {
          isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          // Se outro item mais específico também corresponde, não marcar este
          const moreSpecificMatch = quickNavItems.find(other => 
            other.path !== item.path && 
            other.path.startsWith(item.path) && 
            (currentPath === other.path || currentPath.startsWith(other.path + '/'))
          );
          if (moreSpecificMatch) {
            isActive = false;
          }
        }
        
        return (
          <div key={item.path} className="flex items-center">
            {index > 0 && (
              <div className="h-4 w-px bg-border mx-0.5" />
            )}
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 gap-1.5 whitespace-nowrap text-xs shrink-0",
                isActive 
                  ? "bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white hover:opacity-90 shadow-sm" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium truncate max-w-[100px]">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-0.5 px-1 py-0.5 text-[10px] rounded-full bg-sidebar-primary-foreground/20 shrink-0">
                  {item.badge}
                </span>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
