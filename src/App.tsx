// import { Toaster } from "@/components/ui/toaster"; // Temporariamente desabilitado - usando apenas Sonner
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeConfigProvider } from "@/contexts/ThemeConfigContext";
import { ThemeProvider } from "next-themes";
import { NotificationManager } from "@/components/NotificationManager";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionRoute } from "@/components/PermissionRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import DashboardGestao from "./pages/DashboardGestao";
import Auth from "./pages/Auth";
import ProcessView from "./pages/ProcessView";
import ProcessEdit from "./pages/ProcessEdit";
import ProcessCreate from "./pages/ProcessCreate";
import Admin from "./pages/Admin";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Processes from "./pages/Processes";
import Calendar from "./pages/Calendar";
import Integration from "./pages/Integration";
import UserProfile from "./pages/UserProfile";
import Goals from "./pages/Goals";
import TimeClock from "./pages/TimeClock";
import UserLogs from "./pages/UserLogs";
import NPS from "./pages/NPS";
import Productivity from "./pages/Productivity";
import ProcessAnalytics from "./pages/ProcessAnalytics";
import ResetPassword from "./pages/ResetPassword";
import DiscTest from "./pages/DiscTest";
// TestAuth será definido inline abaixo
import CandidateDisc from "./pages/CandidateDisc";
import CandidateDiscResult from "./pages/CandidateDiscResult";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPositions from "./pages/admin/AdminPositions";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminTags from "./pages/admin/AdminTags";
import AdminTimeClock from "./pages/admin/AdminTimeClock";
import AdminGoals from "./pages/admin/AdminGoals";
import AdminNPS from "./pages/admin/AdminNPS";
import AdminDisc from "./pages/admin/AdminDisc";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import { MarketingLayout, MarketingDashboard, MarketingCampanhas, MarketingLeads, MarketingMetricas, MarketingMetas } from "./pages/admin/marketing";
import EstruturaOrganizacional from "./pages/admin/EstruturaOrganizacional";
import CadastrosBase from "./pages/admin/CadastrosBase";
import RH from "./pages/RH";
import AdminJobSurveys from "./pages/admin/AdminJobSurveys";
import JobSurveyDetail from "./pages/admin/JobSurveyDetail";
import TalentBank from "./pages/admin/TalentBank";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminInterviews from "./pages/admin/AdminInterviews";
import InterviewEvaluation from "./pages/admin/InterviewEvaluation";
import JobApplication from "./pages/JobApplication";
import JobApplicationSteps from "./pages/JobApplicationSteps";
import JobSuccess from "./pages/JobSuccess";
import JobPortal from "./pages/JobPortal";
import JobApplicationStatus from "./pages/JobApplicationStatus";
import TrainingsIndex from "./pages/trainings/TrainingsIndex";
import { OrdensServico as AssistenciaOS, OrdemServicoForm, Clientes as AssistenciaClientes, Produtos as AssistenciaProdutos, PDV, MarcasModelos as AssistenciaMarcasModelos, ConfiguracaoStatus as AssistenciaConfiguracaoStatus } from "./pages/assistencia";
import Vendas from "./pages/pdv/Vendas";
import NovaVenda from "./pages/pdv/NovaVenda";
import Caixa from "./pages/pdv/Caixa";
import Relatorios from "./pages/pdv/Relatorios";
import ConfiguracaoCupom from "./pages/pdv/ConfiguracaoCupom";
import Configuracoes from "./pages/admin/Configuracoes";
import CupomView from "./pages/pdv/CupomView";
import AcompanharOS from "./pages/public/AcompanharOS";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ThemeConfigProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationManager>
              <TooltipProvider>
                {/* <Toaster /> Temporariamente desabilitado - usando apenas Sonner */}
                <Sonner />
                <BrowserRouter>
            <Routes>
            {/* Rotas públicas de autenticação */}
            <Route path="/login" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Rota de teste - DEVE estar antes do catch-all */}
            <Route path="/test-auth" element={
              <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1 style={{ color: 'green' }}>✅ FUNCIONANDO!</h1>
                <p>Rota /test-auth está funcionando!</p>
                <p>API: {import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api'}</p>
                <button onClick={() => fetch(`${import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api'}/health`).then(r => r.json()).then(d => alert(JSON.stringify(d))).catch(e => alert('Erro: ' + e.message))}>
                  Testar API
                </button>
              </div>
            } />
          <Route path="/candidato-disc" element={<CandidateDisc />} />
          <Route path="/disc-externo" element={<CandidateDisc />} />
          <Route path="/candidato-disc/resultado" element={<CandidateDiscResult />} />
            {/* Dashboard - acesso livre para usuários autenticados, controle interno por perfil */}
              <Route 
                path="/" 
                element={<ProtectedRoute><Index /></ProtectedRoute>} 
              />
              <Route path="/gestao" element={<PermissionRoute permission="dashboard.gestao"><DashboardGestao /></PermissionRoute>} />
              <Route path="/processos" element={<PermissionRoute permission="processos.view"><Processes /></PermissionRoute>} />
              <Route path="/processos/*" element={<PermissionRoute permission="processos.view"><Processes /></PermissionRoute>} />
              <Route path="/tarefas" element={<PermissionRoute permission="tarefas.view"><Tasks /></PermissionRoute>} />
              <Route path="/tarefas/*" element={<PermissionRoute permission="tarefas.view"><Tasks /></PermissionRoute>} />
              <Route path="/calendario" element={<PermissionRoute permission="calendario.view"><Calendar /></PermissionRoute>} />
              <Route path="/relatorios" element={<PermissionRoute permission="relatorios.geral"><Reports /></PermissionRoute>} />
              <Route path="/metricas" element={<PermissionRoute permission="metricas.view"><Reports /></PermissionRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/search" element={<PermissionRoute permission="dashboard.view"><Index /></PermissionRoute>} />
              <Route path="/notifications" element={<PermissionRoute permission="dashboard.view"><Index /></PermissionRoute>} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/processo/:processId" element={<PermissionRoute permission="processos.view"><ProcessView /></PermissionRoute>} />
              <Route path="/processo/:processId/edit" element={<PermissionRoute permission="processos.edit"><ProcessEdit /></PermissionRoute>} />
              <Route path="/processos/novo" element={<PermissionRoute permission="processos.create"><ProcessCreate /></PermissionRoute>} />
              <Route path="/processos/criar" element={<PermissionRoute permission="processos.create"><ProcessCreate /></PermissionRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin/users" element={<PermissionRoute permission="admin.users"><AdminUsers /></PermissionRoute>} />
              <Route path="/admin/positions" element={<PermissionRoute permission="admin.positions"><AdminPositions /></PermissionRoute>} />
              <Route path="/admin/departments" element={<PermissionRoute permission="admin.departments"><AdminDepartments /></PermissionRoute>} />
              <Route path="/admin/categories" element={<PermissionRoute permission="admin.config"><AdminCategories /></PermissionRoute>} />
              <Route path="/admin/tags" element={<PermissionRoute permission="admin.config"><AdminTags /></PermissionRoute>} />
              <Route path="/admin/timeclock" element={<PermissionRoute permission="admin.timeclock"><AdminTimeClock /></PermissionRoute>} />
              <Route path="/admin/goals" element={<PermissionRoute permission="rh.metas"><AdminGoals /></PermissionRoute>} />
              <Route path="/admin/nps" element={<PermissionRoute permission="admin.nps"><AdminNPS /></PermissionRoute>} />
              <Route path="/admin/disc" element={<PermissionRoute permission="admin.disc"><AdminDisc /></PermissionRoute>} />
              <Route path="/admin/financeiro/*" element={<AdminFinanceiro />} />
              <Route path="/admin/marketing" element={<MarketingLayout />}>
                <Route index element={<MarketingDashboard />} />
                <Route path="campanhas" element={<MarketingCampanhas />} />
                <Route path="leads" element={<MarketingLeads />} />
                <Route path="metricas" element={<MarketingMetricas />} />
                <Route path="metas" element={<MarketingMetas />} />
              </Route>
              <Route path="/admin/job-surveys" element={<ProtectedRoute><AdminJobSurveys /></ProtectedRoute>} />
              <Route path="/admin/job-surveys/:id" element={<ProtectedRoute><JobSurveyDetail /></ProtectedRoute>} />
              <Route path="/admin/talent-bank" element={<ProtectedRoute><TalentBank /></ProtectedRoute>} />
              <Route path="/admin/interviews" element={<ProtectedRoute><AdminInterviews /></ProtectedRoute>} />
              <Route path="/admin/interviews/evaluate/:interview_id" element={<ProtectedRoute><InterviewEvaluation /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<PermissionRoute permission="admin.logs"><AdminLogs /></PermissionRoute>} />
              <Route path="/admin/estrutura" element={<ProtectedRoute><EstruturaOrganizacional /></ProtectedRoute>} />
              <Route path="/admin/cadastros" element={<ProtectedRoute><CadastrosBase /></ProtectedRoute>} />
              <Route path="/admin/configuracoes" element={<PermissionRoute permission="admin.config"><Configuracoes /></PermissionRoute>} />
              <Route path="/rh" element={<PermissionRoute permission="rh.view"><RH /></PermissionRoute>} />
              
              {/* Public job application routes */}
              <Route path="/job-application/:surveyId" element={<JobApplication />} />
              <Route path="/vaga/:slug" element={<JobApplicationSteps />} />
              <Route path="/vaga/sucesso/:protocol" element={<JobSuccess />} />
              <Route path="/vagas" element={<JobPortal />} />
              <Route path="/candidatura/:protocol?" element={<JobApplicationStatus />} />
              <Route path="/acompanhar-candidatura/:protocol?" element={<JobApplicationStatus />} />
              
              {/* Public OS tracking route */}
              <Route path="/acompanhar-os/:id" element={<AcompanharOS />} />
              <Route path="/integracoes" element={<ProtectedRoute><Integration /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/metas" element={<PermissionRoute permission="rh.metas"><Goals /></PermissionRoute>} />
            <Route path="/ponto" element={<PermissionRoute permission="rh.ponto"><TimeClock /></PermissionRoute>} />
            <Route path="/treinamentos" element={<PermissionRoute permission="rh.treinamentos"><TrainingsIndex /></PermissionRoute>} />
            <Route path="/treinamentos/:trainingId" element={<PermissionRoute permission="rh.treinamentos"><TrainingsIndex /></PermissionRoute>} />
            <Route path="/logs" element={<ProtectedRoute><UserLogs /></ProtectedRoute>} />
            <Route path="/nps" element={<PermissionRoute permission="nps.view"><NPS /></PermissionRoute>} />
            <Route path="/teste-disc" element={<PermissionRoute permission="disc.view"><DiscTest /></PermissionRoute>} />
              <Route path="/produtos" element={<PermissionRoute permission="produtos.view"><AssistenciaProdutos /></PermissionRoute>} />
            <Route path="/productivity" element={<ProtectedRoute><Productivity /></ProtectedRoute>} />
            <Route path="/process-analytics" element={<ProtectedRoute><ProcessAnalytics /></ProtectedRoute>} />
              
              {/* PDV - Frente de Caixa */}
              <Route path="/pdv" element={<PermissionRoute permission="vendas.create"><NovaVenda /></PermissionRoute>} />
              <Route path="/pdv/nova" element={<PermissionRoute permission="vendas.create"><NovaVenda /></PermissionRoute>} />
              <Route path="/pdv/vendas" element={<PermissionRoute permission="vendas.view"><Vendas /></PermissionRoute>} />
              {/* Dashboard Assistência Técnica */}
              <Route path="/assistencia" element={<PermissionRoute permission="os.view"><PDV /></PermissionRoute>} />
              <Route path="/pdv/venda/nova" element={<PermissionRoute permission="vendas.create"><NovaVenda /></PermissionRoute>} />
              <Route path="/pdv/venda/:id" element={<PermissionRoute permission="vendas.view"><NovaVenda /></PermissionRoute>} />
              <Route path="/pdv/venda/:id/editar" element={<PermissionRoute permission="vendas.edit"><NovaVenda /></PermissionRoute>} />
              <Route path="/pdv/caixa" element={<PermissionRoute permission="caixa.view"><Caixa /></PermissionRoute>} />
              <Route 
                path="/pdv/relatorios" 
                element={
                  <PermissionRoute permission={["relatorios.vendas", "relatorios.financeiro", "relatorios.geral"]}>
                    <Relatorios />
                  </PermissionRoute>
                } 
              />
              <Route path="/pdv/configuracao-cupom" element={<PermissionRoute permission="vendas.manage"><ConfiguracaoCupom /></PermissionRoute>} />
              <Route path="/cupom/:id" element={<CupomView />} />
              {/* Rotas de OS - simplificadas para /os */}
              <Route path="/os" element={<PermissionRoute permission="os.view"><AssistenciaOS /></PermissionRoute>} />
              <Route path="/os/nova" element={<PermissionRoute permission="os.create"><OrdemServicoForm /></PermissionRoute>} />
              <Route path="/os/nova/:tab" element={<PermissionRoute permission="os.create"><OrdemServicoForm /></PermissionRoute>} />
              <Route path="/os/:id" element={<PermissionRoute permission="os.view"><OrdemServicoForm /></PermissionRoute>} />
              <Route path="/os/:id/:tab" element={<PermissionRoute permission="os.view"><OrdemServicoForm /></PermissionRoute>} />
              <Route path="/os/:id/editar" element={<PermissionRoute permission="os.edit"><OrdemServicoForm /></PermissionRoute>} />
              <Route path="/os/:id/editar/:tab" element={<PermissionRoute permission="os.edit"><OrdemServicoForm /></PermissionRoute>} />
              {/* Redirect antigo /pdv/os para /os */}
              <Route path="/pdv/os" element={<Navigate to="/os" replace />} />
              <Route path="/pdv/os/*" element={<Navigate to="/os" replace />} />
              <Route path="/pdv/clientes" element={<PermissionRoute permission="clientes.view"><AssistenciaClientes /></PermissionRoute>} />
              <Route path="/pdv/marcas-modelos" element={<PermissionRoute permission="produtos.manage"><AssistenciaMarcasModelos /></PermissionRoute>} />
              <Route path="/pdv/configuracao-status" element={<PermissionRoute permission="os.config.status"><AssistenciaConfiguracaoStatus /></PermissionRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
            </NotificationManager>
          </AuthProvider>
        </QueryClientProvider>
        </ThemeConfigProvider>
    </ThemeProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
