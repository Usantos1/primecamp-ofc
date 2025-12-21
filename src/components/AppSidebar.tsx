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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  // Função para verificar se o item está ativo
  const isActive = (path: string, exact: boolean = false) => {
    if (path === '/') {
      return currentPath === '/';
    }
    // Se for exato, apenas marcar se for exatamente igual
    if (exact) {
      return currentPath === path;
    }
    // Se não for exato, marcar se começar com o path
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Função para obter classes do item ativo
  const getItemClasses = (path: string, exact: boolean = false) => {
    const active = isActive(path, exact);
    return cn(
      "flex items-center transition-colors rounded-lg",
      collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2.5 gap-3",
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );
  };

  // Itens principais sempre visíveis
  const mainItems = [
    { label: "Dashboard", path: "/", icon: Home, exact: true },
    { label: "Vendas", path: "/pdv", icon: ShoppingCart, exact: true },
    { label: "Ordem de Serviço", path: "/pdv/os", icon: Wrench, exact: false },
    { label: "Produtos", path: "/produtos", icon: Package, exact: true },
    { label: "Clientes", path: "/pdv/clientes", icon: UserCircle, exact: true },
    { label: "Caixa", path: "/pdv/caixa", icon: Wallet, exact: true },
  ];
  
  // Itens de Vendas e OS (acessos rápidos)
  const vendasItems = [
    { label: "Lista de Vendas", path: "/pdv/vendas", icon: List },
    { label: "Dashboard Assistência", path: "/assistencia", icon: BarChart3 },
    { label: "Relatórios PDV", path: "/pdv/relatorios", icon: Receipt },
    { label: "Config. Cupom", path: "/pdv/configuracao-cupom", icon: FileText },
    { label: "Config. Status OS", path: "/pdv/configuracao-status", icon: Settings },
  ];

  // Grupo Gestão (sem submenus)
  const gestaoItems = [
    { label: "Dashboard Gestão", path: "/gestao", icon: Home },
    { label: "Relatórios", path: "/relatorios", icon: BarChart3 },
    { label: "Financeiro", path: "/admin/financeiro", icon: DollarSign },
    { label: "Recursos Humanos", path: "/rh", icon: Users },
    { label: "Metas", path: "/metas", icon: Target },
  ];

  // Grupo Administração (apenas para admin)
  const adminItems = [
    { label: "Usuários e Permissões", path: "/admin/users", icon: Users },
    { label: "Estrutura Organizacional", path: "/admin/estrutura", icon: Building2 },
    { label: "Cadastros Base", path: "/admin/cadastros", icon: FolderOpen },
    { label: "Integrações", path: "/integracoes", icon: Settings },
    { label: "Logs", path: "/admin/logs", icon: Activity },
  ];

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 ease-in-out border-r",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {!collapsed && (
        <SidebarHeader className="px-4 py-3 border-b h-16 flex items-center justify-center">
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

      <SidebarContent className={cn("flex flex-col gap-1", collapsed ? "p-1 pt-4" : "p-2")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
              {/* === ITENS PRINCIPAIS === */}
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end={item.exact !== false}>
                      <div className={getItemClasses(item.path, item.exact)}>
                        <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-5 w-5")} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separador visual */}
              {!collapsed && (
                <div className="px-2 py-3">
                  <div className="h-px bg-border" />
                </div>
              )}

              {/* === VENDAS E OS (Acessos Rápidos) === */}
              {!collapsed && (
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendas e OS
                    </span>
                  </div>
                </div>
              )}

              {vendasItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end>
                      <div className={getItemClasses(item.path, true)}>
                        <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-5 w-5")} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separador visual */}
              {!collapsed && (
                <div className="px-2 py-3">
                  <div className="h-px bg-border" />
                </div>
              )}

              {/* === GRUPO GESTÃO === */}
              {!collapsed && (
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Gestão
                    </span>
                  </div>
                </div>
              )}

              {gestaoItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end={item.path === '/gestao' || item.path === '/relatorios' || item.path === '/metas' || item.path === '/rh'}>
                      <div className={getItemClasses(item.path, item.path === '/gestao' || item.path === '/relatorios' || item.path === '/metas' || item.path === '/rh')}>
                        <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-5 w-5")} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separador visual para Administração */}
              {isAdmin && !collapsed && (
                <div className="px-2 py-3">
                  <div className="h-px bg-border" />
                </div>
              )}

              {/* === GRUPO ADMINISTRAÇÃO (apenas admin) === */}
              {isAdmin && (
                <>
                  {!collapsed && (
                    <div className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                            <item.icon className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-5 w-5")} />
                            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Modo colapsado - mostrar apenas ícone de admin */}
              {isAdmin && collapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin">
                      <div className={getItemClasses('/admin')}>
                        <Shield className="h-4 w-4 flex-shrink-0" />
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t mt-auto", collapsed ? "p-1" : "p-2")}>
        {!collapsed ? (
          <div className="space-y-2">
            <NavLink
              to="/perfil"
              className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md p-2 transition-colors"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {profile?.display_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{isAdmin ? "Admin" : "Usuário"}</p>
              </div>
            </NavLink>
            <Button variant="outline" size="sm" onClick={signOut} className="w-full h-7 text-xs">
              Sair
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <NavLink
              to="/perfil"
              className="w-10 h-10 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors mx-auto"
              title="Perfil"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </NavLink>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-10 h-10 p-0 flex items-center justify-center mx-auto"
              title="Sair"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
