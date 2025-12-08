import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ModernLayout } from "@/components/ModernLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Settings, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  Activity,
  Building2,
  Briefcase,
  FolderOpen,
  Tag,
  ArrowRight,
  Video,
  FileText
} from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
        return;
      }
      if (!isAdmin) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/");
        return;
      }
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const adminSections = [
    {
      title: "Gestão de Usuários",
      description: "Gerencie usuários, departamentos e permissões",
      icon: Users,
      path: "/admin/users",
      color: "text-blue-600"
    },
    {
      title: "Gestão de Cargos",
      description: "Configure cargos e hierarquias organizacionais",
      icon: Briefcase,
      path: "/admin/positions",
      color: "text-purple-600"
    },
    {
      title: "Gestão de Departamentos",
      description: "Organize a estrutura departamental",
      icon: Building2,
      path: "/admin/departments",
      color: "text-green-600"
    },
    {
      title: "Gestão de Categorias",
      description: "Organize tarefas e processos com categorias",
      icon: FolderOpen,
      path: "/admin/categories",
      color: "text-orange-600"
    },
    {
      title: "Gestão de Tags",
      description: "Crie e gerencie tags para classificação",
      icon: Tag,
      path: "/admin/tags",
      color: "text-pink-600"
    },
    {
      title: "Gestão de Ponto",
      description: "Monitore registros de ponto dos funcionários",
      icon: Clock,
      path: "/admin/timeclock",
      color: "text-indigo-600"
    },
    {
      title: "Gestão de Metas",
      description: "Monitore metas de todos os usuários",
      icon: Target,
      path: "/admin/goals",
      color: "text-red-600"
    },
    {
      title: "Gestão de NPS",
      description: "Gerencie pesquisas NPS e visualize resultados",
      icon: TrendingUp,
      path: "/admin/nps",
      color: "text-emerald-600"
    },
    {
      title: "Gestão de Testes DISC",
      description: "Monitore e gerencie testes DISC dos usuários",
      icon: Brain,
      path: "/admin/disc",
      color: "text-violet-600"
    },
    {
      title: "Formulários de Vagas",
      description: "Gerencie formulários de candidatura e vagas",
      icon: FileText,
      path: "/admin/job-surveys",
      color: "text-blue-600"
    },
    {
      title: "Entrevistas com IA",
      description: "Sistema inteligente de entrevistas online e presenciais",
      icon: Video,
      path: "/admin/interviews",
      color: "text-purple-600"
    },
    {
      title: "Logs do Sistema",
      description: "Visualize e monitore atividades do sistema",
      icon: Activity,
      path: "/admin/logs",
      color: "text-gray-600"
    }
  ];

  return (
    <ModernLayout
      title="Painel Administrativo"
      subtitle="Central de administração e configurações do sistema"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Usuários registrados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Processos em execução</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Aguardando execução</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atividade Hoje</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Ações realizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adminSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Card key={section.path} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <IconComponent className={`h-8 w-8 ${section.color}`} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="mb-4">
                    {section.description}
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => navigate(section.path)}
                  >
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ModernLayout>
  );
}

