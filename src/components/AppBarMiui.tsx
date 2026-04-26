import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigationItems } from '@/hooks/useNavigationItems';
import { useThemeConfig, getDefaultConfigByHost } from '@/contexts/ThemeConfigContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function AppBarMiui() {
  const location = useLocation();
  const navigate = useNavigate();
  const { allItems } = useNavigationItems();
  const { config } = useThemeConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const logoUrl =
    config.logo || getDefaultConfigByHost().logo || 'https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png';

  if (allItems.length === 0) {
    return null;
  }

  const primaryPaths = ['/pdv', '/os'];
  const primaryItems = primaryPaths
    .map((path) => allItems.find((item) => item.path === path))
    .filter(Boolean);
  const menuItems = allItems.filter((item) => !primaryItems.some((primary) => primary.path === item.path));
  const groupedItems = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    const key = item.groupLabel || 'Navegação';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain pr-1 scrollbar-none sm:gap-2">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex shrink-0 items-center px-0.5 py-0.5 transition-opacity hover:opacity-90 sm:px-1"
      >
        <img
          src={logoUrl}
          alt={config.logoAlt || 'Logo'}
          className="h-9 w-auto max-w-[116px] object-contain sm:h-12 sm:max-w-[170px]"
        />
      </button>

      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

        return (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              'h-10 shrink-0 rounded-full border px-3 text-xs font-medium shadow-sm sm:h-11 sm:px-4 sm:text-sm',
              isActive
                ? 'border-[hsl(var(--sidebar-primary,var(--primary)))] bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white hover:opacity-95'
                : 'border-emerald-200/80 bg-white text-foreground hover:bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-slate-950 dark:hover:bg-emerald-950/20'
            )}
          >
            <Icon className="mr-1.5 h-4 w-4 sm:mr-2" />
            {item.path === '/os' ? (
              <>
                <span className="sm:hidden">OS</span>
                <span className="hidden truncate sm:inline">{item.label}</span>
              </>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </Button>
        );
      })}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="relative z-20 h-10 min-w-[82px] shrink-0 rounded-full border border-emerald-200/80 bg-white px-3 text-xs font-medium shadow-sm hover:bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-slate-950 dark:hover:bg-emerald-950/20 sm:h-11 sm:min-w-[118px] sm:px-4 sm:text-sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(true);
              }
            }}
          >
            Menu
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={12}
          avoidCollisions={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="w-[calc(100vw-1rem)] max-w-[360px] max-h-[72vh] overflow-y-auto rounded-[28px] border border-border/70 bg-background p-3 opacity-100 shadow-[0_18px_50px_rgba(16,24,40,0.18)] scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent dark:bg-slate-950 dark:scrollbar-thumb-emerald-900"
        >
          {Object.entries(groupedItems).map(([groupLabel, items], index) => (
            <div key={groupLabel} className="min-w-0">
              {index > 0 && <div className="my-2 h-px bg-border" />}
              <div className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {groupLabel}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const isCurrentPage =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={cn(
                      "relative flex w-full items-center rounded-2xl border-l-2 border-l-transparent px-3 py-3.5 text-left outline-none transition-colors",
                      "hover:border-l-emerald-500 hover:bg-slate-100 focus-visible:border-l-emerald-500 focus-visible:bg-slate-100 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
                      isCurrentPage && "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20"
                    )}
                  >
                    <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                        {isCurrentPage && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Página atual
                          </span>
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.description || item.groupLabel || 'Acessar módulo'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        className="hidden h-11 w-11 shrink-0 rounded-full border border-emerald-200/80 bg-white p-0 text-emerald-600 shadow-sm hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-950 dark:hover:bg-emerald-950/20 sm:inline-flex"
        aria-label="Busca rápida"
        title="Busca rápida (Ctrl+K)"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
      >
        <Search className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1" />
    </div>
  );
}
