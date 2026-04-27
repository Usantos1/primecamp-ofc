import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Home,
  TrendingUp,
  FileText,
  Target,
  DollarSign,
  ArrowLeftRight,
} from 'lucide-react';

const menuItems = [
  { path: '/financeiro', label: 'Dashboard', icon: Home },
  { path: '/financeiro/dre', label: 'DRE', icon: FileText },
  { path: '/financeiro/planejamento-anual', label: 'Planejamento', icon: Target },
  { path: '/financeiro/fluxo-de-caixa', label: 'Fluxo de Caixa', icon: ArrowLeftRight },
  { path: '/financeiro/caixa', label: 'Caixa', icon: DollarSign },
  { path: '/financeiro/contas', label: 'Contas', icon: FileText },
  { path: '/financeiro/transacoes', label: 'Transações', icon: TrendingUp },
];

type FinanceiroNavMenuProps = {
  /** `embedded` = faixa sob o header MIUI (sem card pesado). */
  variant?: 'card' | 'embedded';
};

export function FinanceiroNavMenu({ variant = 'card' }: FinanceiroNavMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const embedded = variant === 'embedded';

  const inner = (
    <div
      className={
        embedded
          ? 'flex flex-wrap gap-1.5 justify-start sm:justify-center'
          : 'flex flex-wrap gap-2 justify-center'
      }
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.path === '/financeiro'
            ? location.pathname === '/financeiro' || location.pathname === '/financeiro/dashboard'
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return (
          <Button
            key={item.path}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-9 px-3 text-xs font-semibold border-[2px] rounded-full',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-gray-400 hover:border-gray-600',
              embedded && 'rounded-full border-emerald-200/80 shadow-sm dark:border-emerald-900/40'
            )}
            onClick={() => navigate(item.path)}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <div className="shrink-0 border-b border-emerald-100/70 bg-background/95 px-2 py-2 md:px-4 dark:border-emerald-950/30">
        {inner}
      </div>
    );
  }

  return (
    <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-3">
      {inner}
    </Card>
  );
}
