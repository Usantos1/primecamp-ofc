import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Smartphone,
  Package,
  UserCircle,
  Wrench,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileCog,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Tag,
  Clock,
  BarChart2,
  FileText,
  Activity,
  ListChecks
} from 'lucide-react';
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
    {
      title: 'Clientes',
      description: 'Cadastro de clientes e fornecedores',
      icon: UserCircle,
      path: '/pdv/clientes',
      color: 'text-purple-600',
    },
    {
      title: 'Nova OS',
      description: 'Criar nova Ordem de Serviço',
      icon: Wrench,
      path: '/pdv/os/nova',
      color: 'text-orange-600',
    },
    {
      title: 'Lista de OS',
      description: 'Consultar ordens de serviço',
      icon: ClipboardList,
      path: '/pdv/os',
      color: 'text-amber-600',
    },
    {
      title: 'Nova Venda',
      description: 'Criar nova venda',
      icon: ShoppingCart,
      path: '/pdv/venda/nova',
      color: 'text-pink-600',
    },
    {
      title: 'Lista de Vendas',
      description: 'Consultar vendas',
      icon: ListChecks,
      path: '/pdv/vendas',
      color: 'text-indigo-600',
    },
    {
      title: 'Caixa',
      description: 'Movimentações e fechamento',
      icon: CreditCard,
      path: '/pdv/caixa',
      color: 'text-teal-600',
    },
    {
      title: 'Relatórios PDV',
      description: 'Indicadores e listagens',
      icon: FileBarChart,
      path: '/pdv/relatorios',
      color: 'text-blue-500',
    },
    {
      title: 'Config. Cupom',
      description: 'Dados do cupom fiscal',
      icon: FileCog,
      path: '/pdv/configuracao-cupom',
      color: 'text-gray-700',
    },
    {
      title: 'Config. Status OS',
      description: 'Fluxo e status de OS',
      icon: Settings,
      path: '/pdv/configuracao-status',
      color: 'text-gray-700',
    },
    {
      title: 'Dashboard Assistência',
      description: 'Visão geral da assistência',
      icon: LayoutDashboard,
      path: '/assistencia',
      color: 'text-emerald-600',
    },
    {
      title: 'PDV (Venda rápida)',
      description: 'Atalho para o PDV',
      icon: ShoppingCart,
      path: '/pdv',
      color: 'text-emerald-700',
    },
    {
      title: 'Admin Usuários',
      description: 'Gerenciar usuários e permissões',
      icon: ShieldCheck,
      path: '/admin/users',
      color: 'text-sky-700',
    },
    {
      title: 'Admin Cargos',
      description: 'Gerenciar cargos',
      icon: Building2,
      path: '/admin/positions',
      color: 'text-sky-600',
    },
    {
      title: 'Admin Departamentos',
      description: 'Gerenciar departamentos',
      icon: Building2,
      path: '/admin/departments',
      color: 'text-sky-500',
    },
    {
      title: 'Admin Categorias',
      description: 'Gerenciar categorias',
      icon: Tag,
      path: '/admin/categories',
      color: 'text-fuchsia-600',
    },
    {
      title: 'Admin Tags',
      description: 'Gerenciar tags',
      icon: Tag,
      path: '/admin/tags',
      color: 'text-fuchsia-700',
    },
    {
      title: 'Ponto',
      description: 'Registro de ponto',
      icon: Clock,
      path: '/ponto',
      color: 'text-amber-700',
    },
    {
      title: 'Metas',
      description: 'Gestão de metas',
      icon: BarChart2,
      path: '/metas',
      color: 'text-lime-700',
    },
    {
      title: 'NPS',
      description: 'Pesquisa de satisfação',
      icon: FileText,
      path: '/nps',
      color: 'text-rose-700',
    },
    {
      title: 'Teste DISC',
      description: 'Avaliação DISC',
      icon: Activity,
      path: '/teste-disc',
      color: 'text-red-600',
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

