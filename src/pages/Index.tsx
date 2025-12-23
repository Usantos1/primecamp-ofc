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
      <div className="space-y-6 px-1 md:px-0">
        {/* Cards de Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { title: 'OS Abertas', value: osAbertas, subtitle: `${osEmAndamento} em andamento`, icon: Wrench, color: 'bg-emerald-500' },
            { title: 'Total de Produtos', value: totalProdutos, subtitle: 'Produtos cadastrados', icon: Package, color: 'bg-blue-500' },
            { title: 'Total de Clientes', value: totalClientes, subtitle: 'Clientes cadastrados', icon: UserCircle, color: 'bg-orange-500' },
            { title: 'Caixa', value: '-', subtitle: 'Ver movimentações', icon: Wallet, color: 'bg-purple-500' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all bg-white/90 cursor-pointer active:scale-[0.99] md:active:scale-100"
                onClick={() => {
                  if (card.title === 'OS Abertas') navigate('/pdv/os');
                  if (card.title === 'Total de Produtos') navigate('/produtos');
                  if (card.title === 'Total de Clientes') navigate('/pdv/clientes');
                  if (card.title === 'Caixa') navigate('/pdv/caixa');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${card.color} bg-opacity-90`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-2xl font-bold">{card.value}</div>
                  <CardDescription className="text-xs mt-1">{card.subtitle}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold px-1">Ações Rápidas</h2>
          <Card className="border-2 border-gray-200 rounded-xl shadow-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardDescription className="text-xs">Criação e consultas frequentes</CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="h-11 text-xs md:text-sm border-2 border-gray-200 justify-start rounded-lg hover:shadow-md"
                    onClick={() => navigate(action.path)}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{action.title}</span>
                      <span className="text-[11px] text-muted-foreground">{action.description}</span>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Seções Principais */}
        <div className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold px-1">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {mainSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <Card key={section.title} className="border-2 border-gray-200 rounded-xl shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <SectionIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-sm md:text-base font-semibold">{section.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">Atalhos do módulo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-4 pt-0">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          className={`w-full justify-start gap-2 text-xs md:text-sm h-9 md:h-10 rounded-lg hover:bg-muted/60 ${section.color}`}
                          onClick={() => navigate(item.path)}
                        >
                          <ItemIcon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
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
