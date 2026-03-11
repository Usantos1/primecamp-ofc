/**
 * Navegação entre as rotas do Painel de Alertas (abas no topo da página).
 */
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Settings, Activity, DollarSign, TrendingUp, Target, History } from 'lucide-react';

const LINKS = [
  { to: '/painel-alertas/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/painel-alertas/alertas/operacional', label: 'Operacional', icon: Activity },
  { to: '/painel-alertas/alertas/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/painel-alertas/alertas/comercial', label: 'Comercial', icon: TrendingUp },
  { to: '/painel-alertas/alertas/gestao', label: 'Gestão', icon: Target },
  { to: '/painel-alertas/historico', label: 'Histórico', icon: History },
];

export function PainelAlertasNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="flex flex-wrap gap-1 p-2 rounded-lg bg-muted/50 border mb-4">
      {LINKS.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to;
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
