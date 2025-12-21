import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Package, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CadastrosBase() {
  const navigate = useNavigate();

  const cadastrosSections = [
    {
      title: 'Marcas e Modelos',
      description: 'Gerencie marcas e modelos de aparelhos',
      icon: Smartphone,
      path: '/pdv/marcas-modelos',
      color: 'text-blue-600',
    },
    {
      title: 'Produtos',
      description: 'Cadastro de produtos e serviços',
      icon: Package,
      path: '/produtos',
      color: 'text-green-600',
    },
    {
      title: 'Clientes',
      description: 'Cadastro de clientes e fornecedores',
      icon: UserCircle,
      path: '/pdv/clientes',
      color: 'text-purple-600',
    },
  ];

  return (
    <ModernLayout title="Cadastros Base" subtitle="Configurações e cadastros fundamentais">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cadastrosSections.map((section) => {
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

