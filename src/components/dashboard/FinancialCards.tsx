import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Wallet, ShoppingCart } from 'lucide-react';
import { DashboardFinancialData } from '@/hooks/useDashboardData';
import { currencyFormatters } from '@/utils/formatters';

interface FinancialCardsProps {
  data: DashboardFinancialData;
}

export function FinancialCards({ data }: FinancialCardsProps) {
  const cards = [
    {
      title: 'Faturamento do Dia',
      value: currencyFormatters.brl(data.faturamentoDia),
      subtitle: `${data.vendasHoje} vendas`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Faturamento do Mês',
      value: currencyFormatters.brl(data.faturamentoMes),
      subtitle: `${data.vendasMes} vendas`,
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      title: 'Ticket Médio',
      value: currencyFormatters.brl(data.ticketMedio),
      subtitle: 'Média por venda',
      icon: ShoppingCart,
      color: 'bg-purple-500',
    },
    {
      title: 'Total em Caixa',
      value: currencyFormatters.brl(data.totalCaixa),
      subtitle: 'Valor disponível',
      icon: Wallet,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="border-2 border-gray-300 shadow-sm hover:shadow-md transition-all"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl md:text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

