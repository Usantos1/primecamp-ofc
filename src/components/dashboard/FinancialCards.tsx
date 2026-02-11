import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Wallet, ShoppingCart, Wrench } from 'lucide-react';
import { DashboardFinancialData } from '@/hooks/useDashboardData';
import { currencyFormatters } from '@/utils/formatters';
import type { DashboardExecutivo } from '@/hooks/useFinanceiro';

interface FinancialCardsProps {
  data: DashboardFinancialData;
  /** KPIs do /financeiro (Receita Total, PDV, OS, Ticket) - quando preenchido, usa dados reais do financeiro */
  financeiroKpis?: DashboardExecutivo['kpis'];
  /** Exibir valores em R$ (false = ocultar como em bancos) */
  valuesVisible?: boolean;
  /** Renderizar sem grid próprio (para colocar 4 + 2 alertas na mesma linha de 6) */
  inline?: boolean;
  /** Cards mais compactos (menos largos) */
  compact?: boolean;
}

const MASKED_VALUE = 'R$ •••••••';
const STORAGE_KEY = 'primecamp_dashboard_values_visible';

export function getStoredValuesVisible(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== 'false';
  } catch {
    return true;
  }
}

export function setStoredValuesVisible(visible: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(visible));
  } catch {}
}

export function FinancialCards({ data, financeiroKpis, valuesVisible = true, inline = false, compact = false }: FinancialCardsProps) {
  const cards = financeiroKpis
    ? (() => {
        const total = financeiroKpis.quantidadePDV + financeiroKpis.quantidadeOS;
        const pctPDV = financeiroKpis.totalGeral > 0 ? ((financeiroKpis.totalPDV / financeiroKpis.totalGeral) * 100).toFixed(1) : '0';
        const pctOS = financeiroKpis.totalGeral > 0 ? ((financeiroKpis.totalOS / financeiroKpis.totalGeral) * 100).toFixed(1) : '0';
        return [
          {
            title: 'Receita Total',
            value: currencyFormatters.brl(financeiroKpis.totalGeral),
            subtitle: `${total} vendas`,
            icon: DollarSign,
            color: 'bg-green-500',
          },
          {
            title: 'Vendas PDV',
            value: currencyFormatters.brl(financeiroKpis.totalPDV),
            subtitle: `${financeiroKpis.quantidadePDV} vendas (${pctPDV}%)`,
            icon: ShoppingCart,
            color: 'bg-blue-500',
          },
          {
            title: 'Vendas OS',
            value: currencyFormatters.brl(financeiroKpis.totalOS),
            subtitle: `${financeiroKpis.quantidadeOS} vendas (${pctOS}%)`,
            icon: Wrench,
            color: 'bg-emerald-500',
          },
          {
            title: 'Ticket Médio',
            value: currencyFormatters.brl((financeiroKpis.ticketMedioPDV + financeiroKpis.ticketMedioOS) / 2),
            subtitle: `PDV: ${currencyFormatters.brl(financeiroKpis.ticketMedioPDV)} | OS: ${currencyFormatters.brl(financeiroKpis.ticketMedioOS)}`,
            icon: TrendingUp,
            color: 'bg-purple-500',
          },
        ];
      })()
    : [
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

  const content = cards.map((card) => {
    const Icon = card.icon;
    const displayValue = valuesVisible ? card.value : MASKED_VALUE;
    return (
      <Card
        key={card.title}
        className={`border-2 border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-all min-w-0 ${compact ? 'py-1 px-2' : ''}`}
      >
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? 'pb-1 pt-2 px-2' : 'pb-2 pt-3 px-3 sm:px-4'}`}>
          <CardTitle className={`font-semibold flex items-center gap-1 sm:gap-1.5 min-w-0 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
            <span className={`rounded-lg flex items-center justify-center text-white flex-shrink-0 ${card.color} ${compact ? 'h-6 w-6 sm:h-7 sm:w-7' : 'h-8 w-8 sm:h-9 sm:w-9'}`}>
              <Icon className={compact ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} />
            </span>
            <span className="truncate">{card.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'px-2 pb-2 pt-0' : 'px-3 sm:px-4 pb-3'}>
          <div className={`font-bold tabular-nums ${compact ? 'text-sm sm:text-base' : 'text-lg sm:text-xl md:text-2xl'}`}>{displayValue}</div>
          <p className={`text-muted-foreground mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>{card.subtitle}</p>
        </CardContent>
      </Card>
    );
  });

  if (inline) {
    return <>{content}</>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {content}
    </div>
  );
}


