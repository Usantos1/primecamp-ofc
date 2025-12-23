import { useState, useEffect } from 'react';
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
  Settings,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { FinancialCards } from '@/components/dashboard/FinancialCards';
import { OSStatusCards } from '@/components/dashboard/OSStatusCards';
import { AlertCards } from '@/components/dashboard/AlertCards';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { PresentationMode } from '@/components/dashboard/PresentationMode';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, profile, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { financialData, osData, alerts, trendData, loading: dataLoading } = useDashboardData();
  const { config, loading: configLoading } = useDashboardConfig();
  const { getEstatisticas } = useOrdensServico();

  const stats = getEstatisticas();

  // Verificar se é gestor/admin (só verifica se não estiver carregando)
  const isGestor = !permissionsLoading && (isAdmin || hasPermission('admin.view') || hasPermission('financeiro.view'));

  // Se modo apresentação está ativo e é gestor, mostrar modo apresentação
  if (config.presentationMode && isGestor && financialData && osData && alerts) {
    return (
      <PresentationMode
        financialData={financialData}
        osData={osData}
        alerts={alerts}
        trendData={trendData}
      />
    );
  }

  // Cards de acesso rápido (disponível para todos)
  const quickActions = [
    {
      title: 'Nova Venda',
      description: 'Iniciar uma nova venda',
      icon: ShoppingCart,
      path: '/pdv',
      permission: 'vendas.create',
    },
    {
      title: 'Nova OS',
      description: 'Criar ordem de serviço',
      icon: Wrench,
      path: '/pdv/os/nova',
      permission: 'os.create',
    },
    {
      title: 'Buscar Produto',
      description: 'Consultar produtos',
      icon: Search,
      path: '/produtos',
      permission: 'produtos.view',
    },
    {
      title: 'Buscar Cliente',
      description: 'Consultar clientes',
      icon: UserCircle,
      path: '/pdv/clientes',
      permission: 'clientes.view',
    },
  ].filter(action => !action.permission || (permissionsLoading ? false : hasPermission(action.permission)));

  // Seções principais (disponível para todos)
  const mainSections = [
    {
      title: 'Vendas',
      icon: ShoppingCart,
      color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      items: [
        { label: 'Nova Venda', path: '/pdv', icon: Plus, permission: 'vendas.create' },
        { label: 'Lista de Vendas', path: '/pdv/vendas', icon: List, permission: 'vendas.view' },
        { label: 'Caixa', path: '/pdv/caixa', icon: Wallet, permission: 'caixa.view' },
        { label: 'Relatórios', path: '/pdv/relatorios', icon: BarChart3, permission: 'relatorios.view' },
      ].filter(item => !item.permission || (permissionsLoading ? false : hasPermission(item.permission))),
    },
    {
      title: 'Ordem de Serviço',
      icon: Wrench,
      color: 'bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400',
      items: [
        { label: 'Nova OS', path: '/pdv/os/nova', icon: Plus, permission: 'os.create' },
        { label: 'Lista de OS', path: '/pdv/os', icon: List, permission: 'os.view' },
        { label: 'Config. Status', path: '/pdv/configuracao-status', icon: Settings, permission: 'os.config' },
      ].filter(item => !item.permission || (permissionsLoading ? false : hasPermission(item.permission))),
    },
    {
      title: 'Produtos',
      icon: Package,
      color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      items: [
        { label: 'Lista de Produtos', path: '/produtos', icon: List, permission: 'produtos.view' },
        { label: 'Marcas e Modelos', path: '/pdv/marcas-modelos', icon: Settings, permission: 'produtos.view' },
      ].filter(item => !item.permission || (permissionsLoading ? false : hasPermission(item.permission))),
    },
    {
      title: 'Clientes',
      icon: UserCircle,
      color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400',
      items: [
        { label: 'Lista de Clientes', path: '/pdv/clientes', icon: List, permission: 'clientes.view' },
        { label: 'Buscar Cliente', path: '/pdv/clientes', icon: Search, permission: 'clientes.view' },
      ].filter(item => !item.permission || (permissionsLoading ? false : hasPermission(item.permission))),
    },
  ].filter(section => section.items.length > 0);

  // Widgets habilitados ordenados
  const enabledWidgets = config.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  if (authLoading || permissionsLoading || configLoading || dataLoading) {
    return (
      <ModernLayout title="Dashboard" subtitle="Carregando...">
        <LoadingSkeleton type="cards" count={4} />
      </ModernLayout>
    );
  }

  return (
    <ModernLayout 
      title="Dashboard" 
      subtitle={isGestor ? "Visão geral e gestão" : "Acesso rápido às principais funcionalidades"}
    >
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">

        {/* Renderizar widgets conforme configuração */}
        {enabledWidgets.map((widget) => {
          switch (widget.id) {
            case 'financial-cards':
              if (!isGestor || !financialData) return null;
              return (
                <div key={widget.id}>
                  <h2 className="text-base md:text-lg font-semibold px-1 mb-3">Indicadores Financeiros</h2>
                  <FinancialCards data={financialData} />
                </div>
              );

            case 'os-status':
              if (!osData) return null;
              return (
                <div key={widget.id}>
                  <h2 className="text-base md:text-lg font-semibold px-1 mb-3">Ordens de Serviço</h2>
                  <OSStatusCards data={osData} showValues={isGestor} />
                </div>
              );

            case 'alerts':
              if (!isGestor || !alerts) return null;
              return (
                <div key={widget.id}>
                  <h2 className="text-base md:text-lg font-semibold px-1 mb-3">Alertas de Gestão</h2>
                  <AlertCards alerts={alerts} />
                </div>
              );

            case 'trend-charts':
              if (!isGestor || trendData.length === 0) return null;
              return (
                <div key={widget.id}>
                  <TrendCharts data={trendData} />
                </div>
              );

            case 'quick-actions':
              if (quickActions.length === 0) return null;
              return (
                <div key={widget.id}>
                  <h2 className="text-base md:text-lg font-semibold px-1 mb-3">Ações Rápidas</h2>
                  <Card className="border-2 border-gray-300 shadow-sm">
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
                            className="h-11 text-xs md:text-sm border-2 border-gray-300 justify-start rounded-lg hover:shadow-md"
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
              );

            case 'main-sections':
              if (mainSections.length === 0) return null;
              return (
                <div key={widget.id}>
                  <h2 className="text-base md:text-lg font-semibold px-1 mb-3">Acesso Rápido</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {mainSections.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <Card key={section.title} className="border-2 border-gray-300 shadow-sm">
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
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Modal de Configuração */}
      {isGestor && (
        <DashboardConfigModal
          open={showConfigModal}
          onOpenChange={setShowConfigModal}
        />
      )}
    </ModernLayout>
  );
};

export default Index;
