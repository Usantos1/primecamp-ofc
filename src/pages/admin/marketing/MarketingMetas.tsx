import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Percent, Save } from 'lucide-react';
import { useMarketingGoals, useMarketingDashboard, MarketingGoal } from '@/hooks/useMarketing';
import { currencyFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function MarketingMetas() {
  const { month } = useOutletContext<{ month: string }>();
  const { currentGoal, isLoading, saveGoal, isSaving } = useMarketingGoals(month);
  const { totals, calculatedMetrics, leadStats, isLoading: dashboardLoading } = useMarketingDashboard(month);

  const [form, setForm] = useState({
    meta_investimento: '',
    meta_impressoes: '',
    meta_cliques: '',
    meta_alcance: '',
    meta_leads: '',
    meta_leads_qualificados: '',
    meta_conversoes: '',
    meta_valor_vendas: '',
    meta_cpl: '',
    meta_cpc: '',
    meta_roas: '',
    observacoes: '',
  });

  useEffect(() => {
    if (currentGoal) {
      setForm({
        meta_investimento: currentGoal.meta_investimento?.toString() || '',
        meta_impressoes: currentGoal.meta_impressoes?.toString() || '',
        meta_cliques: currentGoal.meta_cliques?.toString() || '',
        meta_alcance: currentGoal.meta_alcance?.toString() || '',
        meta_leads: currentGoal.meta_leads?.toString() || '',
        meta_leads_qualificados: currentGoal.meta_leads_qualificados?.toString() || '',
        meta_conversoes: currentGoal.meta_conversoes?.toString() || '',
        meta_valor_vendas: currentGoal.meta_valor_vendas?.toString() || '',
        meta_cpl: currentGoal.meta_cpl?.toString() || '',
        meta_cpc: currentGoal.meta_cpc?.toString() || '',
        meta_roas: currentGoal.meta_roas?.toString() || '',
        observacoes: currentGoal.observacoes || '',
      });
    }
  }, [currentGoal]);

  const handleSave = async () => {
    await saveGoal({
      periodo: month,
      meta_investimento: form.meta_investimento ? parseFloat(form.meta_investimento) : undefined,
      meta_impressoes: form.meta_impressoes ? parseInt(form.meta_impressoes) : undefined,
      meta_cliques: form.meta_cliques ? parseInt(form.meta_cliques) : undefined,
      meta_alcance: form.meta_alcance ? parseInt(form.meta_alcance) : undefined,
      meta_leads: form.meta_leads ? parseInt(form.meta_leads) : undefined,
      meta_leads_qualificados: form.meta_leads_qualificados ? parseInt(form.meta_leads_qualificados) : undefined,
      meta_conversoes: form.meta_conversoes ? parseInt(form.meta_conversoes) : undefined,
      meta_valor_vendas: form.meta_valor_vendas ? parseFloat(form.meta_valor_vendas) : undefined,
      meta_cpl: form.meta_cpl ? parseFloat(form.meta_cpl) : undefined,
      meta_cpc: form.meta_cpc ? parseFloat(form.meta_cpc) : undefined,
      meta_roas: form.meta_roas ? parseFloat(form.meta_roas) : undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  // Calcular progresso
  const getProgress = (atual: number, meta: number) => {
    if (!meta) return 0;
    return Math.min((atual / meta) * 100, 100);
  };

  const getProgressColor = (percentual: number, inverse = false) => {
    if (inverse) {
      // Para métricas onde menor é melhor (CPL, CPC)
      if (percentual > 100) return 'text-red-600';
      if (percentual > 80) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (percentual >= 100) return 'text-green-600';
    if (percentual >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading || dashboardLoading) {
    return <LoadingSkeleton type="cards" count={4} />;
  }

  const periodLabel = new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-medium">Metas de Marketing - {periodLabel}</span>
          </div>
          <LoadingButton loading={isSaving} onClick={handleSave} className="h-9">
            <Save className="h-4 w-4 mr-1" />Salvar Metas
          </LoadingButton>
        </CardContent>
      </Card>

      {/* Progresso Atual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Investimento */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Investimento</span>
              </div>
              <span className={`text-sm font-bold ${getProgressColor(getProgress(totals.valor_investido, parseFloat(form.meta_investimento) || 0))}`}>
                {form.meta_investimento ? `${getProgress(totals.valor_investido, parseFloat(form.meta_investimento)).toFixed(0)}%` : '-'}
              </span>
            </div>
            <Progress value={getProgress(totals.valor_investido, parseFloat(form.meta_investimento) || 0)} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Atual: {currencyFormatters.brl(totals.valor_investido)}</span>
              <span>Meta: {form.meta_investimento ? currencyFormatters.brl(parseFloat(form.meta_investimento)) : '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Leads</span>
              </div>
              <span className={`text-sm font-bold ${getProgressColor(getProgress(totals.leads_gerados, parseFloat(form.meta_leads) || 0))}`}>
                {form.meta_leads ? `${getProgress(totals.leads_gerados, parseFloat(form.meta_leads)).toFixed(0)}%` : '-'}
              </span>
            </div>
            <Progress value={getProgress(totals.leads_gerados, parseFloat(form.meta_leads) || 0)} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Atual: {totals.leads_gerados}</span>
              <span>Meta: {form.meta_leads || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversões */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Conversões</span>
              </div>
              <span className={`text-sm font-bold ${getProgressColor(getProgress(leadStats.byStatus.convertido, parseFloat(form.meta_conversoes) || 0))}`}>
                {form.meta_conversoes ? `${getProgress(leadStats.byStatus.convertido, parseFloat(form.meta_conversoes)).toFixed(0)}%` : '-'}
              </span>
            </div>
            <Progress value={getProgress(leadStats.byStatus.convertido, parseFloat(form.meta_conversoes) || 0)} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Atual: {leadStats.byStatus.convertido}</span>
              <span>Meta: {form.meta_conversoes || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">ROAS</span>
              </div>
              <span className={`text-sm font-bold ${calculatedMetrics.roas >= (parseFloat(form.meta_roas) || 0) ? 'text-green-600' : 'text-red-600'}`}>
                {form.meta_roas ? (calculatedMetrics.roas >= parseFloat(form.meta_roas) ? '✓' : '✗') : '-'}
              </span>
            </div>
            <Progress 
              value={form.meta_roas ? Math.min((calculatedMetrics.roas / parseFloat(form.meta_roas)) * 100, 100) : 0} 
              className="h-2 mb-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Atual: {calculatedMetrics.roas.toFixed(2)}x</span>
              <span>Meta: {form.meta_roas ? `${form.meta_roas}x` : '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Metas de Volume */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Metas de Volume
            </CardTitle>
            <CardDescription>Defina as metas quantitativas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Investimento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.meta_investimento}
                  onChange={(e) => setForm({ ...form, meta_investimento: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Impressões</Label>
                <Input
                  type="number"
                  value={form.meta_impressoes}
                  onChange={(e) => setForm({ ...form, meta_impressoes: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Cliques</Label>
                <Input
                  type="number"
                  value={form.meta_cliques}
                  onChange={(e) => setForm({ ...form, meta_cliques: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Alcance</Label>
                <Input
                  type="number"
                  value={form.meta_alcance}
                  onChange={(e) => setForm({ ...form, meta_alcance: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={form.meta_leads}
                  onChange={(e) => setForm({ ...form, meta_leads: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Leads Qualificados</Label>
                <Input
                  type="number"
                  value={form.meta_leads_qualificados}
                  onChange={(e) => setForm({ ...form, meta_leads_qualificados: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Conversões</Label>
                <Input
                  type="number"
                  value={form.meta_conversoes}
                  onChange={(e) => setForm({ ...form, meta_conversoes: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Valor em Vendas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.meta_valor_vendas}
                  onChange={(e) => setForm({ ...form, meta_valor_vendas: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metas de Eficiência */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Metas de Eficiência
            </CardTitle>
            <CardDescription>Defina os limites de custo e retorno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPL Máximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.meta_cpl}
                  onChange={(e) => setForm({ ...form, meta_cpl: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Atual: {currencyFormatters.brl(calculatedMetrics.cpl)}
                  {form.meta_cpl && (
                    <span className={calculatedMetrics.cpl <= parseFloat(form.meta_cpl) ? ' text-green-600' : ' text-red-600'}>
                      {calculatedMetrics.cpl <= parseFloat(form.meta_cpl) ? ' ✓' : ' ✗'}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label>CPC Máximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.meta_cpc}
                  onChange={(e) => setForm({ ...form, meta_cpc: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Atual: {currencyFormatters.brl(calculatedMetrics.cpc)}
                  {form.meta_cpc && (
                    <span className={calculatedMetrics.cpc <= parseFloat(form.meta_cpc) ? ' text-green-600' : ' text-red-600'}>
                      {calculatedMetrics.cpc <= parseFloat(form.meta_cpc) ? ' ✓' : ' ✗'}
                    </span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <Label>ROAS Mínimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.meta_roas}
                  onChange={(e) => setForm({ ...form, meta_roas: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Atual: {calculatedMetrics.roas.toFixed(2)}x
                  {form.meta_roas && (
                    <span className={calculatedMetrics.roas >= parseFloat(form.meta_roas) ? ' text-green-600' : ' text-red-600'}>
                      {calculatedMetrics.roas >= parseFloat(form.meta_roas) ? ' ✓' : ' ✗'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas sobre as metas do período..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Comparativo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Resumo Comparativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Investimento', atual: currencyFormatters.brl(totals.valor_investido), meta: form.meta_investimento ? currencyFormatters.brl(parseFloat(form.meta_investimento)) : '-', ok: form.meta_investimento ? totals.valor_investido <= parseFloat(form.meta_investimento) * 1.1 : null },
              { label: 'Impressões', atual: totals.impressoes.toLocaleString(), meta: form.meta_impressoes || '-', ok: form.meta_impressoes ? totals.impressoes >= parseInt(form.meta_impressoes) * 0.9 : null },
              { label: 'Cliques', atual: totals.cliques.toLocaleString(), meta: form.meta_cliques || '-', ok: form.meta_cliques ? totals.cliques >= parseInt(form.meta_cliques) * 0.9 : null },
              { label: 'Leads', atual: totals.leads_gerados.toString(), meta: form.meta_leads || '-', ok: form.meta_leads ? totals.leads_gerados >= parseInt(form.meta_leads) * 0.9 : null },
              { label: 'Conversões', atual: leadStats.byStatus.convertido.toString(), meta: form.meta_conversoes || '-', ok: form.meta_conversoes ? leadStats.byStatus.convertido >= parseInt(form.meta_conversoes) * 0.9 : null },
              { label: 'Vendas', atual: currencyFormatters.brl(leadStats.totalConversao), meta: form.meta_valor_vendas ? currencyFormatters.brl(parseFloat(form.meta_valor_vendas)) : '-', ok: form.meta_valor_vendas ? leadStats.totalConversao >= parseFloat(form.meta_valor_vendas) * 0.9 : null },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm font-bold">{item.atual}</p>
                <p className="text-[10px] text-muted-foreground">Meta: {item.meta}</p>
                {item.ok !== null && (
                  <span className={`text-xs ${item.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {item.ok ? '✓ No caminho' : '✗ Abaixo'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

