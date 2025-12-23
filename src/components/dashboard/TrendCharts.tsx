import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DashboardTrendData } from '@/hooks/useDashboardData';
import { TrendingUp } from 'lucide-react';

interface TrendChartsProps {
  data: DashboardTrendData[];
}

export function TrendCharts({ data }: TrendChartsProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-gray-300 shadow-sm">
      <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
        <CardTitle className="flex items-center gap-2 text-base md:text-xl">
          <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-blue-100 to-white border-2 border-gray-200">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
          </div>
          Tendências dos Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="vendas" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Vendas"
            />
            <Line 
              type="monotone" 
              dataKey="os" 
              stroke="#10b981" 
              strokeWidth={2}
              name="OS Criadas"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


