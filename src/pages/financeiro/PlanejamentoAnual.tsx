import { useState, useMemo, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DollarSign, Calendar, Save, TrendingUp, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { usePlanejamentoAnual, useSalvarPlanejamentoAnual } from '@/hooks/useFinanceiro';
import { toast } from 'sonner';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PlanejamentoAnual() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState<number>(anoAtual);
  
  const { data: planejamento, isLoading } = usePlanejamentoAnual(ano);
  const salvarPlanejamento = useSalvarPlanejamentoAnual();
  
  const [receitaPlanejada, setReceitaPlanejada] = useState<number>(0);
  const [despesasPlanejadas, setDespesasPlanejadas] = useState<number>(0);
  const [metaMensal, setMetaMensal] = useState<Record<number, number>>({});
  const [observacoes, setObservacoes] = useState<string>('');
  
  // Carregar dados quando planejamento carregar
  useEffect(() => {
    if (planejamento) {
      setReceitaPlanejada(parseFloat(planejamento.receita_planejada || 0));
      setDespesasPlanejadas(parseFloat(planejamento.despesas_planejadas || 0));
      setObservacoes(planejamento.observacoes || '');
      if (planejamento.meta_mensal) {
        const metas = typeof planejamento.meta_mensal === 'string' 
          ? JSON.parse(planejamento.meta_mensal) 
          : planejamento.meta_mensal;
        setMetaMensal(metas || {});
      }
    } else {
      // Resetar quando não há planejamento
      setReceitaPlanejada(0);
      setDespesasPlanejadas(0);
      setMetaMensal({});
      setObservacoes('');
    }
  }, [planejamento]);
  
  const lucroEsperado = receitaPlanejada - despesasPlanejadas;
  const margemEsperada = receitaPlanejada > 0 ? (lucroEsperado / receitaPlanejada) * 100 : 0;
  
  const totalMetaMensal = Object.values(metaMensal).reduce((sum, val) => sum + (parseFloat(val as any) || 0), 0);
  const diferencaMeta = receitaPlanejada - totalMetaMensal;
  
  const handleSalvar = async () => {
    try {
      await salvarPlanejamento.mutateAsync({
        ano,
        dados: {
          receita_planejada: receitaPlanejada,
          despesas_planejadas: despesasPlanejadas,
          meta_mensal: metaMensal,
          observacoes: observacoes || null,
        },
      });
      toast.success('Planejamento salvo com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar planejamento');
    }
  };
  
  const updateMetaMensal = (mes: number, valor: number) => {
    setMetaMensal(prev => ({
      ...prev,
      [mes]: valor,
    }));
  };
  
  if (isLoading) {
    return (
      <ModernLayout title="Planejamento Anual" subtitle="Planeje suas metas financeiras para o ano">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando planejamento...</p>
        </div>
      </ModernLayout>
    );
  }
  
  return (
    <ModernLayout title="Planejamento Anual" subtitle="Planeje suas metas financeiras para o ano">
      <div className="flex flex-col gap-4">
        {/* Menu de Navegação */}
        <FinanceiroNavMenu />
        
        {/* Controles */}
        <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1 max-w-xs">
              <Label className="text-xs font-semibold text-muted-foreground">Ano</Label>
              <Input
                type="number"
                min={2020}
                max={2100}
                value={ano}
                onChange={(e) => setAno(Math.max(2020, Math.min(2100, parseInt(e.target.value) || anoAtual)))}
                className="h-10 border-[3px] border-gray-400 rounded-lg"
              />
            </div>
            <Button
              onClick={handleSalvar}
              disabled={salvarPlanejamento.isPending}
              className="h-10 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Planejamento
            </Button>
          </div>
        </Card>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Receita Planejada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyInput
                value={receitaPlanejada}
                onChange={setReceitaPlanejada}
                showCurrency
                className="text-2xl font-bold border-2 border-gray-300 focus:border-primary h-12"
                placeholder="0,00"
              />
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Despesas Planejadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyInput
                value={despesasPlanejadas}
                onChange={setDespesasPlanejadas}
                showCurrency
                className="text-2xl font-bold border-2 border-gray-300 focus:border-primary h-12"
                placeholder="0,00"
              />
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lucro Esperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroEsperado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currencyFormatters.brl(lucroEsperado)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Margem Esperada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${margemEsperada >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margemEsperada.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Metas Mensais */}
        <Card className="flex-1 overflow-hidden border-[3px] border-gray-400 rounded-xl shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Metas Mensais</CardTitle>
            <CardDescription>
              Distribua a receita planejada pelos meses do ano
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b-[3px] border-gray-400">
                <TableRow>
                  <TableHead className="font-bold">Mês</TableHead>
                  <TableHead className="font-bold text-right">Meta Mensal</TableHead>
                  <TableHead className="font-bold text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meses.map((mes, index) => {
                  const mesNum = index + 1;
                  const valor = metaMensal[mesNum] || 0;
                  const percentual = receitaPlanejada > 0 ? (valor / receitaPlanejada) * 100 : 0;
                  
                  return (
                    <TableRow key={mesNum} className="border-b-[2px] border-gray-300">
                      <TableCell className="font-semibold">{mes}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyInput
                          value={valor}
                          onChange={(val) => updateMetaMensal(mesNum, val)}
                          showCurrency
                          className="text-right border-[2px] border-gray-300 w-40 ml-auto h-9"
                          placeholder="0,00"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {percentual.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-[3px] border-gray-400 bg-gray-50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{currencyFormatters.brl(totalMetaMensal)}</TableCell>
                  <TableCell className="text-right">
                    {receitaPlanejada > 0 ? ((totalMetaMensal / receitaPlanejada) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                {diferencaMeta !== 0 && (
                  <TableRow className={diferencaMeta > 0 ? 'bg-yellow-50' : 'bg-red-50'}>
                    <TableCell colSpan={2} className="font-semibold">
                      {diferencaMeta > 0 ? 'Faltam distribuir:' : 'Excesso distribuído:'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${diferencaMeta > 0 ? 'text-yellow-700' : 'text-red-700'}`}>
                      {currencyFormatters.brl(Math.abs(diferencaMeta))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Observações */}
        <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Observações</CardTitle>
            <CardDescription>Anotações e observações sobre o planejamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações, estratégias, premissas e outras informações relevantes para o planejamento..."
              className="min-h-[120px] border-[3px] border-gray-400"
            />
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
