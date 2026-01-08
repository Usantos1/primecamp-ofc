import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Clock,
  Crown,
  Sparkles,
  Activity,
  Zap
} from 'lucide-react';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function CompanyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      case 'active': return 'bg-emerald-500 shadow-emerald-500/30';
      case 'trial': return 'bg-blue-500 shadow-blue-500/30';
      case 'past_due': return 'bg-amber-500 shadow-amber-500/30';
      case 'expired': return 'bg-red-500 shadow-red-500/30';
      default: return 'bg-gray-500 shadow-gray-500/30';
    }
  };

  const getSubscriptionStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'trial': return 'Teste Grátis';
      case 'past_due': return 'Vencida';
      case 'expired': return 'Expirada';
      default: return 'Sem assinatura';
    }
  };

  const getDaysUntilExpiration = () => {
    if (!metrics?.subscription?.expires_at) return null;
    const expiresAt = new Date(metrics.subscription.expires_at);
    if (!isValid(expiresAt)) return null;
    return differenceInDays(expiresAt, new Date());
  };

  const formatExpirationDate = () => {
    if (!metrics?.subscription?.expires_at) return 'Sem data definida';
    const expiresAt = new Date(metrics.subscription.expires_at);
    if (!isValid(expiresAt)) return 'Sem data definida';
    return format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-600/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMTZjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur rounded-xl">
              <Crown className="w-8 h-8 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{metrics.company.name}</h1>
              <p className="text-white/70">Dashboard de métricas</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Badge className={`${getSubscriptionStatusColor(metrics.subscription.status)} text-white px-4 py-2 text-sm font-semibold shadow-lg`}>
              <Activity className="w-4 h-4 mr-2" />
              {getSubscriptionStatusText(metrics.subscription.status)}
            </Badge>
            
            {metrics.subscription.plan && (
              <Badge className="bg-white/20 backdrop-blur text-white border-white/30 px-4 py-2 text-sm font-semibold">
                <Zap className="w-4 h-4 mr-2 text-yellow-300" />
                {metrics.subscription.plan}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de assinatura vencendo */}
      {daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/10 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-400 text-lg">⚠️ Atenção!</h3>
                <p className="text-gray-300">
                  {daysUntilExpiration > 0 
                    ? `Sua assinatura expira em ${daysUntilExpiration} dias. Renove para continuar usando o sistema.`
                    : 'Sua assinatura está vencida. Renove para evitar o bloqueio.'
                  }
                </p>
              </div>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                onClick={() => navigate('/assinatura')}
              >
                Renovar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-cyan-500/5 border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-300">Usuários</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.metrics.users.total}</div>
            <p className="text-sm text-blue-300/70 mt-1">
              {metrics.metrics.users.active} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-pink-500/5 border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/10 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Produtos</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.metrics.products}</div>
            <p className="text-sm text-purple-300/70 mt-1">
              cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-teal-500/5 border-emerald-500/30 hover:border-emerald-400/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-300">Vendas ({period} dias)</CardTitle>
            <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <ShoppingCart className="h-5 w-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.metrics.sales.period_count}</div>
            <p className="text-sm text-emerald-300/70 mt-1">
              R$ {metrics.metrics.sales.period_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-amber-500/5 border-orange-500/30 hover:border-orange-400/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-300">Ordens de Serviço</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.metrics.orders.period}</div>
            <p className="text-sm text-orange-300/70 mt-1">
              no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Limites do plano */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Uso do Plano
          </CardTitle>
          <CardDescription className="text-slate-400">Seu consumo em relação aos limites do plano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Usuários
              </span>
              <span className="text-white font-semibold">
                {metrics.limits.users.current} / {metrics.limits.users.max === 999999 ? '∞' : metrics.limits.users.max}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={metrics.limits.users.percentage} 
                className="h-3 bg-slate-700"
              />
              <div 
                className={`absolute inset-0 h-3 rounded-full transition-all ${
                  metrics.limits.users.percentage > 80 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}
                style={{ width: `${Math.min(metrics.limits.users.percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                Produtos
              </span>
              <span className="text-white font-semibold">
                {metrics.limits.products.current} / {metrics.limits.products.max === 999999 ? '∞' : metrics.limits.products.max}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={metrics.limits.products.percentage} 
                className="h-3 bg-slate-700"
              />
              <div 
                className={`absolute inset-0 h-3 rounded-full transition-all ${
                  metrics.limits.products.percentage > 80 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${Math.min(metrics.limits.products.percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Ordens de Serviço (mês)
              </span>
              <span className="text-white font-semibold">
                {metrics.limits.orders.current} / {metrics.limits.orders.max === 999999 ? '∞' : metrics.limits.orders.max}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={metrics.limits.orders.percentage} 
                className="h-3 bg-slate-700"
              />
              <div 
                className={`absolute inset-0 h-3 rounded-full transition-all ${
                  metrics.limits.orders.percentage > 80 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.min(metrics.limits.orders.percentage, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações da assinatura */}
      <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur border-indigo-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            Detalhes da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Plano</p>
              <p className="text-white font-bold text-lg">{metrics.subscription.plan || 'Sem plano'}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Status</p>
              <Badge className={`${getSubscriptionStatusColor(metrics.subscription.status)} text-white shadow-lg`}>
                {getSubscriptionStatusText(metrics.subscription.status)}
              </Badge>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Expira em</p>
              <p className="text-white font-bold">
                {formatExpirationDate()}
              </p>
              {daysUntilExpiration !== null && daysUntilExpiration > 0 && (
                <p className="text-emerald-400 text-sm mt-1">
                  ({daysUntilExpiration} dias restantes)
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Valor</p>
              <p className="text-emerald-400 font-bold text-lg">
                {metrics.subscription.price_monthly 
                  ? `R$ ${metrics.subscription.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
                  : 'Grátis'
                }
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg"
              onClick={() => navigate('/assinatura')}
            >
              <Crown className="w-4 h-4 mr-2" />
              Gerenciar Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
