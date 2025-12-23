import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, TrendingUp, Brain, Target, Clock } from 'lucide-react';
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

