import { useState } from "react";
import { Home, FileText, CheckSquare, Users, Calendar, Settings, Tag, BarChart3, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProcesses } from "@/hooks/useProcesses";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Processos", url: "/processos", icon: FileText },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Admin", url: "/admin", icon: Settings, adminOnly: true },
];

export function EnhancedSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { processes } = useProcesses();
  const { tasks } = useTasks();
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    processes: true,
    tasks: true
  });

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  
  const getNavClasses = (path: string) => 
    isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-r-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Group processes by category
  const processGroups = processes.reduce((acc, process) => {
    const categoryName = process.category?.name || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(process);
    return acc;
  }, {} as Record<string, typeof processes>);

  // Filter tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300",
        collapsed ? "w-16" : "w-72"
      )}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-center p-4 border-b border-sidebar-border",
          collapsed ? "px-2" : "px-6"
        )}>
          {collapsed ? (
            <div className="w-8 h-8 bg-sidebar-primary rounded-md flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">PC</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sidebar-primary rounded-md flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">PC</span>
              </div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Prime Camp</h1>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navegação Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                if (item.adminOnly && !isAdmin) return null;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-md transition-colors",
                          getNavClasses(item.url),
                          collapsed && "justify-center"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 flex-shrink-0",
                          collapsed ? "mx-auto" : ""
                        )} />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Processes Tree */}
        {!collapsed && (
          <SidebarGroup>
            <Collapsible
              open={expandedGroups.processes}
              onOpenChange={() => toggleGroup('processes')}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md p-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Processos por Categoria</span>
                  </div>
                  {expandedGroups.processes ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {Object.entries(processGroups).map(([categoryName, categoryProcesses]) => (
                      <SidebarMenuItem key={categoryName}>
                        <div className="pl-4 space-y-1">
                          <div className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide py-1">
                            📁 {categoryName}
                          </div>
                          {categoryProcesses.slice(0, 5).map((process) => (
                            <NavLink
                              key={process.id}
                              to={`/processo/${process.id}`}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md text-sm transition-colors",
                                isActive(`/processo/${process.id}`)
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70"
                              )}
                            >
                              <div className="w-2 h-2 rounded-full bg-sidebar-primary/60" />
                              <span className="truncate">{process.name}</span>
                            </NavLink>
                          ))}
                          {categoryProcesses.length > 5 && (
                            <div className="text-xs text-sidebar-foreground/50 pl-4">
                              +{categoryProcesses.length - 5} mais
                            </div>
                          )}
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Tasks Overview */}
        {!collapsed && (
          <SidebarGroup>
            <Collapsible
              open={expandedGroups.tasks}
              onOpenChange={() => toggleGroup('tasks')}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md p-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Tarefas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {pendingTasks.length}
                    </Badge>
                    {expandedGroups.tasks ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <div className="pl-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-amber-500" />
                            <span className="text-sidebar-foreground/70">Pendentes</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {pendingTasks.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-3 w-3 text-green-500" />
                            <span className="text-sidebar-foreground/70">Concluídas</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {completedTasks.length}
                          </Badge>
                        </div>
                      </div>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Collapsed state trigger */}
        {collapsed && (
          <div className="fixed bottom-4 left-4">
            <SidebarTrigger className="h-8 w-8" />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}