import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  TrendingUp,
  Brain,
  Target,
  Clock,
  Users,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  HeartPulse,
  BadgeCheck,
  CalendarCheck,
  Briefcase,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RH() {
  const navigate = useNavigate();

  const rhSections = [
    {
      title: 'Academy',
      description: 'Gerencie cursos, aulas e progresso dos colaboradores',
      icon: GraduationCap,
      path: '/treinamentos',
      color: 'text-blue-600',
    },
    {
      title: 'NPS',
      description: 'Pesquisas de satisfação e feedback interno',
      icon: TrendingUp,
      path: '/nps',
      color: 'text-green-600',
    },
    {
      title: 'Teste DISC',
      description: 'Avaliações comportamentais e perfis DISC',
      icon: Brain,
      path: '/teste-disc',
      color: 'text-purple-600',
    },
    {
      title: 'Metas',
      description: 'Acompanhamento de metas e objetivos',
      icon: Target,
      path: '/metas',
      color: 'text-orange-600',
    },
    {
      title: 'Ponto Eletrônico',
      description: 'Registro de ponto e controle de jornada',
      icon: Clock,
      path: '/ponto',
      color: 'text-indigo-600',
    },
    {
      title: 'Gestão de Ponto (Admin)',
      description: 'Monitore e gerencie registros de ponto dos funcionários',
      icon: Clock,
      path: '/admin/timeclock',
      color: 'text-indigo-700',
    },
    {
      title: 'Colaboradores',
      description: 'Dados dos colaboradores (via Usuários)',
      icon: Users,
      path: '/admin/users',
      color: 'text-slate-700',
    },
    {
      title: 'Recrutamento',
      description: 'Banco de talentos e entrevistas',
      icon: Briefcase,
      path: '/admin/talent-bank',
      color: 'text-emerald-700',
    },
    {
      title: 'Formulários de Vagas',
      description: 'Cadastro de vagas e candidaturas',
      icon: ClipboardCheck,
      path: '/admin/job-surveys',
      color: 'text-amber-700',
    },
    {
      title: 'Entrevistas',
      description: 'Agendar e avaliar entrevistas',
      icon: CalendarCheck,
      path: '/admin/interviews',
      color: 'text-indigo-700',
    },
    {
      title: 'Avaliações DISC / NPS',
      description: 'Ferramentas de avaliação e clima',
      icon: FileText,
      path: '/admin/disc',
      color: 'text-orange-600',
    },
    {
      title: 'Compliance / Documentos',
      description: 'Políticas internas e assinaturas',
      icon: ShieldCheck,
      path: '/admin/estrutura',
      color: 'text-slate-800',
    },
    {
      title: 'Benefícios',
      description: 'Gestão de benefícios e bem-estar',
      icon: HeartPulse,
      path: '/relatorios', // placeholder para definir rota final
      color: 'text-rose-600',
    },
    {
      title: 'Feedback 1:1',
      description: 'Registro de conversas e planos',
      icon: MessageCircle,
      path: '/tarefas', // placeholder para fluxo de 1:1 em tarefas
      color: 'text-cyan-700',
    },
    {
      title: 'Checklists de Onboarding',
      description: 'Passos para entrada de novos colaboradores',
      icon: BadgeCheck,
      path: '/processos', // placeholder para checklists via processos
      color: 'text-green-700',
    },
  ];

  return (
    <ModernLayout title="Recursos Humanos" subtitle="Gestão de pessoas e desenvolvimento">
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {rhSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="border-2 border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-200 cursor-pointer active:scale-[0.98] group"
                onClick={() => navigate(section.path)}
              >
                <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 md:p-2.5 rounded-lg bg-gradient-to-br ${section.color.replace('text-', 'from-').replace('-600', '-100').replace('-700', '-100').replace('-800', '-100')} to-white border-2 border-gray-200 shadow-sm`}>
                      <Icon className={`h-5 w-5 md:h-6 md:w-6 ${section.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm md:text-lg font-semibold mb-1 md:mb-2">{section.title}</CardTitle>
                      <CardDescription className="text-xs md:text-sm line-clamp-2">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </ModernLayout>
  );
}

