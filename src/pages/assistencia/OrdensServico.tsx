import { useState, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, Search, Edit, Phone, Calendar, X, FileText, Trash2,
  CheckCircle2, RotateCcw, Package, ChevronLeft, ChevronRight, XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { useMarcasModelos } from '@/hooks/useAssistencia';
import { StatusOS, STATUS_OS_LABELS, STATUS_OS_COLORS } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { PermissionGate } from '@/components/PermissionGate';
import { ImportarOS } from '@/components/assistencia/ImportarOS';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Componente de linha da tabela otimizado
const OSTableRow = memo(({ 
  os, 
  cliente, 
  marca,
  modelo,
  valorTotal,
  valorPago,
  isAtrasada,
  hojeStr,
  index,
  onNavigate,
  onWhatsApp,
  onFinalizar,
  onEntregue,
  onReabrir,
  onDelete,
}: any) => {
  const zebraClass = index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/80 dark:bg-gray-900/50';
  const temSaldoPendente = valorTotal > 0 && valorPago < valorTotal;

  return (
    <tr 
      className={cn(
        zebraClass,
        isAtrasada && 'bg-red-50 dark:bg-red-950/20',
        'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b border-gray-200 dark:border-gray-700 transition-all duration-150'
      )}
      onClick={() => onNavigate(`/os/${os.id}`)}
    >
      {/* Nº OS */}
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[100px]">
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold text-blue-600 dark:text-blue-400 text-base">{os.numero}</span>
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] px-1.5',
              os.situacao === 'fechada' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
              os.situacao === 'cancelada' ? 'border-red-500 text-red-700 bg-red-50' :
              'border-blue-500 text-blue-700 bg-blue-50'
            )}
          >
            {os.situacao === 'fechada' ? 'Fechada' : os.situacao === 'cancelada' ? 'Cancelada' : 'Aberta'}
          </Badge>
        </div>
      </td>
      
      {/* Cliente */}
      <td className="py-3.5 px-3 text-left border-r border-gray-200 dark:border-gray-700">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{cliente?.nome || os.cliente_nome || '-'}</p>
          {(cliente?.telefone || os.telefone_contato) && (
            <button 
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-0.5"
              onClick={(e) => { e.stopPropagation(); onWhatsApp(os.telefone_contato || cliente?.telefone); }}
            >
              <Phone className="h-3 w-3" />
              {os.telefone_contato || cliente?.telefone}
            </button>
          )}
          {cliente?.cpf_cnpj && <p className="text-xs text-gray-500 truncate">CPF: {cliente.cpf_cnpj}</p>}
        </div>
      </td>
      
      {/* Aparelho */}
      <td className="py-3.5 px-3 text-left border-r border-gray-200 dark:border-gray-700 hidden lg:table-cell">
        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{modelo?.nome || os.modelo_nome || '-'}</p>
        <p className="text-xs text-gray-500">{marca?.nome || os.marca_nome || '-'}</p>
      </td>
      
      {/* Problema */}
      <td className="py-3.5 px-3 text-left border-r border-gray-200 dark:border-gray-700">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm line-clamp-2 text-gray-700 dark:text-gray-300">{os.descricao_problema || '-'}</p>
            </TooltipTrigger>
            {os.descricao_problema && os.descricao_problema.length > 50 && (
              <TooltipContent className="max-w-xs"><p>{os.descricao_problema}</p></TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </td>
      
      {/* Status */}
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[120px]">
        <Badge className={cn('text-xs text-white shadow-sm', STATUS_OS_COLORS[os.status as StatusOS] || 'bg-gray-500')}>
          {STATUS_OS_LABELS[os.status as StatusOS] || os.status}
        </Badge>
      </td>
      
      {/* Entrada */}
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[110px] hidden md:table-cell">
        {os.data_entrada ? (
          <div>
            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{dateFormatters.short(os.data_entrada)}</p>
            <p className="text-xs text-gray-500">{os.hora_entrada || '00:00'}</p>
          </div>
        ) : <span className="text-gray-400">-</span>}
      </td>
      
      {/* Previsão */}
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[110px] hidden md:table-cell">
        {os.previsao_entrega ? (
          <div>
            <p className={cn("font-medium text-sm", isAtrasada ? 'text-red-600' : 'text-gray-800 dark:text-gray-200')}>
              {dateFormatters.short(os.previsao_entrega)}
            </p>
            <p className={cn("text-xs", isAtrasada ? "text-red-500" : "text-gray-500")}>{os.hora_previsao || '00:00'}</p>
          </div>
        ) : <span className="text-gray-400">-</span>}
      </td>
      
      {/* Valor */}
      <td className="py-3.5 px-3 text-right border-r border-gray-200 dark:border-gray-700 w-[110px]">
        {valorTotal > 0 ? (
          <div>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{currencyFormatters.brl(valorTotal)}</p>
            {temSaldoPendente && valorPago > 0 && (
              <p className="text-xs text-amber-600">Pago: {currencyFormatters.brl(valorPago)}</p>
            )}
          </div>
        ) : <span className="text-gray-400">-</span>}
      </td>
      
      {/* Ações */}
      <td className="py-3.5 px-3 text-center w-[70px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onNavigate(`/os/${os.id}`)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            {os.status !== 'finalizada' && (
              <DropdownMenuItem onClick={() => onFinalizar(os)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
              </DropdownMenuItem>
            )}
            {os.status !== 'entregue' && (
              <DropdownMenuItem onClick={() => onEntregue(os)}>
                <Package className="mr-2 h-4 w-4" /> Entregue s/ reparo
              </DropdownMenuItem>
            )}
            {['fechada', 'entregue', 'finalizada', 'cancelada'].includes(os.situacao || os.status) && (
              <DropdownMenuItem onClick={() => onReabrir(os)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reabrir OS
              </DropdownMenuItem>
            )}
            <PermissionGate permission="os.delete">
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(os.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </PermissionGate>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});
OSTableRow.displayName = 'OSTableRow';

// Paginação
const PAGE_SIZE = 50;

export default function OrdensServico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [showImportarOS, setShowImportarOS] = useState(false);
  const [osToDelete, setOsToDelete] = useState<string | null>(null);
  const [osToReabrir, setOsToReabrir] = useState<{ id: string; motivo: string } | null>(null);
  const [page, setPage] = useState(1);
  
  // Hooks de dados
  const { ordens, isLoading, getEstatisticas, deleteOS: deleteOSMutation, updateOS, updateStatus } = useOrdensServico();
  const { clientes, getClienteById } = useClientes();
  const { getMarcaById, getModeloById } = useMarcasModelos();

  // Buscar totais dos itens
  const { data: todosItens = [] } = useQuery({
    queryKey: ['os_items_all'],
    queryFn: async () => {
      const { data, error } = await from('os_items').select('ordem_servico_id, valor_total').execute();
      if (error) throw error;
      return (data || []) as Array<{ ordem_servico_id: string; valor_total: number }>;
    },
  });

  const totaisPorOS = useMemo(() => {
    const totais: Record<string, number> = {};
    todosItens.forEach(item => {
      totais[item.ordem_servico_id] = (totais[item.ordem_servico_id] || 0) + Number(item.valor_total || 0);
    });
    return totais;
  }, [todosItens]);

  const stats = getEstatisticas();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];

  // Filtrar ordens
  const filteredOrdens = useMemo(() => {
    let result = [...ordens];

    if (statusFilter !== 'all') {
      result = result.filter(os => os.status === statusFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(os => {
        const cliente = getClienteById(os.cliente_id);
        return (
          os.numero.toString().includes(search) ||
          os.descricao_problema?.toLowerCase().includes(search) ||
          cliente?.nome?.toLowerCase().includes(search) ||
          cliente?.telefone?.includes(search) ||
          os.imei?.includes(search)
        );
      });
    }

    if (periodoFilter !== 'all') {
      const hojeDate = new Date();
      hojeDate.setHours(0, 0, 0, 0);
      
      result = result.filter(os => {
        if (!os.data_entrada) return false;
        const osDate = new Date(os.data_entrada.split('T')[0]);
        osDate.setHours(0, 0, 0, 0);
        
        switch (periodoFilter) {
          case 'hoje':
            return osDate.getTime() === hojeDate.getTime();
          case 'semana':
            const inicioSemana = new Date(hojeDate);
            inicioSemana.setDate(hojeDate.getDate() - hojeDate.getDay());
            return osDate >= inicioSemana && osDate <= hojeDate;
          case 'mes':
            return osDate.getMonth() === hojeDate.getMonth() && osDate.getFullYear() === hojeDate.getFullYear();
          default:
            return true;
        }
      });
    }

    return result.sort((a, b) => b.numero - a.numero);
  }, [ordens, statusFilter, searchTerm, periodoFilter, getClienteById]);

  // Paginação
  const totalPages = Math.ceil(filteredOrdens.length / PAGE_SIZE);
  const paginatedOrdens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrdens.slice(start, start + PAGE_SIZE);
  }, [filteredOrdens, page]);

  // Reset página quando filtros mudam
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, periodoFilter]);

  // Handlers
  const handleWhatsApp = (telefone?: string) => {
    if (telefone) window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}`, '_blank');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPeriodoFilter('all');
  };

  const handleFinalizar = async (os: any) => {
    try {
      await updateStatus(os.id, 'finalizada');
      toast({ title: 'OS Finalizada', description: `OS #${os.numero} finalizada.` });
    } catch { toast({ title: 'Erro', description: 'Não foi possível finalizar.', variant: 'destructive' }); }
  };

  const handleEntregue = async (os: any) => {
    try {
      await updateStatus(os.id, 'entregue');
      toast({ title: 'OS Entregue', description: `OS #${os.numero} entregue.` });
    } catch { toast({ title: 'Erro', description: 'Não foi possível marcar.', variant: 'destructive' }); }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || periodoFilter !== 'all';

  // Cards de estatísticas config
  const statsCards = [
    { label: 'Total', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Abertas', value: stats.abertas, color: 'yellow', filter: 'aberta' },
    { label: 'Em Andamento', value: stats.emAndamento, color: 'purple', filter: 'em_andamento' },
    { label: 'Aguardando', value: stats.aguardando || 0, color: 'orange', filter: 'aguardando_orcamento' },
    { label: 'Finalizadas', value: stats.finalizadas, color: 'emerald', filter: 'finalizada' },
    { label: 'Ag. Retirada', value: ordens.filter(o => o.status === 'aguardando_retirada').length, color: 'cyan', filter: 'aguardando_retirada' },
    { label: 'Entregues', value: stats.entregues || 0, color: 'gray', filter: 'entregue' },
    { label: 'Canceladas', value: stats.canceladas || 0, color: 'red', filter: 'cancelada' },
  ];

  return (
    <ModernLayout title="Ordens de Serviço" subtitle="Gestão de assistência técnica">
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CARDS DE ESTATÍSTICAS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap justify-center gap-2 shrink-0 mb-3">
          {statsCards.map((card) => (
            <Card 
              key={card.filter}
              className={cn(
                `border-l-4 border-${card.color}-500 cursor-pointer hover:shadow-md transition-all`,
                statusFilter === card.filter ? `bg-${card.color}-50 dark:bg-${card.color}-950/20 ring-2 ring-${card.color}-400` : 'bg-white dark:bg-gray-900',
                'w-[calc(50%-0.25rem)] sm:w-[calc(25%-0.5rem)] lg:w-[calc(12.5%-0.5rem)] min-w-[100px]'
              )}
              onClick={() => setStatusFilter(card.filter)}
            >
              <CardContent className="py-2 px-3">
                <p className={`text-xs text-${card.color}-600 font-medium`}>{card.label}</p>
                <p className={`text-xl font-bold text-${card.color}-600`}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BARRA DE FILTROS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-background/95 backdrop-blur-sm shrink-0 shadow-sm rounded-xl mb-3 border border-gray-200/50">
          <div className="flex flex-col gap-3 p-4">
            
            {/* Linha 1: Busca principal */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº OS, cliente, telefone, IMEI, problema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 text-base border-gray-200 focus:border-blue-400"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[160px] shrink-0 border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-10 px-3 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
            </div>

            {/* Linha 2: Período e Ações */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtros de período */}
              <div className="flex items-center gap-1">
                {['all', 'hoje', 'semana', 'mes'].map((p) => (
                  <Button
                    key={p}
                    variant={periodoFilter === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriodoFilter(p)}
                    className="h-9 text-xs"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {p === 'all' ? 'Todas' : p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
                  </Button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Ações */}
              <PermissionGate permission="os.create">
                <Button onClick={() => setShowImportarOS(true)} size="sm" variant="outline" className="h-9 gap-1.5 border-gray-200">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button onClick={() => navigate('/os/nova')} size="sm" className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>Nova OS</span>
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ÁREA DA TABELA */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-gray-200 shadow-sm">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4 mx-auto" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2 mx-auto" />
                  </div>
                </div>
              ) : filteredOrdens.length === 0 ? (
                <div className="p-12 text-center">
                  <EmptyState
                    icon={<Package className="h-12 w-12" />}
                    title="Nenhuma ordem de serviço"
                    description={searchTerm ? 'Tente buscar por outro termo' : 'Cadastre uma nova OS'}
                    action={!searchTerm ? { label: 'Nova OS', onClick: () => navigate('/os/nova') } : undefined}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela */}
                  <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                      <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                        <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 shadow-sm">
                          <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[100px] text-xs uppercase tracking-wide">Nº OS</th>
                            <th className="h-12 px-3 text-left align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 text-xs uppercase tracking-wide">Cliente</th>
                            <th className="h-12 px-3 text-left align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[130px] hidden lg:table-cell text-xs uppercase tracking-wide">Aparelho</th>
                            <th className="h-12 px-3 text-left align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 text-xs uppercase tracking-wide">Problema</th>
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[120px] text-xs uppercase tracking-wide">Status</th>
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[110px] hidden md:table-cell text-xs uppercase tracking-wide">Entrada</th>
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[110px] hidden md:table-cell text-xs uppercase tracking-wide">Previsão</th>
                            <th className="h-12 px-3 text-right align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[110px] text-xs uppercase tracking-wide">Valor</th>
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 w-[70px] text-xs uppercase tracking-wide">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOrdens.map((os, index) => {
                            const cliente = getClienteById(os.cliente_id);
                            const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
                            const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
                            const isAtrasada = os.previsao_entrega && 
                              os.previsao_entrega.split('T')[0] < hojeStr && 
                              !['finalizada', 'entregue', 'cancelada'].includes(os.status);
                            const valorTotalItens = totaisPorOS[os.id] || 0;
                            const valorTotal = valorTotalItens > 0 ? valorTotalItens : Number(os.valor_total || 0);
                            
                            return (
                              <OSTableRow
                                key={os.id}
                                os={os}
                                cliente={cliente}
                                marca={marca}
                                modelo={modelo}
                                valorTotal={valorTotal}
                                valorPago={Number(os.valor_pago || 0)}
                                isAtrasada={isAtrasada}
                                hojeStr={hojeStr}
                                index={index}
                                onNavigate={navigate}
                                onWhatsApp={handleWhatsApp}
                                onFinalizar={handleFinalizar}
                                onEntregue={handleEntregue}
                                onReabrir={(os: any) => setOsToReabrir({ id: os.id, motivo: '' })}
                                onDelete={setOsToDelete}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação Desktop */}
                    <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-4 py-3 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Mostrando <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> a{' '}
                        <span className="font-medium">{Math.min(page * PAGE_SIZE, filteredOrdens.length)}</span> de{' '}
                        <span className="font-medium">{filteredOrdens.length}</span> OS
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1} className="h-8 border-gray-200">
                          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <span className="text-sm font-medium px-3">{page} / {totalPages || 1}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="h-8 border-gray-200">
                          Próxima <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Cards */}
                  <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3 p-3">
                    {paginatedOrdens.map((os) => {
                      const cliente = getClienteById(os.cliente_id);
                      const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
                      const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
                      const isAtrasada = os.previsao_entrega && os.previsao_entrega.split('T')[0] < hojeStr && !['finalizada', 'entregue', 'cancelada'].includes(os.status);
                      const valorTotal = totaisPorOS[os.id] || Number(os.valor_total || 0);

                      return (
                        <Card 
                          key={os.id}
                          className={cn(
                            'border-gray-300 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] shadow-sm',
                            isAtrasada && 'border-red-500 bg-red-50'
                          )}
                          onClick={() => navigate(`/os/${os.id}`)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 text-lg">#{os.numero}</span>
                                <Badge className={cn('text-xs text-white', STATUS_OS_COLORS[os.status as StatusOS])}>
                                  {STATUS_OS_LABELS[os.status as StatusOS]}
                                </Badge>
                              </div>
                            </div>
                            <div className="border-b border-gray-200 pb-2">
                              <p className="font-semibold text-gray-900">{cliente?.nome || os.cliente_nome || '-'}</p>
                              {(cliente?.telefone || os.telefone_contato) && (
                                <button className="text-xs text-emerald-600 flex items-center gap-1 mt-1" onClick={(e) => { e.stopPropagation(); handleWhatsApp(os.telefone_contato || cliente?.telefone); }}>
                                  <Phone className="h-3 w-3" /> {os.telefone_contato || cliente?.telefone}
                                </button>
                              )}
                            </div>
                            {(modelo?.nome || os.modelo_nome) && (
                              <div className="border-b border-gray-200 pb-2">
                                <p className="text-xs text-gray-500">Aparelho</p>
                                <p className="font-medium">{modelo?.nome || os.modelo_nome} - {marca?.nome || os.marca_nome}</p>
                              </div>
                            )}
                            {os.descricao_problema && (
                              <div className="border-b border-gray-200 pb-2">
                                <p className="text-xs text-gray-500">Problema</p>
                                <p className="text-sm line-clamp-2">{os.descricao_problema}</p>
                              </div>
                            )}
                            <div className="flex justify-between items-end pt-1">
                              <div>
                                {os.data_entrada && <p className="text-xs text-gray-500">Entrada: {dateFormatters.short(os.data_entrada)}</p>}
                                {os.previsao_entrega && <p className={cn("text-xs", isAtrasada ? "text-red-600 font-medium" : "text-gray-500")}>Previsão: {dateFormatters.short(os.previsao_entrega)}</p>}
                              </div>
                              {valorTotal > 0 && <p className="font-bold text-emerald-600 text-lg">{currencyFormatters.brl(valorTotal)}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Mobile: Paginação */}
          <div className="md:hidden shrink-0 bg-gray-50/50 mt-3 px-4 py-3 flex items-center justify-between rounded-xl border border-gray-200">
            <div className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredOrdens.length)} de {filteredOrdens.length}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium">{page}/{totalPages || 1}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ImportarOS open={showImportarOS} onOpenChange={setShowImportarOS} onSuccess={() => window.location.reload()} />
      
      <AlertDialog open={osToDelete !== null} onOpenChange={(open) => !open && setOsToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (osToDelete) {
                  try {
                    await deleteOSMutation.mutateAsync(osToDelete);
                    toast({ title: 'Sucesso', description: 'OS excluída!' });
                    setOsToDelete(null);
                  } catch (error: any) {
                    toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={osToReabrir !== null} onOpenChange={(open) => !open && setOsToReabrir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir OS</DialogTitle>
            <DialogDescription>Informe o motivo da reabertura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Reabertura</Label>
              <Textarea
                placeholder="Descreva o motivo..."
                value={osToReabrir?.motivo || ''}
                onChange={(e) => setOsToReabrir(osToReabrir ? { ...osToReabrir, motivo: e.target.value } : null)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOsToReabrir(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (osToReabrir && osToReabrir.motivo.trim()) {
                  try {
                    const osReabrir = ordens.find(o => o.id === osToReabrir.id);
                    await updateOS(osToReabrir.id, {
                      status: 'aberta',
                      situacao: 'aberta',
                      observacoes_internas: osToReabrir.motivo + (osReabrir?.observacoes_internas ? `\n\n${osReabrir.observacoes_internas}` : ''),
                    });
                    toast({ title: 'OS Reaberta', description: `OS #${osReabrir?.numero} reaberta.` });
                    setOsToReabrir(null);
                  } catch {
                    toast({ title: 'Erro', description: 'Não foi possível reabrir.', variant: 'destructive' });
                  }
                } else {
                  toast({ title: 'Atenção', description: 'Informe o motivo.', variant: 'destructive' });
                }
              }}
            >
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
