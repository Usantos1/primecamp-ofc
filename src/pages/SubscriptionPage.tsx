import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useReseller } from '@/hooks/useReseller';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { 
  CreditCard, 
  Crown, 
  Check, 
  AlertTriangle,
  Calendar,
  Zap
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_products: number;
  max_orders: number;
  features: string[];
  is_active: boolean;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { listPlans } = useReseller();
  const { getCompanyMetrics } = useCompanyDashboard();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const companyId = user?.company_id;

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar planos disponíveis - usando a API pública
      const response = await fetch('https://api.primecamp.cloud/api/query/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          select: '*',
          where: { is_active: true },
          orderBy: { field: 'price_monthly', ascending: true }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }

      // Carregar métricas da empresa
      if (companyId) {
        const metricsData = await getCompanyMetrics(companyId);
        if (metricsData) setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirmed = () => {
    toast.success('Assinatura ativada com sucesso!');
    setPaymentDialogOpen(false);
    loadData();
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
    return differenceInDays(new Date(metrics.subscription.expires_at), new Date());
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Assinatura</h1>
          <p className="text-gray-400">Gerencie seu plano e pagamentos</p>
        </div>

        {/* Status atual da assinatura */}
        {metrics && (
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Sua Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-gray-400 text-sm">Plano Atual</p>
                  <p className="text-white font-semibold text-lg">
                    {metrics.subscription.plan || 'Sem plano'}
                  </p>
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
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Valor</p>
                  <p className="text-green-400 font-semibold text-lg">
                    {metrics.subscription.price_monthly 
                      ? `R$ ${metrics.subscription.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {/* Alerta de vencimento */}
              {daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-500">
                      {daysUntilExpiration > 0 
                        ? `Sua assinatura expira em ${daysUntilExpiration} dias`
                        : 'Sua assinatura está vencida'
                      }
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Renove agora para continuar usando todas as funcionalidades.
                    </p>
                  </div>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Renovar Agora
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seletor de ciclo de cobrança */}
        <div className="flex justify-center">
          <div className="bg-background/50 p-1 rounded-lg inline-flex">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
            >
              Mensal
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
              className="relative"
            >
              Anual
              <Badge className="absolute -top-2 -right-2 bg-green-500 text-xs">
                -20%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Planos disponíveis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isCurrentPlan = metrics?.subscription?.plan === plan.name;
            const isPopular = index === 1; // Plano do meio é o popular

            return (
              <Card 
                key={plan.id}
                className={`relative bg-card/50 backdrop-blur border-border/50 ${
                  isPopular ? 'border-primary ring-2 ring-primary/20' : ''
                } ${isCurrentPlan ? 'border-green-500/50' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500">
                      <Check className="w-3 h-3 mr-1" />
                      Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">
                      R$ {price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-400">/{billingCycle === 'yearly' ? 'ano' : 'mês'}</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-400">
                      Economia de R$ {((plan.price_monthly * 12) - plan.price_yearly).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      Até {plan.max_users} usuários
                    </li>
                    <li className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      Até {plan.max_products?.toLocaleString()} produtos
                    </li>
                    <li className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      Até {plan.max_orders?.toLocaleString()} OS/mês
                    </li>
                    {plan.features && Array.isArray(plan.features) && plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${isCurrentPlan ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Plano Atual' : 'Assinar Agora'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Histórico de pagamentos */}
        <PaymentHistory companyId={companyId} />

        {/* Dialog de pagamento */}
        {selectedPlan && companyId && (
          <PaymentDialog
            open={paymentDialogOpen}
            onClose={() => {
              setPaymentDialogOpen(false);
              setSelectedPlan(null);
            }}
            companyId={companyId}
            amount={billingCycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly}
            planName={selectedPlan.name}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        )}
      </div>
    </ModernLayout>
  );
}

