import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigationItems } from '@/hooks/useNavigationItems';

/** Prefixos onde a barra contextual deve aparecer (paridade com AppBar antigo). */
const MODULE_TOOLBAR_PREFIXES = [
  '/financeiro',
  '/pos-venda',
  '/pdv',
  '/os',
  '/clientes',
  '/produtos',
] as const;

function pathMatchesModuleToolbar(pathname: string): boolean {
  return MODULE_TOOLBAR_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Barra secundária MIUI com atalhos contextuais (ex.: dentro de /financeiro
 * mostra DRE, Planejamento, Fluxo de Caixa, Contas, Transações etc.).
 * Usa os mesmos `quickNavItems` do AppBar clássico para manter paridade.
 */
export function AppBarMiuiContext() {
  const location = useLocation();
  const navigate = useNavigate();
  const { quickNavItems } = useNavigationItems();

  if (!quickNavItems || quickNavItems.length <= 1) return null;

  if (!pathMatchesModuleToolbar(location.pathname)) return null;

  const currentPath = location.pathname;

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1.5 overflow-x-auto overflow-y-hidden',
        'scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent dark:scrollbar-thumb-emerald-900',
        'touch-pan-x overscroll-x-contain'
      )}
    >
      {quickNavItems.map((item) => {
        const Icon = item.icon;
        let isActive = false;
        if (item.path === '/') {
          isActive = currentPath === '/';
        } else {
          isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          const moreSpecificMatch = quickNavItems.find(
            (other) =>
              other.path !== item.path &&
              other.path.startsWith(item.path) &&
              (currentPath === other.path || currentPath.startsWith(other.path + '/'))
          );
          if (moreSpecificMatch) isActive = false;
        }

        return (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3 text-xs font-medium shadow-sm',
              isActive
                ? 'border-[hsl(var(--sidebar-primary,var(--primary)))] bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white hover:opacity-95'
                : 'border-emerald-200/80 bg-white text-foreground hover:bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-slate-950 dark:hover:bg-emerald-950/20'
            )}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            <span className="truncate">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
