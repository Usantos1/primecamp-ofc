import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Users, BarChart } from 'lucide-react';
import { useAdsMetrics, useAdsCampaigns, AdsMetrics } from '@/hooks/useMarketing';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function MarketingMetricas() {
  const { month } = useOutletContext<{ month: string }>();
  const { campaigns } = useAdsCampaigns();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  
  const { metrics, totals, calculatedMetrics, isLoading, createMetrics, updateMetrics, isCreating, isUpdating } = useAdsMetrics({
    campaignId: selectedCampaignId !== 'all' ? selectedCampaignId : undefined,
    startDate: `${month}-01`,
    endDate: `${month}-31`,
  });
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<AdsMetrics | null>(null);

  const [form, setForm] = useState({
    campaign_id: '',
    data: new Date().toISOString().slice(0, 10),
    valor_investido: '',
    impressoes: '',
    alcance: '',
    cliques: '',
    cliques_link: '',
    visualizacoes_pagina: '',
    curtidas: '',
    comentarios: '',
    compartilhamentos: '',
    salvos: '',
    leads_gerados: '',
    formularios_preenchidos: '',
    mensagens_whatsapp: '',
    ligacoes: '',
    vendas_atribuidas: '',
    valor_vendas_atribuidas: '',
    observacoes: '',
  });

  const resetForm = () => {
    setForm({
      campaign_id: selectedCampaignId !== 'all' ? selectedCampaignId : '',
      data: new Date().toISOString().slice(0, 10),
      valor_investido: '',
      impressoes: '',
      alcance: '',
      cliques: '',
      cliques_link: '',
      visualizacoes_pagina: '',
      curtidas: '',
      comentarios: '',
      compartilhamentos: '',
      salvos: '',
      leads_gerados: '',
      formularios_preenchidos: '',
      mensagens_whatsapp: '',
      ligacoes: '',
      vendas_atribuidas: '',
      valor_vendas_atribuidas: '',
      observacoes: '',
    });
    setEditingMetric(null);
  };

  const handleOpenDialog = (metric?: AdsMetrics) => {
    if (metric) {
      setEditingMetric(metric);
      setForm({
        campaign_id: metric.campaign_id,
        data: metric.data,
        valor_investido: metric.valor_investido?.toString() || '',
        impressoes: metric.impressoes?.toString() || '',
        alcance: metric.alcance?.toString() || '',
        cliques: metric.cliques?.toString() || '',
        cliques_link: metric.cliques_link?.toString() || '',
        visualizacoes_pagina: metric.visualizacoes_pagina?.toString() || '',
        curtidas: metric.curtidas?.toString() || '',
        comentarios: metric.comentarios?.toString() || '',
        compartilhamentos: metric.compartilhamentos?.toString() || '',
        salvos: metric.salvos?.toString() || '',
        leads_gerados: metric.leads_gerados?.toString() || '',
        formularios_preenchidos: metric.formularios_preenchidos?.toString() || '',
        mensagens_whatsapp: metric.mensagens_whatsapp?.toString() || '',
        ligacoes: metric.ligacoes?.toString() || '',
        vendas_atribuidas: metric.vendas_atribuidas?.toString() || '',
        valor_vendas_atribuidas: metric.valor_vendas_atribuidas?.toString() || '',
        observacoes: metric.observacoes || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      campaign_id: form.campaign_id,
      data: form.data,
      valor_investido: parseFloat(form.valor_investido) || 0,
      impressoes: parseInt(form.impressoes) || 0,
      alcance: parseInt(form.alcance) || 0,
      cliques: parseInt(form.cliques) || 0,
      cliques_link: parseInt(form.cliques_link) || 0,
      visualizacoes_pagina: parseInt(form.visualizacoes_pagina) || 0,
      curtidas: parseInt(form.curtidas) || 0,
      comentarios: parseInt(form.comentarios) || 0,
      compartilhamentos: parseInt(form.compartilhamentos) || 0,
      salvos: parseInt(form.salvos) || 0,
      leads_gerados: parseInt(form.leads_gerados) || 0,
      formularios_preenchidos: parseInt(form.formularios_preenchidos) || 0,
      mensagens_whatsapp: parseInt(form.mensagens_whatsapp) || 0,
      ligacoes: parseInt(form.ligacoes) || 0,
      vendas_atribuidas: parseInt(form.vendas_atribuidas) || 0,
      valor_vendas_atribuidas: parseFloat(form.valor_vendas_atribuidas) || 0,
      observacoes: form.observacoes || undefined,
    };

    if (editingMetric) {
      await updateMetrics({ id: editingMetric.id, ...data });
    } else {
      await createMetrics(data);
    }
    setShowDialog(false);
    resetForm();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  if (isLoading) {
    return <LoadingSkeleton type="cards" count={4} />;
  }

  return (
    <div className="space-y-4">
      {/* Resumo do período */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-purple-500" />
            <p className="text-lg font-bold mt-1">{currencyFormatters.brl(totals.valor_investido)}</p>
            <p className="text-[10px] text-muted-foreground">Investido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Eye className="h-4 w-4 mx-auto text-blue-500" />
            <p className="text-lg font-bold mt-1">{formatNumber(totals.impressoes)}</p>
            <p className="text-[10px] text-muted-foreground">Impressões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <MousePointer className="h-4 w-4 mx-auto text-cyan-500" />
            <p className="text-lg font-bold mt-1">{formatNumber(totals.cliques)}</p>
            <p className="text-[10px] text-muted-foreground">Cliques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-green-500" />
            <p className="text-lg font-bold mt-1">{totals.leads_gerados}</p>
            <p className="text-[10px] text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">CPM</p>
            <p className="text-lg font-bold">{currencyFormatters.brl(calculatedMetrics.cpm)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">CPC</p>
            <p className="text-lg font-bold">{currencyFormatters.brl(calculatedMetrics.cpc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">CPL</p>
            <p className="text-lg font-bold">{currencyFormatters.brl(calculatedMetrics.cpl)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e ações */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[250px] h-9">
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                CTR: {calculatedMetrics.ctr.toFixed(2)}%
              </Badge>
              <Badge variant="outline" className={`text-xs ${calculatedMetrics.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                ROAS: {calculatedMetrics.roas.toFixed(2)}x
              </Badge>
              <Button onClick={() => handleOpenDialog()} className="h-9">
                <Plus className="h-4 w-4 mr-1" />Registrar Métricas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de métricas diárias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Métricas Diárias</CardTitle>
          <CardDescription>
            {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-450px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma métrica registrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric) => {
                    const campaign = campaigns.find(c => c.id === metric.campaign_id);
                    return (
                      <TableRow key={metric.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDialog(metric)}>
                        <TableCell>{dateFormatters.short(metric.data)}</TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[150px] block">
                            {campaign?.nome || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-purple-600">
                          {currencyFormatters.brl(metric.valor_investido)}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(metric.impressoes)}</TableCell>
                        <TableCell className="text-right">{formatNumber(metric.cliques)}</TableCell>
                        <TableCell className="text-right">{metric.ctr?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{metric.leads_gerados}</TableCell>
                        <TableCell className="text-right">{currencyFormatters.brl(metric.cpl)}</TableCell>
                        <TableCell className="text-right">
                          {metric.vendas_atribuidas > 0 && (
                            <>
                              <span className="font-medium">{metric.vendas_atribuidas}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({currencyFormatters.brl(metric.valor_vendas_atribuidas)})
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${metric.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.roas?.toFixed(2)}x
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de registro de métricas */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'Editar Métricas' : 'Registrar Métricas'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Campanha *</Label>
                <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              
              <div>
                <Label>Valor Investido (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor_investido} onChange={(e) => setForm({ ...form, valor_investido: e.target.value })} placeholder="0,00" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Métricas de Tráfego</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Impressões</Label>
                  <Input type="number" value={form.impressoes} onChange={(e) => setForm({ ...form, impressoes: e.target.value })} />
                </div>
                <div>
                  <Label>Alcance</Label>
                  <Input type="number" value={form.alcance} onChange={(e) => setForm({ ...form, alcance: e.target.value })} />
                </div>
                <div>
                  <Label>Cliques</Label>
                  <Input type="number" value={form.cliques} onChange={(e) => setForm({ ...form, cliques: e.target.value })} />
                </div>
                <div>
                  <Label>Cliques no Link</Label>
                  <Input type="number" value={form.cliques_link} onChange={(e) => setForm({ ...form, cliques_link: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Engajamento</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Curtidas</Label>
                  <Input type="number" value={form.curtidas} onChange={(e) => setForm({ ...form, curtidas: e.target.value })} />
                </div>
                <div>
                  <Label>Comentários</Label>
                  <Input type="number" value={form.comentarios} onChange={(e) => setForm({ ...form, comentarios: e.target.value })} />
                </div>
                <div>
                  <Label>Compartilhamentos</Label>
                  <Input type="number" value={form.compartilhamentos} onChange={(e) => setForm({ ...form, compartilhamentos: e.target.value })} />
                </div>
                <div>
                  <Label>Salvos</Label>
                  <Input type="number" value={form.salvos} onChange={(e) => setForm({ ...form, salvos: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Leads & Conversões</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Leads Gerados</Label>
                  <Input type="number" value={form.leads_gerados} onChange={(e) => setForm({ ...form, leads_gerados: e.target.value })} />
                </div>
                <div>
                  <Label>Formulários</Label>
                  <Input type="number" value={form.formularios_preenchidos} onChange={(e) => setForm({ ...form, formularios_preenchidos: e.target.value })} />
                </div>
                <div>
                  <Label>Mensagens WhatsApp</Label>
                  <Input type="number" value={form.mensagens_whatsapp} onChange={(e) => setForm({ ...form, mensagens_whatsapp: e.target.value })} />
                </div>
                <div>
                  <Label>Ligações</Label>
                  <Input type="number" value={form.ligacoes} onChange={(e) => setForm({ ...form, ligacoes: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Vendas Atribuídas</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade de Vendas</Label>
                  <Input type="number" value={form.vendas_atribuidas} onChange={(e) => setForm({ ...form, vendas_atribuidas: e.target.value })} />
                </div>
                <div>
                  <Label>Valor Total das Vendas (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_vendas_atribuidas} onChange={(e) => setForm({ ...form, valor_vendas_atribuidas: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <LoadingButton loading={isCreating || isUpdating} onClick={handleSave} disabled={!form.campaign_id || !form.data}>
              {editingMetric ? 'Salvar' : 'Registrar'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

