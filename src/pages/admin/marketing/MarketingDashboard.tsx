import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, MousePointer, 
  Target, Eye, Megaphone, ArrowUpRight, ArrowDownRight,
  Percent, ShoppingCart
} from 'lucide-react';
import { useMarketingDashboard } from '@/hooks/useMarketing';
import { currencyFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function MarketingDashboard() {
  const { month } = useOutletContext<{ month: string }>();
  const {
    isLoading,
    activeCampaigns,
    totals,
    calculatedMetrics,
    leadStats,
    goalProgress,
    metricsByPlatform,
  } = useMarketingDashboard(month);

  if (isLoading) {
    return <LoadingSkeleton type="cards" count={4} />;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Investido */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />Investido
            </div>
            <p className="text-xl md:text-2xl font-bold text-purple-600">
              {currencyFormatters.brl(totals.valor_investido)}
            </p>
            {goalProgress?.investimento && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Meta: {currencyFormatters.brl(goalProgress.investimento.meta)}</span>
                  <span>{goalProgress.investimento.percentual.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(goalProgress.investimento.percentual, 100)} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impressões */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
              <Eye className="h-3.5 w-3.5" />Impressões
            </div>
            <p className="text-xl md:text-2xl font-bold text-blue-600">
              {formatNumber(totals.impressoes)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              CPM: {currencyFormatters.brl(calculatedMetrics.cpm)}
            </p>
          </CardContent>
        </Card>

        {/* Cliques */}
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-cyan-600 text-xs mb-1">
              <MousePointer className="h-3.5 w-3.5" />Cliques
            </div>
            <p className="text-xl md:text-2xl font-bold text-cyan-600">
              {formatNumber(totals.cliques)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              CPC: {currencyFormatters.brl(calculatedMetrics.cpc)} | CTR: {calculatedMetrics.ctr.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
              <Users className="h-3.5 w-3.5" />Leads
            </div>
            <p className="text-xl md:text-2xl font-bold text-green-600">
              {totals.leads_gerados}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              CPL: {currencyFormatters.brl(calculatedMetrics.cpl)}
            </p>
            {goalProgress?.leads && (
              <div className="mt-2">
                <Progress value={Math.min(goalProgress.leads.percentual, 100)} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversões */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
              <ShoppingCart className="h-3.5 w-3.5" />Conversões
            </div>
            <p className="text-xl md:text-2xl font-bold text-orange-600">
              {leadStats.byStatus.convertido}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Taxa: {leadStats.taxaConversao.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className={`border-l-4 ${calculatedMetrics.roas >= 1 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs mb-1">
              <Percent className="h-3.5 w-3.5" />ROAS
            </div>
            <p className={`text-xl md:text-2xl font-bold ${calculatedMetrics.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
              {calculatedMetrics.roas.toFixed(2)}x
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Faturado: {currencyFormatters.brl(leadStats.totalConversao)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas por Plataforma */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Meta Ads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              Meta Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsByPlatform.meta ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Investido</span>
                  <span className="font-medium">{currencyFormatters.brl(metricsByPlatform.meta.valor_investido)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impressões</span>
                  <span className="font-medium">{formatNumber(metricsByPlatform.meta.impressoes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliques</span>
                  <span className="font-medium">{formatNumber(metricsByPlatform.meta.cliques)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium text-green-600">{metricsByPlatform.meta.leads_gerados}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CPL</span>
                  <span className="font-medium">
                    {metricsByPlatform.meta.leads_gerados > 0 
                      ? currencyFormatters.brl(metricsByPlatform.meta.valor_investido / metricsByPlatform.meta.leads_gerados)
                      : '-'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Google Ads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 via-red-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              Google Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsByPlatform.google ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Investido</span>
                  <span className="font-medium">{currencyFormatters.brl(metricsByPlatform.google.valor_investido)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impressões</span>
                  <span className="font-medium">{formatNumber(metricsByPlatform.google.impressoes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliques</span>
                  <span className="font-medium">{formatNumber(metricsByPlatform.google.cliques)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium text-green-600">{metricsByPlatform.google.leads_gerados}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CPL</span>
                  <span className="font-medium">
                    {metricsByPlatform.google.leads_gerados > 0 
                      ? currencyFormatters.brl(metricsByPlatform.google.valor_investido / metricsByPlatform.google.leads_gerados)
                      : '-'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Resumo Campanhas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campanhas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha ativa</p>
              ) : (
                activeCampaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          campaign.plataforma === 'meta' ? 'border-blue-500 text-blue-600' : 
                          campaign.plataforma === 'google' ? 'border-red-500 text-red-600' : ''
                        }`}
                      >
                        {campaign.plataforma}
                      </Badge>
                      <span className="text-sm truncate max-w-[120px]">{campaign.nome}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{campaign.tipo}</Badge>
                  </div>
                ))
              )}
              {activeCampaigns.length > 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{activeCampaigns.length - 4} mais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Funil de Leads</CardTitle>
          <CardDescription>Distribuição por status no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {[
              { status: 'novo', label: 'Novos', color: 'bg-blue-500', count: leadStats.byStatus.novo },
              { status: 'contatado', label: 'Contatados', color: 'bg-yellow-500', count: leadStats.byStatus.contatado },
              { status: 'qualificado', label: 'Qualificados', color: 'bg-orange-500', count: leadStats.byStatus.qualificado },
              { status: 'negociacao', label: 'Negociação', color: 'bg-purple-500', count: leadStats.byStatus.negociacao },
              { status: 'convertido', label: 'Convertidos', color: 'bg-green-500', count: leadStats.byStatus.convertido },
              { status: 'perdido', label: 'Perdidos', color: 'bg-red-500', count: leadStats.byStatus.perdido },
            ].map((item) => (
              <div key={item.status} className="text-center">
                <div className={`w-full h-2 rounded-full ${item.color} mb-2 opacity-80`} />
                <p className="text-lg md:text-2xl font-bold">{item.count}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          
          {/* Barra de progresso do funil */}
          <div className="mt-4 flex items-center gap-1 h-8">
            {leadStats.total > 0 && (
              <>
                <div 
                  className="h-full bg-blue-500 rounded-l-lg flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.novo / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.novo > 0 && leadStats.byStatus.novo}
                </div>
                <div 
                  className="h-full bg-yellow-500 flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.contatado / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.contatado > 0 && leadStats.byStatus.contatado}
                </div>
                <div 
                  className="h-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.qualificado / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.qualificado > 0 && leadStats.byStatus.qualificado}
                </div>
                <div 
                  className="h-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.negociacao / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.negociacao > 0 && leadStats.byStatus.negociacao}
                </div>
                <div 
                  className="h-full bg-green-500 flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.convertido / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.convertido > 0 && leadStats.byStatus.convertido}
                </div>
                <div 
                  className="h-full bg-red-500 rounded-r-lg flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ width: `${(leadStats.byStatus.perdido / leadStats.total) * 100}%` }}
                >
                  {leadStats.byStatus.perdido > 0 && leadStats.byStatus.perdido}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progresso das Metas */}
      {goalProgress && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Progresso das Metas
            </CardTitle>
            <CardDescription>
              {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Investimento */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Investimento</span>
                  <span className="font-medium">{goalProgress.investimento.percentual.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(goalProgress.investimento.percentual, 100)} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {currencyFormatters.brl(goalProgress.investimento.atual)} / {currencyFormatters.brl(goalProgress.investimento.meta)}
                </p>
              </div>

              {/* Leads */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Leads</span>
                  <span className="font-medium">{goalProgress.leads.percentual.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={Math.min(goalProgress.leads.percentual, 100)} 
                  className="h-2"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {goalProgress.leads.atual} / {goalProgress.leads.meta}
                </p>
              </div>

              {/* Conversões */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Conversões</span>
                  <span className="font-medium">{goalProgress.conversoes.percentual.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={Math.min(goalProgress.conversoes.percentual, 100)} 
                  className="h-2"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {goalProgress.conversoes.atual} / {goalProgress.conversoes.meta}
                </p>
              </div>

              {/* Vendas */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Vendas</span>
                  <span className="font-medium">{goalProgress.vendas.percentual.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={Math.min(goalProgress.vendas.percentual, 100)} 
                  className="h-2"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {currencyFormatters.brl(goalProgress.vendas.atual)} / {currencyFormatters.brl(goalProgress.vendas.meta)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

