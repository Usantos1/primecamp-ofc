import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Calendar, AlertCircle } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { usePrevisoesVendas } from '@/hooks/useFinanceiro';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PrevisoesVendas() {
  const [diasPrevisao, setDiasPrevisao] = useState<number>(30);
  
  const { data: previsoes, isLoading } = usePrevisoesVendas(diasPrevisao);
  
  if (isLoading) {
    return (
      <ModernLayout title="Previsões de Vendas" subtitle="Análise preditiva com IA">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando previsões...</p>
        </div>
      </ModernLayout>
    );
  }
  
  if (!previsoes) {
    return (
      <ModernLayout title="Previsões de Vendas" subtitle="Análise preditiva com IA">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </ModernLayout>
    );
  }
  
  // Combinar histórico e previsões
  const dadosCombinados = [
    ...previsoes.historico.map((h: any) => ({
      data: h.data,
      valor: h.valorReal,
      tipo: 'real',
    })),
    ...previsoes.previsoes.map((p: any) => ({
      data: p.data,
      valor: p.valorPrevisto,
      tipo: 'previsto',
      min: p.intervaloConfiancaMin,
      max: p.intervaloConfiancaMax,
    })),
  ];
  
  const mediaReal = previsoes.historico.length > 0
    ? previsoes.historico.reduce((sum: number, h: any) => sum + h.valorReal, 0) / previsoes.historico.length
    : 0;
  
  const mediaPrevista = previsoes.previsoes.length > 0
    ? previsoes.previsoes.reduce((sum: number, p: any) => sum + p.valorPrevisto, 0) / previsoes.previsoes.length
    : 0;
  
  const variacao = mediaReal > 0 ? ((mediaPrevista - mediaReal) / mediaReal) * 100 : 0;
  
  return (
    <ModernLayout title="Previsões de Vendas" subtitle="Análise preditiva com IA">
      <div className="flex flex-col gap-4">
        {/* Menu de Navegação */}
        <FinanceiroNavMenu />
        
        {/* Controles */}
        <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1 max-w-xs">
              <Label className="text-xs font-semibold text-muted-foreground">Dias de Previsão</Label>
              <Input
                type="number"
                min={7}
                max={90}
                value={diasPrevisao}
                onChange={(e) => setDiasPrevisao(Math.max(7, Math.min(90, parseInt(e.target.value) || 30)))}
                className="h-10 border-[3px] border-gray-400 rounded-lg"
              />
            </div>
            <Button
              onClick={() => setDiasPrevisao(30)}
              variant="outline"
              className="h-10 border-[3px] border-gray-400 rounded-lg"
            >
              Resetar
            </Button>
          </div>
        </Card>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Média Real (Histórico)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(mediaReal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {previsoes.historico.length} dias analisados
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Média Prevista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(mediaPrevista)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {diasPrevisao} dias futuros
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {variacao >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                Variação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {variacao >= 0 ? 'Aumento esperado' : 'Redução esperada'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Confiança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {previsoes.previsoes.length > 0 ? previsoes.previsoes[0].confiancaPercentual.toFixed(0) : 70}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Nível de confiança do modelo
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráfico Principal */}
        <Card className="flex-1 overflow-hidden border-[3px] border-gray-400 rounded-xl shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Previsão de Vendas</CardTitle>
            <CardDescription>
              Histórico (azul) vs Previsão (verde) com intervalo de confiança
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosCombinados}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => currencyFormatters.brl(value)}
                  labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                />
                <Legend />
                <ReferenceLine 
                  x={previsoes.historico.length > 0 ? previsoes.historico[previsoes.historico.length - 1].data : ''} 
                  stroke="#888888" 
                  strokeDasharray="5 5"
                  label="Início Previsão"
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorReal)"
                  name="Histórico Real"
                  data={previsoes.historico.map((h: any) => ({ data: h.data, valor: h.valorReal }))}
                />
                <Area 
                  type="monotone" 
                  dataKey="max" 
                  stroke="#10b981" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                  name="Máximo (Confiança)"
                  data={previsoes.previsoes.map((p: any) => ({ data: p.data, max: p.intervaloConfiancaMax }))}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrevisto)"
                  name="Previsão"
                  data={previsoes.previsoes.map((p: any) => ({ data: p.data, valor: p.valorPrevisto }))}
                />
                <Area 
                  type="monotone" 
                  dataKey="min" 
                  stroke="#10b981" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                  name="Mínimo (Confiança)"
                  data={previsoes.previsoes.map((p: any) => ({ data: p.data, min: p.intervaloConfiancaMin }))}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Aviso */}
        <Card className="border-[3px] border-yellow-400 bg-yellow-50 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Modelo de Previsão Básico
                </p>
                <p className="text-xs text-yellow-800">
                  As previsões atuais utilizam média móvel simples. Modelos mais avançados de IA serão implementados em breve para maior precisão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
