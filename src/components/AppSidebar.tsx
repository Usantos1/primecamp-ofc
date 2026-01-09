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
  Building2,
  FolderOpen,
  Settings,
  Activity,
  Receipt,
  List,
  Clock,
  GraduationCap,
  Boxes,
  FileText,
  LogOut,
  Plug,
  ChevronUp,
  KeyRound,
  UserCog,
  Megaphone,
  Store,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
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

const logoImage = "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin: isAdminAuth, signOut } = useAuth();
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();
  
  // Verificar admin de MÚLTIPLAS fontes para garantir que funcione
  const isAdminDirect = profile?.role?.toLowerCase() === 'admin' || 
                        profile?.role?.toLowerCase() === 'administrador' ||
                        profile?.role?.toLowerCase() === 'administrator';
  
  // Verificar cache do localStorage (para acesso instantâneo)
  const cachedIsAdmin = localStorage.getItem('user_is_admin') === 'true';
  
  // Usar QUALQUER indicador de admin disponível
  const userIsAdmin = isAdmin || isAdminAuth || isAdminDirect || cachedIsAdmin;
  
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
    return cn(
      "flex items-center transition-all duration-200 rounded-lg",
      collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2.5 gap-3",
      active
        ? "bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white font-semibold shadow-md hover:opacity-90"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // OPERAÇÃO - Atividades do dia a dia
  // SEM FILTRO - TEMPORÁRIO PARA DEBUG
  // ═══════════════════════════════════════════════════════════════
  const operacaoItems = [
    { label: "Dashboard", path: "/", icon: Home, exact: true },
    { label: "Vendas", path: "/pdv", icon: ShoppingCart, exact: true },
    { label: "Ordem de Serviço", path: "/os", icon: Wrench },
    { label: "Caixa", path: "/pdv/caixa", icon: Wallet, exact: true },
    { label: "Clientes", path: "/clientes", icon: UserCircle, exact: true },
  ];

  // ═══════════════════════════════════════════════════════════════
  // ESTOQUE - Gestão de produtos
  // ═══════════════════════════════════════════════════════════════
  const estoqueItems = [
    { label: "Produtos", path: "/produtos", icon: Package, exact: true },
    { label: "Marcas e Modelos", path: "/pdv/marcas-modelos", icon: FileText },
  ];

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIOS - Todos os relatórios juntos
  // ═══════════════════════════════════════════════════════════════
  const relatoriosItems = [
    { label: "Relatórios PDV", path: "/pdv/relatorios", icon: Receipt },
    { label: "Relatórios Gestão", path: "/relatorios", icon: BarChart3 },
  ];

  // ═══════════════════════════════════════════════════════════════
  // GESTÃO - RH, Metas, Treinamentos
  // ═══════════════════════════════════════════════════════════════
  const gestaoItems = [
    { label: "Metas", path: "/metas", icon: Target },
    { label: "Recursos Humanos", path: "/rh", icon: Users },
    { label: "Ponto Eletrônico", path: "/ponto", icon: Clock },
    { label: "Academy", path: "/treinamentos", icon: GraduationCap },
  ];

  // ═══════════════════════════════════════════════════════════════
  // FINANCEIRO - Gestão Financeira
  // ═══════════════════════════════════════════════════════════════
  const financeiroItems = [
    { label: "Financeiro", path: "/admin/financeiro", icon: Wallet },
  ];

  // ═══════════════════════════════════════════════════════════════
  // MARKETING - Campanhas, Leads, Métricas
  // ═══════════════════════════════════════════════════════════════
  const marketingItems = [
    { label: "Marketing & Ads", path: "/admin/marketing", icon: Megaphone },
  ];


  // ═══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO - Apenas para admins
  // ═══════════════════════════════════════════════════════════════
  // Verificar se é admin da empresa principal (ID: 00000000-0000-0000-0000-000000000001)
  const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
  
  // Só mostrar Gestão de Revenda se for admin E pertencer à empresa principal
  const userCompanyId = user?.company_id;
  const isMainCompanyAdmin = userCompanyId === ADMIN_COMPANY_ID;
  const isAdminCompany = Boolean(userIsAdmin && isMainCompanyAdmin);
  
  const adminItems = [
    // Gestão de Revenda - APENAS para admins da empresa principal
    ...(isAdminCompany ? [{ label: "Gestão de Revenda", path: "/admin/revenda", icon: Store }] : []),
    { label: "Usuários e Permissões", path: "/admin/users", icon: Users },
    { label: "Estrutura Organizacional", path: "/admin/estrutura", icon: Building2 },
    { label: "Cadastros Base", path: "/admin/cadastros", icon: FolderOpen },
    { label: "Integrações", path: "/integracoes", icon: Plug },
    { label: "Logs", path: "/admin/logs", icon: Activity },
    { label: "Configurações", path: "/admin/configuracoes", icon: Settings },
  ];

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
        <SidebarHeader className="px-4 py-4 border-b-2 border-gray-200 dark:border-gray-700 h-16 flex items-center justify-center bg-white dark:bg-gray-900">
          <img
            src={logoImage}
            alt="Prime Camp Logo"
            className="h-10 w-auto object-contain"
            fetchPriority="high"
            decoding="async"
            width="233"
            height="64"
          />
        </SidebarHeader>
      )}

      <SidebarContent className={cn("flex flex-col gap-0", collapsed ? "p-2 pt-4" : "p-3")}>
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

              {/* ══════ FINANCEIRO ══════ */}
              {renderSection("Financeiro", Wallet, financeiroItems)}

              {/* ══════ MARKETING ══════ */}
              {renderSection("Marketing", Megaphone, marketingItems)}

              {/* Separador */}
              {adminItems.length > 0 && renderSeparator()}

              {/* ══════ ADMINISTRAÇÃO ══════ */}
              {renderSection("Administração", Shield, adminItems)}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t-2 border-gray-200 dark:border-gray-700 mt-auto bg-white/50 dark:bg-gray-900/50", collapsed ? "p-2" : "p-3")}>
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
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {profile?.display_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userIsAdmin ? "Administrador" : profile?.department || "Atendimento"}
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
