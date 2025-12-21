import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, Building2, FolderOpen, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EstruturaOrganizacional() {
  const navigate = useNavigate();

  const estruturaSections = [
    {
      title: 'Usuários',
      description: 'Gerencie usuários e permissões do sistema',
      icon: Users,
      path: '/admin/users',
      color: 'text-blue-600',
    },
    {
      title: 'Cargos',
      description: 'Configure cargos e hierarquias organizacionais',
      icon: Briefcase,
      path: '/admin/positions',
      color: 'text-purple-600',
    },
    {
      title: 'Departamentos',
      description: 'Organize a estrutura departamental',
      icon: Building2,
      path: '/admin/departments',
      color: 'text-green-600',
    },
    {
      title: 'Categorias',
      description: 'Organize tarefas e processos com categorias',
      icon: FolderOpen,
      path: '/admin/categories',
      color: 'text-orange-600',
    },
    {
      title: 'Tags',
      description: 'Crie e gerencie tags para classificação',
      icon: Tag,
      path: '/admin/tags',
      color: 'text-pink-600',
    },
  ];

  return (
    <ModernLayout title="Estrutura Organizacional" subtitle="Configure a organização da empresa">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {estruturaSections.map((section) => {
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

