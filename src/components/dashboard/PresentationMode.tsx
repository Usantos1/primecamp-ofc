import { Card, CardContent } from '@/components/ui/card';
import { FinancialCards } from './FinancialCards';
import { OSStatusCards } from './OSStatusCards';
import { AlertCards } from './AlertCards';
import { TrendCharts } from './TrendCharts';
import { DashboardFinancialData, DashboardOSData, DashboardAlerts, DashboardTrendData } from '@/hooks/useDashboardData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PresentationModeProps {
  financialData: DashboardFinancialData;
  osData: DashboardOSData;
  alerts: DashboardAlerts;
  trendData: DashboardTrendData[];
}

export function PresentationMode({ financialData, osData, alerts, trendData }: PresentationModeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com data/hora */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Dashboard - PRIME CAMP
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-base md:text-lg text-gray-500">
            {format(new Date(), "HH:mm", { locale: ptBR })}h
          </p>
        </div>

        {/* Cards Financeiros */}
        <FinancialCards data={financialData} />

        {/* Status de OS */}
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Ordens de Serviço</h2>
            <OSStatusCards data={osData} />
          </CardContent>
        </Card>

        {/* Alertas */}
        {alerts && (alerts.osParadas > 0 || alerts.estoqueBaixo > 0 || alerts.osSemAtualizacao > 0) && (
          <AlertCards alerts={alerts} />
        )}

        {/* Gráficos de Tendência */}
        {trendData.length > 0 && <TrendCharts data={trendData} />}
      </div>
    </div>
  );
}

