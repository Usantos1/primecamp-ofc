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
      title: 'Job Surveys',
      description: 'Pesquisas de vaga e aplicações',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rhSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.path}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => navigate(section.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${section.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">{section.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </ModernLayout>
  );
}

