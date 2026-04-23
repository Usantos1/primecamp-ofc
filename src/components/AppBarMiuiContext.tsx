import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigationItems } from '@/hooks/useNavigationItems';

/**
 * Barra secundária MIUI com atalhos contextuais (ex.: dentro de /financeiro
 * mostra DRE, Planejamento, Fluxo de Caixa, Contas, Transações etc.).
 * Usa os mesmos `quickNavItems` do AppBar clássico para manter paridade.
 */
export function AppBarMiuiContext() {
  const location = useLocation();
  const navigate = useNavigate();
  const { quickNavItems, allItems } = useNavigationItems();

  if (!quickNavItems || quickNavItems.length <= 1) return null;

  // Só exibe quando há rotas contextuais que NÃO estão já cobertas pelo menu global
  // (evita duplicar na home). Se ao menos um item do quickNav não estiver no menu
  // global, vale a pena mostrar a barra para o usuário alcançar as rotas do módulo.
  const globalPaths = new Set(allItems.map((i) => i.path));
  const hasContextOnlyItem = quickNavItems.some((i) => !globalPaths.has(i.path));
  if (!hasContextOnlyItem && location.pathname === '/') return null;

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
