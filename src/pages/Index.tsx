import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Wrench, 
  Package, 
  UserCircle, 
  Wallet, 
  BarChart3,
  Plus,
  List,
  Receipt,
  FileText,
  Settings,
  Search,
  TrendingUp
} from 'lucide-react';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { useProdutosSupabase as useProdutos } from '@/hooks/useProdutosSupabase';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { currencyFormatters } from '@/utils/formatters';

const Index = () => {
  const navigate = useNavigate();
  const { getEstatisticas } = useOrdensServico();
  const { produtos } = useProdutos();
  const { clientes } = useClientes();

  const stats = getEstatisticas();

  // Calcular estatísticas rápidas
  const totalProdutos = produtos.length;
  const totalClientes = clientes.length;
  const osAbertas = stats.abertas;
  const osEmAndamento = stats.emAndamento;

  // Cards de acesso rápido
  const quickActions = [
    {
      title: 'Nova Venda',
      description: 'Iniciar uma nova venda',
      icon: ShoppingCart,
      path: '/pdv',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Nova OS',
      description: 'Criar ordem de serviço',
      icon: Wrench,
      path: '/pdv/os/nova',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Buscar Produto',
      description: 'Consultar produtos',
      icon: Search,
      path: '/produtos',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Buscar Cliente',
      description: 'Consultar clientes',
      icon: UserCircle,
      path: '/pdv/clientes',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  // Seções principais
  const mainSections = [
    {
      title: 'Vendas',
      icon: ShoppingCart,
      color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      items: [
        { label: 'Nova Venda', path: '/pdv', icon: Plus },
        { label: 'Lista de Vendas', path: '/pdv/vendas', icon: List },
        { label: 'Caixa', path: '/pdv/caixa', icon: Wallet },
        { label: 'Relatórios', path: '/pdv/relatorios', icon: BarChart3 },
      ],
    },
    {
      title: 'Ordem de Serviço',
      icon: Wrench,
      color: 'bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400',
      items: [
        { label: 'Nova OS', path: '/pdv/os/nova', icon: Plus },
        { label: 'Lista de OS', path: '/pdv/os', icon: List },
        { label: 'Config. Status', path: '/pdv/configuracao-status', icon: Settings },
      ],
    },
    {
      title: 'Produtos',
      icon: Package,
      color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      items: [
        { label: 'Lista de Produtos', path: '/produtos', icon: List },
        { label: 'Marcas e Modelos', path: '/pdv/marcas-modelos', icon: FileText },
      ],
    },
    {
      title: 'Clientes',
      icon: UserCircle,
      color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400',
      items: [
        { label: 'Lista de Clientes', path: '/pdv/clientes', icon: List },
        { label: 'Buscar Cliente', path: '/pdv/clientes', icon: Search },
      ],
    },
  ];

  return (
    <ModernLayout 
      title="Dashboard" 
      subtitle="Acesso rápido às principais funcionalidades"
    >
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        {/* Cards de Estatísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-95 md:active:scale-100" onClick={() => navigate('/pdv/os')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">OS Abertas</CardTitle>
              <Wrench className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold">{osAbertas}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {osEmAndamento} em andamento
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-95 md:active:scale-100" onClick={() => navigate('/produtos')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold">{totalProdutos}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Produtos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-95 md:active:scale-100" onClick={() => navigate('/pdv/clientes')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Total de Clientes</CardTitle>
              <UserCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold">{totalClientes}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Clientes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-95 md:active:scale-100" onClick={() => navigate('/pdv/caixa')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Caixa</CardTitle>
              <Wallet className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold">-</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Ver movimentações
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div>
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 px-1">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.path}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 md:active:scale-100"
                  onClick={() => navigate(action.path)}
                >
                  <CardHeader className="p-3 md:p-6">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${action.color} flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <CardTitle className="text-sm md:text-base">{action.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Seções Principais */}
        <div>
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 px-1">Acesso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {mainSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <Card key={section.title}>
                  <CardHeader className="p-3 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <SectionIcon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-sm md:text-base">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 md:space-y-2 p-3 md:p-6 pt-0">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          className={`w-full justify-start gap-2 text-xs md:text-sm h-8 md:h-10 ${section.color}`}
                          onClick={() => navigate(item.path)}
                        >
                          <ItemIcon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Button>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ModernLayout>
  );
};

export default Index;
