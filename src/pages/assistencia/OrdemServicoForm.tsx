import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Save, Search, Phone, Plus, Trash2, Wrench, FileText, 
  DollarSign, CheckSquare, MessageSquare, Info, Image, ArrowLeft, Printer
} from 'lucide-react';
import { useOrdensServico, useClientes, useMarcas, useModelos, useItensOS, useAdiantamentos } from '@/hooks/useAssistencia';
import { OrdemServicoFormData, StatusOS, STATUS_OS_LABELS, STATUS_OS_COLORS, Cliente } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function OrdemServicoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();

  const { createOrdem, updateOrdem, updateStatus, getOrdemById } = useOrdensServico();
  const { clientes, searchClientes } = useClientes();
  const { marcas } = useMarcas();
  const { modelos } = useModelos();

  const [activeTab, setActiveTab] = useState('manutencao');
  const [isLoading, setIsLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [itemDialog, setItemDialog] = useState(false);
  const [adiantamentoDialog, setAdiantamentoDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);

  const [formData, setFormData] = useState<OrdemServicoFormData>({
    cliente_id: '', telefone_contato: '', tipo_aparelho: 'CELULAR', marca_id: '', modelo_id: '',
    imei: '', numero_serie: '', cor: '', senha_aparelho: '', possui_senha: false, deixou_aparelho: true,
    descricao_problema: '', condicoes_equipamento: '', acessorios: '', data_previsao: '', hora_previsao: '',
    orcamento_pre_autorizado: '', risco_peca: false, backup_autorizado: false, chip_cartao_memoria: false,
    formatacao_autorizada: false, observacoes_cliente: '',
  });

  const [ordemAtual, setOrdemAtual] = useState<any>(null);
  const [resolucaoProblema, setResolucaoProblema] = useState('');
  const [informacoesTecnicas, setInformacoesTecnicas] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');

  const { itens, total: totalItens, addItem, removeItem } = useItensOS(id || '');
  const { adiantamentos, totalAdiantado, addAdiantamento, removeAdiantamento } = useAdiantamentos(id || '');

  const [novoItem, setNovoItem] = useState({ tipo: 'servico' as const, descricao: '', quantidade: 1, valor_unitario: 0 });
  const [novoAdiantamento, setNovoAdiantamento] = useState({ valor: 0, forma_pagamento: 'pix' as const, parcelas: 1, observacao: '' });

  useEffect(() => {
    if (id) {
      const ordem = getOrdemById(id);
      if (ordem) {
        setOrdemAtual(ordem);
        setSelectedCliente(clientes.find(c => c.id === ordem.cliente_id) || null);
        setFormData({
          cliente_id: ordem.cliente_id, telefone_contato: ordem.telefone_contato || '', tipo_aparelho: ordem.tipo_aparelho,
          marca_id: ordem.marca_id || '', modelo_id: ordem.modelo_id || '', imei: ordem.imei || '', numero_serie: ordem.numero_serie || '',
          cor: ordem.cor || '', senha_aparelho: ordem.senha_aparelho || '', possui_senha: ordem.possui_senha, deixou_aparelho: ordem.deixou_aparelho,
          descricao_problema: ordem.descricao_problema, condicoes_equipamento: ordem.condicoes_equipamento || '', acessorios: ordem.acessorios || '',
          data_previsao: ordem.data_previsao || '', hora_previsao: ordem.hora_previsao || '', orcamento_pre_autorizado: ordem.orcamento_pre_autorizado || '',
          risco_peca: ordem.risco_peca, backup_autorizado: ordem.backup_autorizado, chip_cartao_memoria: ordem.chip_cartao_memoria,
          formatacao_autorizada: ordem.formatacao_autorizada, observacoes_cliente: ordem.observacoes_cliente || '',
        });
        setResolucaoProblema(ordem.descricao_solucao || '');
        setInformacoesTecnicas(ordem.informacoes_tecnicas || '');
        setObservacoesInternas(ordem.observacoes_internas || '');
      }
    }
  }, [id, clientes, getOrdemById]);

  const modelosFiltrados = useMemo(() => formData.marca_id ? modelos.filter(m => m.marca_id === formData.marca_id) : [], [formData.marca_id, modelos]);
  const clientesResults = useMemo(() => clienteSearch.length >= 2 ? searchClientes(clienteSearch).slice(0, 5) : [], [clienteSearch, searchClientes]);

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData(prev => ({ ...prev, cliente_id: cliente.id, telefone_contato: cliente.telefone || cliente.whatsapp || '' }));
    setClienteSearch('');
    setShowClienteResults(false);
  };

  const handleSubmit = async () => {
    if (!formData.cliente_id) { toast({ title: 'Selecione um cliente', variant: 'destructive' }); return; }
    if (!formData.descricao_problema) { toast({ title: 'Informe o problema', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      if (isEditing && ordemAtual) {
        updateOrdem(id!, { ...formData, descricao_solucao: resolucaoProblema, informacoes_tecnicas: informacoesTecnicas, observacoes_internas: observacoesInternas });
      } else {
        const novaOrdem = createOrdem(formData);
        navigate(`/assistencia/os/${novaOrdem.id}`);
        return;
      }
      toast({ title: 'OS salva!' });
    } finally { setIsLoading(false); }
  };

  const handleAddItem = () => {
    if (!novoItem.descricao || novoItem.valor_unitario <= 0) { toast({ title: 'Preencha os dados', variant: 'destructive' }); return; }
    addItem({ tipo: novoItem.tipo, descricao: novoItem.descricao, quantidade: novoItem.quantidade, valor_unitario: novoItem.valor_unitario, valor_total: novoItem.quantidade * novoItem.valor_unitario });
    setNovoItem({ tipo: 'servico', descricao: '', quantidade: 1, valor_unitario: 0 });
    setItemDialog(false);
  };

  const handleAddAdiantamento = () => {
    if (novoAdiantamento.valor <= 0) { toast({ title: 'Informe o valor', variant: 'destructive' }); return; }
    addAdiantamento({ ...novoAdiantamento, data_pagamento: new Date().toISOString().split('T')[0] });
    setNovoAdiantamento({ valor: 0, forma_pagamento: 'pix', parcelas: 1, observacao: '' });
    setAdiantamentoDialog(false);
  };

  const handleChangeStatus = (newStatus: StatusOS) => {
    if (id) { updateStatus(id, newStatus); setOrdemAtual((prev: any) => prev ? { ...prev, status: newStatus } : null); }
    setStatusDialog(false);
  };

  const saldoRestante = totalItens - totalAdiantado;

  return (
    <ModernLayout title={isEditing ? `O.S. #${ordemAtual?.numero || ''}` : 'Nova Ordem de Serviço'} subtitle={isEditing ? 'Editar OS' : 'Cadastrar nova OS'}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigate('/assistencia/os')}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          <div className="flex flex-wrap gap-2">
            {isEditing && ordemAtual && (
              <>
                <Badge className={cn('text-white text-sm px-3 py-1', STATUS_OS_COLORS[ordemAtual.status as StatusOS])}>{STATUS_OS_LABELS[ordemAtual.status as StatusOS]}</Badge>
                <Button variant="outline" onClick={() => setStatusDialog(true)}>Alterar Status</Button>
                <Button variant="outline"><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
              </>
            )}
            <LoadingButton onClick={handleSubmit} loading={isLoading}><Save className="h-4 w-4 mr-2" />Salvar</LoadingButton>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="manutencao"><Wrench className="h-4 w-4 mr-1" />Manutenção</TabsTrigger>
            {isEditing && (<>
              <TabsTrigger value="resolucao"><FileText className="h-4 w-4 mr-1" />Resolução</TabsTrigger>
              <TabsTrigger value="pecas"><DollarSign className="h-4 w-4 mr-1" />Peças/Serviços</TabsTrigger>
              <TabsTrigger value="status"><CheckSquare className="h-4 w-4 mr-1" />Status</TabsTrigger>
              <TabsTrigger value="observacoes"><MessageSquare className="h-4 w-4 mr-1" />Observações</TabsTrigger>
              <TabsTrigger value="adiantamento"><DollarSign className="h-4 w-4 mr-1" />Adiantamento</TabsTrigger>
              <TabsTrigger value="tecnico"><Info className="h-4 w-4 mr-1" />Info Técnicas</TabsTrigger>
            </>)}
          </TabsList>

          <TabsContent value="manutencao" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-lg">Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCliente ? (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div><p className="font-medium">{selectedCliente.nome}</p><p className="text-sm text-muted-foreground">{selectedCliente.cpf_cnpj} • {selectedCliente.telefone}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCliente(null)}>Trocar</Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar cliente..." value={clienteSearch} onChange={(e) => { setClienteSearch(e.target.value); setShowClienteResults(true); }} className="pl-9" />
                        {showClienteResults && clientesResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg">
                            {clientesResults.map(c => (<button key={c.id} className="w-full p-3 text-left hover:bg-muted/50" onClick={() => handleSelectCliente(c)}><p className="font-medium">{c.nome}</p><p className="text-sm text-muted-foreground">{c.cpf_cnpj}</p></button>))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Telefone Contato</Label>
                        <div className="flex gap-2">
                          <Input value={formData.telefone_contato} onChange={(e) => setFormData({ ...formData, telefone_contato: e.target.value })} />
                          {formData.telefone_contato && (<Button variant="outline" size="icon" asChild><a href={`https://wa.me/55${formData.telefone_contato.replace(/\D/g, '')}`} target="_blank"><Phone className="h-4 w-4 text-green-600" /></a></Button>)}
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Problema *</Label><Input value={formData.descricao_problema} onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })} placeholder="Ex: Troca de tela" /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-lg">Aparelho</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Tipo</Label><Select value={formData.tipo_aparelho} onValueChange={(v) => setFormData({ ...formData, tipo_aparelho: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CELULAR">Celular</SelectItem><SelectItem value="TABLET">Tablet</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Possui Senha?</Label><Select value={formData.possui_senha ? 'SIM' : 'NAO'} onValueChange={(v) => setFormData({ ...formData, possui_senha: v === 'SIM' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SIM">Sim</SelectItem><SelectItem value="NAO">Não</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2 col-span-2"><Label>Senha</Label><Input value={formData.senha_aparelho} onChange={(e) => setFormData({ ...formData, senha_aparelho: e.target.value })} disabled={!formData.possui_senha} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Marca</Label><Select value={formData.marca_id} onValueChange={(v) => setFormData({ ...formData, marca_id: v, modelo_id: '' })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{marcas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Modelo</Label><Select value={formData.modelo_id} onValueChange={(v) => setFormData({ ...formData, modelo_id: v })} disabled={!formData.marca_id}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{modelosFiltrados.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Cor</Label><Input value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>IMEI</Label><Input value={formData.imei} onChange={(e) => setFormData({ ...formData, imei: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Nº Série</Label><Input value={formData.numero_serie} onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-lg">Condições e Autorizações</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2"><Checkbox checked={formData.risco_peca} onCheckedChange={(c) => setFormData({ ...formData, risco_peca: !!c })} /><span>Risco de Peça</span></label>
                      <label className="flex items-center gap-2"><Checkbox checked={formData.backup_autorizado} onCheckedChange={(c) => setFormData({ ...formData, backup_autorizado: !!c })} /><span>Backup Autorizado</span></label>
                      <label className="flex items-center gap-2"><Checkbox checked={formData.chip_cartao_memoria} onCheckedChange={(c) => setFormData({ ...formData, chip_cartao_memoria: !!c })} /><span>Chip/Cartão</span></label>
                      <label className="flex items-center gap-2"><Checkbox checked={formData.formatacao_autorizada} onCheckedChange={(c) => setFormData({ ...formData, formatacao_autorizada: !!c })} /><span>Formatação Autorizada</span></label>
                    </div>
                    <div className="space-y-2"><Label>Condições do Equipamento</Label><Textarea value={formData.condicoes_equipamento} onChange={(e) => setFormData({ ...formData, condicoes_equipamento: e.target.value })} rows={3} /></div>
                    <div className="space-y-2"><Label>Acessórios</Label><Textarea value={formData.acessorios} onChange={(e) => setFormData({ ...formData, acessorios: e.target.value })} rows={2} /></div>
                    <div className="space-y-2"><Label>Orçamento Pré-Autorizado</Label><Textarea value={formData.orcamento_pre_autorizado} onChange={(e) => setFormData({ ...formData, orcamento_pre_autorizado: e.target.value })} rows={2} /></div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-lg">Previsão</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={formData.data_previsao} onChange={(e) => setFormData({ ...formData, data_previsao: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Hora</Label><Input type="time" value={formData.hora_previsao} onChange={(e) => setFormData({ ...formData, hora_previsao: e.target.value })} /></div>
                  </CardContent>
                </Card>
                {isEditing && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Resumo</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">{currencyFormatters.brl(totalItens)}</span></div>
                      <Separator />
                      <div className="flex justify-between text-lg"><span>Total:</span><span className="font-bold">{currencyFormatters.brl(totalItens)}</span></div>
                      <div className="flex justify-between text-green-600"><span>Adiantado:</span><span>{currencyFormatters.brl(totalAdiantado)}</span></div>
                      <div className="flex justify-between text-lg"><span>Saldo:</span><span className={cn("font-bold", saldoRestante > 0 ? "text-destructive" : "text-green-600")}>{currencyFormatters.brl(saldoRestante)}</span></div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {isEditing && (<>
            <TabsContent value="resolucao" className="mt-4"><Card><CardHeader><CardTitle>Resolução do Problema</CardTitle></CardHeader><CardContent><Textarea value={resolucaoProblema} onChange={(e) => setResolucaoProblema(e.target.value)} rows={10} /></CardContent></Card></TabsContent>

            <TabsContent value="pecas" className="mt-4">
              <Card>
                <CardHeader><div className="flex justify-between"><CardTitle>Peças e Serviços</CardTitle><Button onClick={() => setItemDialog(true)}><Plus className="h-4 w-4 mr-2" />Adicionar</Button></div></CardHeader>
                <CardContent>
                  {itens.length === 0 ? <EmptyState variant="no-data" title="Nenhum item" /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
                      <TableBody>
                        {itens.map(i => (<TableRow key={i.id}><TableCell><Badge variant="outline">{i.tipo}</Badge></TableCell><TableCell>{i.descricao}</TableCell><TableCell className="text-right">{i.quantidade}</TableCell><TableCell className="text-right">{currencyFormatters.brl(i.valor_unitario)}</TableCell><TableCell className="text-right font-semibold">{currencyFormatters.brl(i.valor_total)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}
                        <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={4}>Total</TableCell><TableCell className="text-right text-lg">{currencyFormatters.brl(totalItens)}</TableCell><TableCell /></TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="mt-4"><Card><CardHeader><CardTitle>Alterar Status</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{Object.entries(STATUS_OS_LABELS).map(([s, l]) => (<Button key={s} variant={ordemAtual?.status === s ? 'default' : 'outline'} className={ordemAtual?.status === s ? STATUS_OS_COLORS[s as StatusOS] : ''} onClick={() => handleChangeStatus(s as StatusOS)}>{l}</Button>))}</div></CardContent></Card></TabsContent>

            <TabsContent value="observacoes" className="mt-4"><div className="grid md:grid-cols-2 gap-4"><Card><CardHeader><CardTitle>Observações Internas</CardTitle></CardHeader><CardContent><Textarea value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} rows={6} /></CardContent></Card><Card><CardHeader><CardTitle>Observações Cliente</CardTitle></CardHeader><CardContent><Textarea value={formData.observacoes_cliente} onChange={(e) => setFormData({ ...formData, observacoes_cliente: e.target.value })} rows={6} /></CardContent></Card></div></TabsContent>

            <TabsContent value="adiantamento" className="mt-4">
              <Card>
                <CardHeader><div className="flex justify-between"><CardTitle>Adiantamentos</CardTitle><Button onClick={() => setAdiantamentoDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button></div></CardHeader>
                <CardContent>
                  {adiantamentos.length === 0 ? <EmptyState variant="no-data" title="Nenhum adiantamento" /> : (
                    <><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Obs</TableHead><TableHead /></TableRow></TableHeader><TableBody>{adiantamentos.map(a => (<TableRow key={a.id}><TableCell>{dateFormatters.short(a.data_pagamento)}</TableCell><TableCell><Badge variant="outline">{a.forma_pagamento}</Badge></TableCell><TableCell className="text-right text-green-600 font-semibold">{currencyFormatters.brl(a.valor)}</TableCell><TableCell>{a.observacao || '-'}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => removeAdiantamento(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody></Table><div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg flex justify-between"><span className="font-medium">Total:</span><span className="text-2xl font-bold text-green-600">{currencyFormatters.brl(totalAdiantado)}</span></div></>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tecnico" className="mt-4"><Card><CardHeader><CardTitle>Informações Técnicas</CardTitle></CardHeader><CardContent><Textarea value={informacoesTecnicas} onChange={(e) => setInformacoesTecnicas(e.target.value)} rows={10} /></CardContent></Card></TabsContent>
          </>)}
        </Tabs>
      </div>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tipo</Label><Select value={novoItem.tipo} onValueChange={(v: any) => setNovoItem({ ...novoItem, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="servico">Serviço</SelectItem><SelectItem value="peca">Peça</SelectItem><SelectItem value="mao_de_obra">Mão de Obra</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={novoItem.descricao} onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Qtd</Label><Input type="number" min="1" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseInt(e.target.value) || 1 })} /></div><div className="space-y-2"><Label>Valor Unit.</Label><Input type="number" step="0.01" value={novoItem.valor_unitario} onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: parseFloat(e.target.value) || 0 })} /></div></div>
            <div className="p-3 bg-muted/50 rounded-lg"><p className="text-sm">Total: <span className="text-xl font-bold">{currencyFormatters.brl(novoItem.quantidade * novoItem.valor_unitario)}</span></p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button><Button onClick={handleAddItem}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adiantamentoDialog} onOpenChange={setAdiantamentoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Adiantamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={novoAdiantamento.valor} onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, valor: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Forma</Label><Select value={novoAdiantamento.forma_pagamento} onValueChange={(v: any) => setNovoAdiantamento({ ...novoAdiantamento, forma_pagamento: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="debito">Débito</SelectItem><SelectItem value="credito">Crédito</SelectItem></SelectContent></Select></div>
            {novoAdiantamento.forma_pagamento === 'credito' && (<div className="space-y-2"><Label>Parcelas</Label><Select value={novoAdiantamento.parcelas.toString()} onValueChange={(v) => setNovoAdiantamento({ ...novoAdiantamento, parcelas: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (<SelectItem key={n} value={n.toString()}>{n}x</SelectItem>))}</SelectContent></Select></div>)}
            <div className="space-y-2"><Label>Observação</Label><Input value={novoAdiantamento.observacao} onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, observacao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdiantamentoDialog(false)}>Cancelar</Button><Button onClick={handleAddAdiantamento}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent><DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-2">{Object.entries(STATUS_OS_LABELS).map(([s, l]) => (<Button key={s} variant="outline" className={ordemAtual?.status === s ? STATUS_OS_COLORS[s as StatusOS] : ''} onClick={() => handleChangeStatus(s as StatusOS)}>{l}</Button>))}</div></DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

