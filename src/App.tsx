// import { Toaster } from "@/components/ui/toaster"; // Temporariamente desabilitado - usando apenas Sonner
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { NotificationManager } from "@/components/NotificationManager";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProcessView from "./pages/ProcessView";
import ProcessEdit from "./pages/ProcessEdit";
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
import AdminJobSurveys from "./pages/admin/AdminJobSurveys";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminInterviews from "./pages/admin/AdminInterviews";
import InterviewEvaluation from "./pages/admin/InterviewEvaluation";
import JobApplication from "./pages/JobApplication";
import JobApplicationSteps from "./pages/JobApplicationSteps";
import JobSuccess from "./pages/JobSuccess";
import JobPortal from "./pages/JobPortal";
import JobApplicationStatus from "./pages/JobApplicationStatus";
import Produtos from "./pages/Produtos";
import TrainingsIndex from "./pages/trainings/TrainingsIndex";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationManager>
            <TooltipProvider>
              {/* <Toaster /> Temporariamente desabilitado - usando apenas Sonner */}
              <Sonner />
              <BrowserRouter>
            <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/candidato-disc" element={<CandidateDisc />} />
          <Route path="/disc-externo" element={<CandidateDisc />} />
          <Route path="/candidato-disc/resultado" element={<CandidateDiscResult />} />
            {/* Add import */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/processos" element={<ProtectedRoute><Processes /></ProtectedRoute>} />
              <Route path="/processos/*" element={<ProtectedRoute><Processes /></ProtectedRoute>} />
              <Route path="/tarefas" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/tarefas/*" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/metricas" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/processo/:processId" element={<ProtectedRoute><ProcessView /></ProtectedRoute>} />
              <Route path="/processo/:processId/edit" element={<ProtectedRoute><ProcessEdit /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/positions" element={<ProtectedRoute><AdminPositions /></ProtectedRoute>} />
              <Route path="/admin/departments" element={<ProtectedRoute><AdminDepartments /></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
              <Route path="/admin/tags" element={<ProtectedRoute><AdminTags /></ProtectedRoute>} />
              <Route path="/admin/timeclock" element={<ProtectedRoute><AdminTimeClock /></ProtectedRoute>} />
              <Route path="/admin/goals" element={<ProtectedRoute><AdminGoals /></ProtectedRoute>} />
              <Route path="/admin/nps" element={<ProtectedRoute><AdminNPS /></ProtectedRoute>} />
              <Route path="/admin/disc" element={<ProtectedRoute><AdminDisc /></ProtectedRoute>} />
              <Route path="/admin/job-surveys" element={<ProtectedRoute><AdminJobSurveys /></ProtectedRoute>} />
              <Route path="/admin/interviews" element={<ProtectedRoute><AdminInterviews /></ProtectedRoute>} />
              <Route path="/admin/interviews/evaluate/:interview_id" element={<ProtectedRoute><InterviewEvaluation /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
              
              {/* Public job application routes */}
              <Route path="/job-application/:surveyId" element={<JobApplication />} />
              <Route path="/vaga/:slug" element={<JobApplicationSteps />} />
              <Route path="/vaga/sucesso/:protocol" element={<JobSuccess />} />
              <Route path="/vagas" element={<JobPortal />} />
              <Route path="/candidatura/:protocol?" element={<JobApplicationStatus />} />
              <Route path="/acompanhar-candidatura/:protocol?" element={<JobApplicationStatus />} />
              <Route path="/integracoes" element={<ProtectedRoute><Integration /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
            <Route path="/ponto" element={<ProtectedRoute><TimeClock /></ProtectedRoute>} />
            <Route path="/treinamentos" element={<ProtectedRoute><TrainingsIndex /></ProtectedRoute>} />
            <Route path="/treinamentos/:trainingId" element={<ProtectedRoute><TrainingsIndex /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><UserLogs /></ProtectedRoute>} />
            <Route path="/nps" element={<ProtectedRoute><NPS /></ProtectedRoute>} />
            <Route path="/teste-disc" element={<ProtectedRoute><DiscTest /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/productivity" element={<ProtectedRoute><Productivity /></ProtectedRoute>} />
            <Route path="/process-analytics" element={<ProtectedRoute><ProcessAnalytics /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
          </NotificationManager>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
