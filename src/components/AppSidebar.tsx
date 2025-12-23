import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Wrench,
  Package,
  UserCircle,
  Wallet,
  BarChart3,
  DollarSign,
  Users,
  Target,
  Shield,
  Building2,
  FolderOpen,
  Settings,
  Activity,
  Receipt,
  FileText,
  List,
  Clock,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/PermissionGate";
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

// Logo da aplicação
const logoImage = "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { hasPermission, permissions, loading: permissionsLoading } = usePermissions();

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  // Função para verificar se o item está ativo
  const isActive = (path: string, exact: boolean = false) => {
    if (path === '/') {
      return currentPath === '/';
    }
    if (exact) {
      return currentPath === path;
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Função para obter classes do item ativo
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

  // === NAVEGAÇÃO PRINCIPAL ===
  const mainItems = [
    { label: "Dashboard", path: "/", icon: Home, exact: true },
  ];

  // === VENDAS E OS ===
  const vendasOsMainItems = [
    { label: "Vendas", path: "/pdv", icon: ShoppingCart, exact: true, permission: "vendas.create" },
    { label: "Ordem de Serviço", path: "/pdv/os", icon: Wrench, exact: false, permission: "os.view" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  const vendasSubItems = [
    { label: "Lista de Vendas", path: "/pdv/vendas", icon: List, permission: "vendas.view" },
    { label: "Relatórios PDV", path: "/pdv/relatorios", icon: Receipt, permission: ["relatorios.vendas", "relatorios.financeiro", "relatorios.geral"] },
  ].filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some(p => hasPermission(p));
    }
    return hasPermission(item.permission);
  });

  // === OUTROS ACESSOS RÁPIDOS ===
  const outrosItems = [
    { label: "Produtos", path: "/produtos", icon: Package, exact: true, permission: "produtos.view" },
    { label: "Clientes", path: "/pdv/clientes", icon: UserCircle, exact: true, permission: "clientes.view" },
    { label: "Caixa", path: "/pdv/caixa", icon: Wallet, exact: true, permission: "caixa.view" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // === CADASTROS ===
  const cadastrosItems = [
    { label: "Produtos", path: "/produtos", icon: Package, permission: "produtos.view" },
    { label: "Clientes", path: "/pdv/clientes", icon: UserCircle, permission: "clientes.view" },
    { label: "Marcas e Modelos", path: "/pdv/marcas-modelos", icon: FileText, permission: "produtos.manage" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // === GESTÃO ===
  const gestaoItems = [
    { label: "Dashboard Gestão", path: "/gestao", icon: Home, permission: "dashboard.gestao" },
    { label: "Relatórios", path: "/relatorios", icon: BarChart3, permission: "relatorios.geral" },
    { label: "Financeiro", path: "/admin/financeiro", icon: DollarSign, permission: "financeiro.view" },
    { label: "Configurações", path: "/admin/configuracoes", icon: Settings, permission: "admin.config" },
    { label: "Recursos Humanos", path: "/rh", icon: Users, permission: "rh.view" },
    { label: "Metas", path: "/metas", icon: Target, permission: "rh.metas" },
    { label: "Ponto Eletrônico", path: "/ponto", icon: Clock, permission: "rh.ponto" },
    { label: "Academy", path: "/treinamentos", icon: GraduationCap, permission: "rh.treinamentos" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  // === ADMINISTRAÇÃO ===
  const adminItems = [
    { label: "Usuários e Permissões", path: "/admin/users", icon: Users, permission: "admin.users" },
    { label: "Estrutura Organizacional", path: "/admin/estrutura", icon: Building2, permission: "admin.config" },
    { label: "Cadastros Base", path: "/admin/cadastros", icon: FolderOpen, permission: "admin.config" },
    { label: "Integrações", path: "/integracoes", icon: Settings, permission: "admin.config" },
    { label: "Logs", path: "/admin/logs", icon: Activity, permission: "admin.logs" },
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 ease-in-out border-r-2 border-gray-200 bg-gradient-to-b from-white to-gray-50",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {!collapsed && (
        <SidebarHeader className="px-4 py-4 border-b-2 border-gray-200 h-16 flex items-center justify-center bg-white">
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

      <SidebarContent className={cn("flex flex-col gap-2", collapsed ? "p-2 pt-4" : "p-3")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={cn("space-y-1", collapsed && "flex flex-col items-center gap-1")}>
              {/* === DASHBOARD === */}
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end={item.exact !== false}>
                      <div className={getItemClasses(item.path, item.exact)}>
                        <item.icon className={cn("flex-shrink-0 transition-transform", collapsed ? "h-5 w-5" : "h-5 w-5", isActive(item.path, item.exact) && "scale-110")} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separador */}
              {!collapsed && vendasOsMainItems.length > 0 && (
                <div className="px-2 py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* === VENDAS E OS === */}
              {vendasOsMainItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Vendas e OS
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Itens principais: Vendas e Ordem de Serviço */}
                  {vendasOsMainItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.path} end={item.exact !== false}>
                          <div className={getItemClasses(item.path, item.exact)}>
                            <item.icon className={cn("flex-shrink-0 transition-transform", collapsed ? "h-5 w-5" : "h-5 w-5", isActive(item.path, item.exact) && "scale-110")} />
                            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* Subitens de Vendas: Lista de Vendas e Relatórios PDV */}
                  {!collapsed && vendasSubItems.length > 0 && (
                    <div className="pl-4 space-y-1">
                      {vendasSubItems.map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild>
                            <NavLink to={item.path} end>
                              <div className={cn(
                                "flex items-center transition-all duration-200 rounded-lg p-2 gap-2",
                                isActive(item.path, true)
                                  ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-700 font-medium"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}>
                                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-xs">{item.label}</span>
                              </div>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Separador */}
              {!collapsed && outrosItems.length > 0 && (
                <div className="px-2 py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* === OUTROS ACESSOS RÁPIDOS === */}
              {outrosItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end={item.exact !== false}>
                      <div className={getItemClasses(item.path, item.exact)}>
                        <item.icon className={cn("flex-shrink-0 transition-transform", collapsed ? "h-5 w-5" : "h-5 w-5", isActive(item.path, item.exact) && "scale-110")} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separador */}
              {!collapsed && cadastrosItems.length > 0 && (
                <div className="px-2 py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* === CADASTROS === */}
              {cadastrosItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Cadastros
                        </span>
                      </div>
                    </div>
                  )}
                  {cadastrosItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.path} end>
                          <div className={getItemClasses(item.path, true)}>
                            <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-4 w-4")} />
                            {!collapsed && <span className="text-sm">{item.label}</span>}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Separador */}
              {!collapsed && gestaoItems.length > 0 && (
                <div className="px-2 py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* === GESTÃO === */}
              {gestaoItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Gestão
                        </span>
                      </div>
                    </div>
                  )}
                  {gestaoItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.path} end={item.path === '/gestao' || item.path === '/relatorios' || item.path === '/metas' || item.path === '/rh' || item.path === '/admin/configuracoes'}>
                          <div className={getItemClasses(item.path, item.path === '/gestao' || item.path === '/relatorios' || item.path === '/metas' || item.path === '/rh' || item.path === '/admin/configuracoes')}>
                            <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-4 w-4")} />
                            {!collapsed && <span className="text-sm">{item.label}</span>}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Separador */}
              {adminItems.length > 0 && !collapsed && (
                <div className="px-2 py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* === ADMINISTRAÇÃO === */}
              {adminItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Administração
                        </span>
                      </div>
                    </div>
                  )}
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.path}>
                          <div className={getItemClasses(item.path)}>
                            <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-4 w-4")} />
                            {!collapsed && <span className="text-sm">{item.label}</span>}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t-2 border-gray-200 mt-auto bg-white", collapsed ? "p-2" : "p-3")}>
        {!collapsed ? (
          <div className="space-y-2">
            <NavLink
              to="/perfil"
              className="flex items-center gap-2 hover:bg-sidebar-accent rounded-lg p-2 transition-colors"
            >
              <Avatar className="h-8 w-8 border-2 border-gray-200">
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
              className="w-full h-8 text-xs border-2 border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            >
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
              <Avatar className="h-8 w-8 border-2 border-gray-200">
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </NavLink>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-10 h-10 p-0 flex items-center justify-center mx-auto border-2 border-gray-300 hover:bg-red-50 hover:border-red-300"
              title="Sair"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
