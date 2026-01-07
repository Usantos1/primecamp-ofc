import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Building2,
  Clock
} from 'lucide-react';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CompanyDashboard() {
  const { user } = useAuth();
  const { loading, error, getCompanyMetrics, getSalesChart, getOrdersByStatus } = useCompanyDashboard();
  const [metrics, setMetrics] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [period, setPeriod] = useState(30);

  const companyId = user?.company_id;

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, period]);

  const loadData = async () => {
    if (!companyId) return;
    
    const [metricsData, sales, orders] = await Promise.all([
      getCompanyMetrics(companyId, period),
      getSalesChart(companyId, period),
      getOrdersByStatus(companyId)
    ]);

    if (metricsData) setMetrics(metricsData);
    if (sales) setSalesData(sales);
    if (orders) setOrdersData(orders);
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'trial': return 'Período de Teste';
      case 'past_due': return 'Vencida';
      case 'expired': return 'Expirada';
      default: return 'Sem assinatura';
    }
  };

  const getDaysUntilExpiration = () => {
    if (!metrics?.subscription?.expires_at) return null;
    const expiresAt = new Date(metrics.subscription.expires_at);
    return differenceInDays(expiresAt, new Date());
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-500/10">
        <CardContent className="pt-6">
          <p className="text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header com informações da assinatura */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{metrics.company.name}</h1>
          <p className="text-gray-400">Dashboard de métricas</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className={`${getSubscriptionStatusColor(metrics.subscription.status)} text-white`}>
            {getSubscriptionStatusText(metrics.subscription.status)}
          </Badge>
          
          {metrics.subscription.plan && (
            <Badge variant="outline" className="border-primary text-primary">
              Plano {metrics.subscription.plan}
            </Badge>
          )}

          {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
            <Badge className="bg-yellow-500 text-black">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Expira em {daysUntilExpiration} dias
            </Badge>
          )}
        </div>
      </div>

      {/* Alerta de assinatura vencendo */}
      {daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-500">Atenção!</h3>
                <p className="text-gray-300">
                  {daysUntilExpiration > 0 
                    ? `Sua assinatura expira em ${daysUntilExpiration} dias. Renove para continuar usando o sistema.`
                    : 'Sua assinatura está vencida. Renove para evitar o bloqueio.'
                  }
                </p>
              </div>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                Renovar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Usuários</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.metrics.users.total}</div>
            <p className="text-xs text-gray-400 mt-1">
              {metrics.metrics.users.active} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Produtos</CardTitle>
            <Package className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.metrics.products}</div>
            <p className="text-xs text-gray-400 mt-1">
              cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Vendas ({period} dias)</CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.metrics.sales.period_count}</div>
            <p className="text-xs text-gray-400 mt-1">
              R$ {metrics.metrics.sales.period_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Ordens de Serviço</CardTitle>
            <Clock className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.metrics.orders.period}</div>
            <p className="text-xs text-gray-400 mt-1">
              no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Limites do plano */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Uso do Plano
          </CardTitle>
          <CardDescription>Seu consumo em relação aos limites do plano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Usuários</span>
              <span className="text-white">
                {metrics.limits.users.current} / {metrics.limits.users.max === 999999 ? '∞' : metrics.limits.users.max}
              </span>
            </div>
            <Progress 
              value={metrics.limits.users.percentage} 
              className={`h-2 ${metrics.limits.users.percentage > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-blue-500'}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Produtos</span>
              <span className="text-white">
                {metrics.limits.products.current} / {metrics.limits.products.max === 999999 ? '∞' : metrics.limits.products.max}
              </span>
            </div>
            <Progress 
              value={metrics.limits.products.percentage} 
              className={`h-2 ${metrics.limits.products.percentage > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-purple-500'}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Ordens de Serviço (mês)</span>
              <span className="text-white">
                {metrics.limits.orders.current} / {metrics.limits.orders.max === 999999 ? '∞' : metrics.limits.orders.max}
              </span>
            </div>
            <Progress 
              value={metrics.limits.orders.percentage} 
              className={`h-2 ${metrics.limits.orders.percentage > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ordens por status */}
      {ordersData.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-white">Ordens por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {ordersData.map((item: any) => (
                <div 
                  key={item.status} 
                  className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-lg"
                >
                  <span className={`w-3 h-3 rounded-full ${
                    item.status === 'concluido' ? 'bg-green-500' :
                    item.status === 'em_andamento' ? 'bg-blue-500' :
                    item.status === 'aguardando' ? 'bg-yellow-500' :
                    item.status === 'cancelado' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></span>
                  <span className="text-gray-400 capitalize">{item.status?.replace('_', ' ')}</span>
                  <span className="font-bold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações da assinatura */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Detalhes da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Plano</p>
              <p className="text-white font-semibold">{metrics.subscription.plan || 'Sem plano'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <Badge className={getSubscriptionStatusColor(metrics.subscription.status)}>
                {getSubscriptionStatusText(metrics.subscription.status)}
              </Badge>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Expira em</p>
              <p className="text-white font-semibold">
                {metrics.subscription.expires_at 
                  ? format(new Date(metrics.subscription.expires_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Sem data definida'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

