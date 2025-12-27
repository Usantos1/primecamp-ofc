import React from "react";
import { NavLink, useLocation } from "react-router-dom";
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
import { cn } from "@/lib/utils";

const logoImage = "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { hasPermission } = usePermissions();

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
        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // OPERAÇÃO - Atividades do dia a dia
  // ═══════════════════════════════════════════════════════════════
  const operacaoItems = [
    { label: "Dashboard", path: "/", icon: Home, exact: true },
    { label: "Vendas", path: "/pdv", icon: ShoppingCart, exact: true, permission: "vendas.create" },
    { label: "Ordem de Serviço", path: "/os", icon: Wrench, permission: "os.view" },
    { label: "Caixa", path: "/pdv/caixa", icon: Wallet, exact: true, permission: "caixa.view" },
    { label: "Clientes", path: "/pdv/clientes", icon: UserCircle, exact: true, permission: "clientes.view" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // ═══════════════════════════════════════════════════════════════
  // ESTOQUE - Gestão de produtos
  // ═══════════════════════════════════════════════════════════════
  const estoqueItems = [
    { label: "Produtos", path: "/produtos", icon: Package, exact: true, permission: "produtos.view" },
    { label: "Marcas e Modelos", path: "/pdv/marcas-modelos", icon: FileText, permission: "produtos.manage" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIOS - Todos os relatórios juntos
  // ═══════════════════════════════════════════════════════════════
  const relatoriosItems = [
    { label: "Relatórios PDV", path: "/pdv/relatorios", icon: Receipt, permission: ["relatorios.vendas", "relatorios.financeiro"] },
    { label: "Relatórios Gestão", path: "/relatorios", icon: BarChart3, permission: "relatorios.geral" },
  ].filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) return item.permission.some(p => hasPermission(p));
    return hasPermission(item.permission);
  });

  // ═══════════════════════════════════════════════════════════════
  // GESTÃO - RH, Metas, Treinamentos
  // ═══════════════════════════════════════════════════════════════
  const gestaoItems = [
    { label: "Metas", path: "/metas", icon: Target, permission: "rh.metas" },
    { label: "Recursos Humanos", path: "/rh", icon: Users, permission: "rh.view" },
    { label: "Ponto Eletrônico", path: "/ponto", icon: Clock, permission: "rh.ponto" },
    { label: "Academy", path: "/treinamentos", icon: GraduationCap, permission: "rh.treinamentos" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // ═══════════════════════════════════════════════════════════════
  // ADMINISTRAÇÃO - Apenas para admins
  // ═══════════════════════════════════════════════════════════════
  const adminItems = [
    { label: "Usuários e Permissões", path: "/admin/users", icon: Users, permission: "admin.users" },
    { label: "Estrutura Organizacional", path: "/admin/estrutura", icon: Building2, permission: "admin.config" },
    { label: "Cadastros Base", path: "/admin/cadastros", icon: FolderOpen, permission: "admin.config" },
    { label: "Integrações", path: "/integracoes", icon: Plug, permission: "admin.config" },
    { label: "Logs", path: "/admin/logs", icon: Activity, permission: "admin.logs" },
    { label: "Configurações", path: "/admin/configuracoes", icon: Settings, permission: "admin.config" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // Renderiza uma seção do menu
  const renderSection = (
    title: string, 
    icon: React.ElementType, 
    items: typeof operacaoItems,
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
            <SidebarMenuButton asChild>
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

              {/* Separador */}
              {adminItems.length > 0 && renderSeparator()}

              {/* ══════ ADMINISTRAÇÃO ══════ */}
              {renderSection("Administração", Shield, adminItems)}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t-2 border-gray-200 dark:border-gray-700 mt-auto bg-white dark:bg-gray-900", collapsed ? "p-2" : "p-3")}>
        {!collapsed ? (
          <div className="space-y-2">
            <NavLink
              to="/perfil"
              className="flex items-center gap-2 hover:bg-sidebar-accent rounded-lg p-2 transition-colors"
            >
              <Avatar className="h-8 w-8 border-2 border-gray-200 dark:border-gray-600">
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {profile?.display_name || user?.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{isAdmin ? "Admin" : "Usuário"}</p>
              </div>
            </NavLink>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut} 
              className="w-full h-8 text-xs border-2 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sair
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <NavLink
              to="/perfil"
              className="w-10 h-10 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors mx-auto"
              title="Perfil"
            >
              <Avatar className="h-8 w-8 border-2 border-gray-200 dark:border-gray-600">
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </NavLink>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-10 h-10 p-0 flex items-center justify-center mx-auto border-2 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
