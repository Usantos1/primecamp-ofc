import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  Smartphone,
  Store,
  Receipt,
  Wallet,
  CreditCard,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  FileText as FileTextIcon,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Logo da aplicação
const logoImage = "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();

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
  const [isEstoqueVendasOpen, setIsEstoqueVendasOpen] = useState(
    currentPath.startsWith('/pdv') || 
    currentPath.startsWith('/assistencia') || 
    currentPath.startsWith('/vendas')
  );
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(
    currentPath.startsWith('/pdv/clientes') || 
    currentPath.startsWith('/produtos') || 
    currentPath.startsWith('/pdv/marcas-modelos')
  );
  const [isGestaoOperacionalOpen, setIsGestaoOperacionalOpen] = useState(
    currentPath.startsWith('/tarefas') || 
    currentPath.startsWith('/processos') || 
    currentPath.startsWith('/calendario') ||
    currentPath.startsWith('/ponto')
  );
  const [isRecursosHumanosOpen, setIsRecursosHumanosOpen] = useState(
    currentPath.startsWith('/treinamentos') ||
    currentPath.startsWith('/metas') ||
    currentPath.startsWith('/nps') ||
    currentPath.startsWith('/teste-disc')
  );
  const [isFinanceiroOpen, setIsFinanceiroOpen] = useState(
    currentPath.startsWith('/admin/financeiro')
  );

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 ease-in-out border-r`}
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

              {/* === ESTOQUE E VENDAS === */}
              <Collapsible open={isEstoqueVendasOpen} onOpenChange={setIsEstoqueVendasOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                      <Store className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium text-sm">Estoque e Vendas</span>}
                      {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isEstoqueVendasOpen ? 'rotate-180' : ''}`} />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={`mt-1 space-y-1 ${collapsed ? "flex flex-col items-center" : "ml-4 border-l pl-2"}`}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/assistencia" end>
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <BarChart3 className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Dashboard Assistência</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/pdv" end>
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <ShoppingCart className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">PDV - Vendas</span>}
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
                                <Wrench className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Ordem de Serviço</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/pdv/configuracao-status">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <Settings className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Status de OS</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/pdv/vendas">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <Receipt className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Lista de Vendas</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/pdv/caixa">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <DollarSign className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Caixa</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/pdv/relatorios">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <BarChart3 className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Relatórios</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      
                      {/* Cadastros (sub-collapsible) */}
                      <Collapsible open={isCadastrosOpen} onOpenChange={setIsCadastrosOpen}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className={`w-full ${collapsed ? 'justify-center' : ''}`}>
                              <Folder className="h-4 w-4 flex-shrink-0" />
                              {!collapsed && <span className="font-medium text-sm">Cadastros</span>}
                              {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isCadastrosOpen ? 'rotate-180' : ''}`} />}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                  <NavLink to="/pdv/clientes">
                                    {({ isActive }) => (
                                      <div
                                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                      >
                                        <UserCircle className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                        {!collapsed && <span className="font-medium text-sm">Clientes</span>}
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
                                        <Package className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                        {!collapsed && <span className="font-medium text-sm">Produtos</span>}
                                      </div>
                                    )}
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                  <NavLink to="/pdv/marcas-modelos">
                                    {({ isActive }) => (
                                      <div
                                        className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                      >
                                        <Smartphone className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                        {!collapsed && <span className="font-medium text-sm">Marcas e Modelos</span>}
                                      </div>
                                    )}
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </div>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* === GESTÃO OPERACIONAL === */}
              <Collapsible open={isGestaoOperacionalOpen} onOpenChange={setIsGestaoOperacionalOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium text-sm">Gestão Operacional</span>}
                      {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isGestaoOperacionalOpen ? 'rotate-180' : ''}`} />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={`mt-1 space-y-1 ${collapsed ? "flex flex-col items-center" : "ml-4 border-l pl-2"}`}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/tarefas">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <CheckSquare className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
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
                                <Workflow className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Processos</span>}
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
                                <Calendar className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
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
                                <Clock className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Ponto</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* === RECURSOS HUMANOS === */}
              <Collapsible open={isRecursosHumanosOpen} onOpenChange={setIsRecursosHumanosOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                      <Users className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium text-sm">Recursos Humanos</span>}
                      {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isRecursosHumanosOpen ? 'rotate-180' : ''}`} />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={`mt-1 space-y-1 ${collapsed ? "flex flex-col items-center" : "ml-4 border-l pl-2"}`}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/treinamentos">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <GraduationCap className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Treinamentos</span>}
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
                                <Target className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
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
                                <TrendingUp className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">NPS</span>}
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
                                <Brain className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Teste DISC</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* === FINANCEIRO === */}
              <Collapsible open={isFinanceiroOpen} onOpenChange={setIsFinanceiroOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium text-sm">Financeiro</span>
                      <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isFinanceiroOpen ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={`mt-1 space-y-1 ${collapsed ? "flex flex-col items-center" : "ml-4 border-l pl-2"}`}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/financeiro">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <BarChart3 className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Dashboard</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/financeiro/contas">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <Receipt className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Contas a Pagar</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/financeiro/caixa">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <Wallet className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Caixa</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/financeiro/transacoes">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <CreditCard className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Transações</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to="/admin/financeiro/relatorios">
                            {({ isActive }) => (
                              <div
                                className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                              >
                                <FileTextIcon className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Relatórios</span>}
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
                                <FileTextIcon className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                {!collapsed && <span className="font-medium text-sm">Relatórios</span>}
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>


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
                        <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="font-medium text-sm">Estrutura Organizacional</span>}
                          {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isOrgOpen ? 'rotate-180' : ''}`} />}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className={`mt-1 space-y-1 ${collapsed ? "flex flex-col items-center" : "ml-4 border-l pl-2"}`}>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/users">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Users className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Usuários</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Briefcase className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Cargos</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Building2 className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Departamentos</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <FolderOpen className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Categorias</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Tag className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Tags</span>}
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
                        <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                          <Settings className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="font-medium text-sm">Gestão de Funcionalidades</span>}
                          {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180' : ''}`} />}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/admin/timeclock">
                                {({ isActive }) => (
                                  <div
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Clock className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Ponto Admin</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Target className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">Metas Admin</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <TrendingUp className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">NPS Admin</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Brain className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm">DISC Admin</span>}
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
                        <SidebarMenuButton className={`${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full"}`}>
                          <ClipboardList className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="font-medium text-sm">Recrutamento</span>}
                          {!collapsed && <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isRecruitmentOpen ? 'rotate-180' : ''}`} />}
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
                                    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">Formulários de Vagas</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Video className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">Entrevistas com IA</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Users className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">Banco de Talentos</span>}
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
                                    className={`flex items-center transition-colors rounded-lg ${collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full p-2 gap-2"} ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                                  >
                                    <Brain className={`${collapsed ? "h-4 w-4" : "h-4 w-4"} flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">DISC Externo</span>}
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>


                  {/* Relatórios */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/relatorios">
                        {({ isActive }) => (
                          <div
                            className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                          >
                            <BarChart3 className="h-4 w-4 flex-shrink-0" />
                            {!collapsed && <span className="font-medium text-sm">Relatórios</span>}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Integrações */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/integracoes">
                        {({ isActive }) => (
                          <div
                            className={`flex items-center transition-colors rounded-lg w-full p-2 gap-2 ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                          >
                            <Shield className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium text-sm">Integrações</span>
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