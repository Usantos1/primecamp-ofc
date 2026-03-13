import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Wrench,
  Package,
  UserCircle,
  Wallet,
  BarChart3,
  Users,
  Target,
  Shield,
  Settings,
  Activity,
  Receipt,
  List,
  Clock,
  Boxes,
  FileText,
  LogOut,
  Plug,
  ChevronUp,
  KeyRound,
  UserCog,
  RefreshCw,
  Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeConfig, getDefaultConfigByHost } from "@/contexts/ThemeConfigContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { from } from "@/integrations/db/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin: isAdminAuth, signOut } = useAuth();
  const { config } = useThemeConfig();
  const logoUrl = config.logo || getDefaultConfigByHost().logo || "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png";
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();
  
  // Verificar admin de MÚLTIPLAS fontes para garantir que funcione
  const isAdminDirect = profile?.role?.toLowerCase() === 'admin' || 
                        profile?.role?.toLowerCase() === 'administrador' ||
                        profile?.role?.toLowerCase() === 'administrator';
  
  // Verificar cache do localStorage (para acesso instantâneo)
  const cachedIsAdmin = localStorage.getItem('user_is_admin') === 'true';
  
  // Usar QUALQUER indicador de admin disponível
  const userIsAdmin = isAdmin || isAdminAuth || isAdminDirect || cachedIsAdmin;

  // Buscar nome da empresa
  const { data: companyData } = useQuery({
    queryKey: ['company-name', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const { data } = await from('companies')
        .select('name')
        .eq('id', user.company_id)
        .single();
      return data;
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 30, // Cache por 30 minutos
  });
  const companyName = companyData?.name || '';

  // Menu por segmento: se a empresa tem segmento, usar os módulos configurados
  const apiBase = (import.meta.env.VITE_API_URL && !String(import.meta.env.VITE_API_URL).includes('localhost'))
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : 'https://api.ativafix.com/api';
  const { data: segmentMenuData } = useQuery({
    queryKey: ['segment-menu', user?.company_id],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { menu: [] };
      const res = await fetch(`${apiBase}/me/segment-menu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return { menu: data.menu || [], segmento_nome: data.segmento_nome };
    },
    enabled: !!user?.company_id,
    staleTime: 1000 * 60 * 5, // 5 min
  });
  const { data: roleMenuData } = useQuery({
    queryKey: ['role-menu', user?.id],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { menu: [], home_path: null };
      const res = await fetch(`${apiBase}/me/role-menu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return { menu: data.menu || [], home_path: data.home_path || null };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
  const segmentMenu = segmentMenuData?.menu ?? [];
  const hasSegmentMenu = Array.isArray(segmentMenu) && segmentMenu.length > 0;
  const roleMenu = roleMenuData?.menu ?? [];
  const hasRoleMenu = Array.isArray(roleMenu) && roleMenu.length > 0;
  const homePath = roleMenuData?.home_path || null;
  // Administrador sempre vê o menu completo (segmento); não aplica menu restrito por cargo
  const useRoleMenu = hasRoleMenu && !userIsAdmin;
  const menuToUse = useRoleMenu ? roleMenu : segmentMenu;
  // Se for admin e o menu do segmento estiver vazio (ex.: localhost sem segmento), usar menu base completo
  const useSegmentOrRoleList =
    (hasSegmentMenu || hasRoleMenu) && (hasSegmentMenu || !userIsAdmin);
  
  // Função para verificar permissão
  const checkPermission = (permission: string): boolean => {
    // Admin sempre tem todas as permissões
    if (userIsAdmin) return true;
    // Para não-admins, verificar permissão específica
    return hasPermission(permission);
  };

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (path: string, exact: boolean = false) => {
    if (path === '/') return currentPath === '/';
    if (exact) return currentPath === path;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const getItemClasses = (path: string, exact: boolean = false) => {
    const active = isActive(path, exact);
    const activeStyles =
      "bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white font-semibold border-l-[6px] border-l-black rounded-lg hover:opacity-90";
    const inactiveStyles =
      "text-sidebar-foreground hover:bg-[hsl(var(--sidebar-primary,var(--primary)))] hover:text-white hover:border-l-[6px] hover:border-l-black hover:rounded-lg hover:shadow-md";
    return cn(
      "flex items-center transition-all duration-300 ease-in-out rounded-lg",
      collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2.5 gap-3",
      collapsed && active && "pl-1",
      !collapsed && active && "pl-4",
      !collapsed && !active && "hover:pl-4",
      active ? activeStyles : inactiveStyles
    );
  };

  // Mapa de ícone (nome do módulo) para componente Lucide (menu por segmento)
  const iconMap: Record<string, React.ElementType> = {
    'layout-dashboard': Home,
    'home': Home,
    'wrench': Wrench,
    'users': UserCircle,
    'user-circle': UserCircle,
    'car': Target,
    'file-text': FileText,
    'package': Package,
    'box': Package,
    'shopping-cart': ShoppingCart,
    'receipt': Receipt,
    'list': List,
    'refresh-cw': RefreshCw,
    'wallet': Wallet,
    'bar-chart-3': BarChart3,
    'activity': Activity,
  };

  // ═══════════════════════════════════════════════════════════════
  // OPERAÇÃO - Atividades do dia a dia (ou menu do segmento se houver)
  // ═══════════════════════════════════════════════════════════════
  const operacaoItemsBase = [
    { label: "Dashboard", path: "/", icon: Home, exact: true },
    { label: "PDV", path: "/pdv", icon: ShoppingCart, exact: true, permission: "vendas.create" },
    { label: "Vendas", path: "/pdv/vendas", icon: Receipt, exact: true, permission: "vendas.view" },
    { label: "Devoluções", path: "/pdv/devolucoes", icon: RefreshCw, permission: "vendas.manage" },
    { label: "Ordem de Serviço", path: "/os", icon: Wrench, permission: "os.view" },
    { label: "Caixa", path: "/pdv/caixa", icon: Wallet, exact: true, permission: "caixa.view" },
    { label: "Clientes", path: "/clientes", icon: UserCircle, exact: true, permission: "clientes.view" },
  ];
  // Helper: converte item do menu por segmento para MenuItem (sempre exact para evitar 2 ativos)
  const toMenuItem = (m: { path: string; label_menu: string; slug?: string; icone?: string }) => ({
    label: m.path === '/inventario' ? 'Inventário' : m.label_menu,
    path: m.path || '/',
    icon: iconMap[m.icone || ''] || Home,
    exact: true as const, // só destaca o item da rota exata (evita PDV + Caixa juntos)
    permission: undefined as string | undefined,
  });

  // Menu por cargo (role) ou por segmento: agrupar por categoria
  const segmentByCategory = React.useMemo(() => {
    if (!menuToUse.length) return { operacao: [], estoque: [], gestao: [] };
    const mapOne = (m: { path: string; label_menu: string; slug?: string; icone?: string }) => ({
      label: m.path === '/inventario' ? 'Inventário' : m.label_menu,
      path: m.path || '/',
      icon: iconMap[m.icone || ''] || Home,
      exact: true as const,
      permission: useRoleMenu ? undefined : (undefined as string | undefined),
    });
    const cat = (m: { categoria?: string }) => m.categoria || 'operacao';
    const operacao = menuToUse.filter((m: { categoria?: string }) => cat(m) === 'operacao').map(mapOne);
    const estoque = menuToUse.filter((m: { categoria?: string }) => cat(m) === 'estoque').map(mapOne);
    const gestao = menuToUse.filter((m: { categoria?: string }) => cat(m) === 'gestao').map(mapOne);
    return { operacao, estoque, gestao };
  }, [menuToUse, useRoleMenu]);

  const operacaoItemsFromSegment = segmentByCategory.operacao;
  const operacaoItems = (useSegmentOrRoleList ? operacaoItemsFromSegment : operacaoItemsBase).filter(
    item => useRoleMenu || !item.permission || checkPermission(item.permission)
  );

  // ═══════════════════════════════════════════════════════════════
  // ESTOQUE - Gestão de produtos (menu segmento: itens com categoria estoque)
  // ═══════════════════════════════════════════════════════════════
  const estoqueItemsBase = [
    { label: "Produtos", path: "/produtos", icon: Package, exact: true, permission: "produtos.view" },
    { label: "Pedidos", path: "/pedidos", icon: List, exact: true, permission: "produtos.view" },
    { label: "Inventário", path: "/inventario", icon: Boxes, exact: true, permission: "produtos.view" },
  ];
  const estoqueItems = (useSegmentOrRoleList ? segmentByCategory.estoque : estoqueItemsBase).filter(
    item => useRoleMenu || !item.permission || checkPermission(item.permission)
  );

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIOS - (menu segmento: itens com categoria gestao)
  // ═══════════════════════════════════════════════════════════════
  const relatoriosItemsBase = [
    { label: "Relatórios", path: "/relatorios", icon: Receipt, permission: "relatorios.view" },
    { label: "Financeiro", path: "/financeiro", icon: BarChart3, permission: "relatorios.financeiro" },
    { label: "Painel de Alertas", path: "/painel-alertas", icon: Activity, permission: "relatorios.financeiro" },
  ];
  const relatoriosItems = (useSegmentOrRoleList ? segmentByCategory.gestao : relatoriosItemsBase).filter(
    item => useRoleMenu || !item.permission || checkPermission(item.permission)
  );

  // ═══════════════════════════════════════════════════════════════
  // GESTÃO - RH, Ponto (vazio quando menu por segmento; segmento não costuma ter categoria gestao para RH)
  // ═══════════════════════════════════════════════════════════════
  const gestaoItemsBase = [
    { label: "Recursos Humanos", path: "/rh", icon: Users, permission: "rh.view" },
    { label: "Ponto Eletrônico", path: "/ponto", icon: Clock, permission: "rh.ponto" },
  ];
  const gestaoItems = (useSegmentOrRoleList ? [] : gestaoItemsBase).filter(
    item => useRoleMenu || !item.permission || checkPermission(item.permission)
  );

  // ═══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO - Apenas para admins
  // ═══════════════════════════════════════════════════════════════
  const adminItems = userIsAdmin ? [
    { label: "Configurações", path: "/admin/configuracoes", icon: Settings },
  ] : [];

  // Tipo genérico para itens do menu
  type MenuItem = {
    label: string;
    path: string;
    icon: React.ElementType;
    exact?: boolean;
    permission?: string | string[];
  };

  // Renderiza uma seção do menu
  const renderSection = (
    title: string, 
    icon: React.ElementType, 
    items: MenuItem[],
    showTitle: boolean = true
  ) => {
    if (items.length === 0) return null;
    
    const Icon = icon;
    
    return (
      <>
        {showTitle && !collapsed && (
          <div className="px-2 py-1.5 mt-2">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
              </span>
            </div>
          </div>
        )}
        {items.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild tooltip={item.label}>
              <NavLink to={item.path} end={item.exact !== false}>
                <div className={getItemClasses(item.path, item.exact)}>
                  <item.icon className={cn(
                    "flex-shrink-0 transition-transform",
                    collapsed ? "h-5 w-5" : "h-5 w-5",
                    isActive(item.path, item.exact) && "scale-110"
                  )} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </>
    );
  };

  // Renderiza separador
  const renderSeparator = () => {
    if (collapsed) return null;
    return (
      <div className="px-2 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    );
  };

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 ease-in-out border-r-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {!collapsed && (
        <SidebarHeader className="flex-shrink-0 px-4 py-4 border-b-2 border-gray-200 dark:border-gray-700 h-16 flex items-center justify-center bg-white dark:bg-gray-900">
          <img
            src={logoUrl}
            alt={config.logoAlt || "Logo"}
            className="h-10 w-auto object-contain max-w-[180px]"
            fetchpriority="high"
            decoding="async"
            width="233"
            height="64"
          />
        </SidebarHeader>
      )}

      <SidebarContent 
        className={cn("flex flex-1 min-h-0 flex-col gap-0 overflow-y-auto sidebar-scroll", collapsed ? "p-2 pt-4" : "p-3")}
      >
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={cn("space-y-0.5", collapsed && "flex flex-col items-center gap-1")}>
              
              {/* ══════ OPERAÇÃO ══════ */}
              {renderSection("Operação", ShoppingCart, operacaoItems)}

              {/* Separador */}
              {estoqueItems.length > 0 && renderSeparator()}

              {/* ══════ ESTOQUE ══════ */}
              {renderSection("Estoque", Boxes, estoqueItems)}

              {/* Separador */}
              {relatoriosItems.length > 0 && renderSeparator()}

              {/* ══════ RELATÓRIOS ══════ */}
              {renderSection("Relatórios", BarChart3, relatoriosItems)}

              {/* Separador */}
              {gestaoItems.length > 0 && renderSeparator()}

              {/* ══════ GESTÃO ══════ */}
              {renderSection("Gestão", Target, gestaoItems)}

              {/* Separador */}
              {adminItems.length > 0 && renderSeparator()}

              {/* ══════ ADMINISTRAÇÃO ══════ */}
              {renderSection("Administração", Shield, adminItems)}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 mt-auto bg-white/50 dark:bg-gray-900/50", collapsed ? "p-2" : "p-3")}>
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left group">
                {/* Avatar com foto ou iniciais */}
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-emerald-400 dark:border-emerald-500 shadow-sm">
                    {(profile as any)?.avatar_url ? (
                      <img 
                        src={(profile as any).avatar_url} 
                        alt={profile?.display_name || 'Avatar'} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {/* Status online */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                    {profile?.display_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight uppercase tracking-wide">
                    {companyName || (userIsAdmin ? "Administrador" : profile?.department || "Atendimento")}
                  </p>
                </div>
                
                {/* Chevron */}
                <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <UserCog className="h-4 w-4 mr-2" />
                Gerenciar Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors mx-auto relative">
                <Avatar className="h-8 w-8 border-2 border-emerald-400 dark:border-emerald-500">
                  {(profile as any)?.avatar_url ? (
                    <img 
                      src={(profile as any).avatar_url} 
                      alt={profile?.display_name || 'Avatar'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                      {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Status online */}
                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">
                {profile?.display_name || user?.email?.split('@')[0]}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <UserCog className="h-4 w-4 mr-2" />
                Gerenciar Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
