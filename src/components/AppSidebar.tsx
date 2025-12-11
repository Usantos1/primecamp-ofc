import {
  Home,
  Target,
  Users,
  BarChart3,
  Settings,
  Shield,
  Plus,
  Search,
  Filter,
  Folder,
  Activity,
  Workflow,
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  TrendingUp,
  Brain,
  Building2,
  Briefcase,
  FolderOpen,
  Tag,
  Package,
  GraduationCap,
  Video,
  DollarSign,
  ShoppingCart,
  UserCircle,
  Wrench,
} from "lucide-react";
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeConfig } from "@/contexts/ThemeConfigContext";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AppSidebar(): JSX.Element {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { config } = useThemeConfig();

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;
  
  // Estados para controlar quais submenus estão abertos
  const [isOrgOpen, setIsOrgOpen] = useState(
    currentPath.startsWith('/admin/users') || 
    currentPath.startsWith('/admin/positions') || 
    currentPath.startsWith('/admin/departments') || 
    currentPath.startsWith('/admin/categories') || 
    currentPath.startsWith('/admin/tags')
  );
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(
    currentPath.startsWith('/admin/timeclock') || 
    currentPath.startsWith('/admin/goals') || 
    currentPath.startsWith('/admin/nps') || 
    currentPath.startsWith('/admin/disc')
  );
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(
    currentPath.startsWith('/admin/job-surveys') || 
    currentPath.startsWith('/admin/interviews') ||
    currentPath.startsWith('/admin/talent-bank') ||
    currentPath.startsWith('/candidato-disc') ||
    currentPath.startsWith('/disc-externo')
  );

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 ease-in-out border-r`}
      collapsible="icon"
    >
      {!collapsed && (
        <SidebarHeader className="px-4 py-3 border-b h-16 flex items-center justify-center">
          <img
            src={config.logo || "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png"}
            alt={config.logoAlt || config.companyName || "Logo"}
            className="h-10 w-auto object-contain"
            fetchPriority="high"
            decoding="async"
            width="233"
            height="64"
          />
        </SidebarHeader>
      )}

      <SidebarContent className={`flex flex-col gap-1 ${collapsed ? "p-1 pt-4" : "p-2"}`}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end>
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Home className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Dashboard</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* === PDV / Assistência Técnica === */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/pdv" end>
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <ShoppingCart className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">PDV</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/pdv/clientes">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <UserCircle className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Clientes</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/pdv/produtos">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Package className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Produtos</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/pdv/os">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Wrench className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Ordem de Serviço</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/pdv/colaboradores">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Users className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0" />}
                        {!collapsed && <span className="font-medium text-sm">Colaboradores</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/financeiro">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <DollarSign className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Financeiro</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Divisor visual */}
              {!collapsed && <div className="my-2 border-t border-border/50" />}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/tarefas">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <CheckSquare className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Tarefas</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/processos">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Workflow className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Processos</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/treinamentos">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <GraduationCap className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Treinamentos</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/calendario">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Calendar className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Calendário</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/ponto">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Clock className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Ponto</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/metas">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Target className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Metas</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/nps">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <TrendingUp className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">NPS</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/produtos">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Package className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Produtos</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/teste-disc">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Brain className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Teste DISC</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>


              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/relatorios">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <BarChart3 className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Relatórios</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/integracoes">
                    {({ isActive }) => (
                      <div
                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                      >
                        <Shield className={`${collapsed ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
                        {!collapsed && <span className="font-medium text-sm">Integrações</span>}
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isAdmin && !collapsed && (
                <>
                  <div className="px-2 py-2 mt-4">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Administração
                      </span>
                    </div>
                  </div>

                  {/* Estrutura Organizacional */}
                  <Collapsible open={isOrgOpen} onOpenChange={setIsOrgOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">Estrutura Organizacional</span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isOrgOpen ? 'rotate-180' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/users">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Users className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Usuários</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/positions">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Cargos</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/departments">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Building2 className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Departamentos</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/categories">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <FolderOpen className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Categorias</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/tags">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Tag className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Tags</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Gestão de Funcionalidades */}
                  <Collapsible open={isFeaturesOpen} onOpenChange={setIsFeaturesOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <Settings className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">Gestão de Funcionalidades</span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/timeclock">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Clock className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Ponto Admin</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/goals">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Target className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">Metas Admin</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/nps">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">NPS Admin</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/disc">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Brain className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm">DISC Admin</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Recrutamento */}
                  <Collapsible open={isRecruitmentOpen} onOpenChange={setIsRecruitmentOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <ClipboardList className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">Recrutamento</span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isRecruitmentOpen ? 'rotate-180' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/job-surveys">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center justify-start transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <ClipboardList className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm whitespace-nowrap">Formulários de Vagas</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/interviews">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center justify-start transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Video className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm whitespace-nowrap">Entrevistas com IA</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/talent-bank">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center justify-start transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Users className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm whitespace-nowrap">Banco de Talentos</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/candidato-disc">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center justify-start transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Brain className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium text-sm whitespace-nowrap">DISC Externo</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Financeiro */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/financeiro">
                        {({ isActive }) => (
                          <div
                            className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                          >
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium text-sm">Financeiro</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Sistema */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/logs">
                        {({ isActive }) => (
                          <div
                            className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                          >
                            <Activity className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium text-sm">Logs</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {isAdmin && collapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin">
                      {({ isActive }) => (
                        <div
                          className={`flex items-center transition-colors rounded-lg w-10 h-10 justify-center mx-auto ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                        >
                          <Settings className="h-4 w-4 flex-shrink-0" />
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`border-t mt-auto ${collapsed ? "p-1" : "p-2"}`}>
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
              <ChevronRight className="h-3 w-3 rotate-180" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
