import { useState, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Search, Edit, Phone, Calendar, X, Trash2,
  CheckCircle2, RotateCcw, Package, ChevronLeft, ChevronRight, XCircle, Download, Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { StatusOS, STATUS_OS_LABELS, STATUS_OS_COLORS, getStatusOSLabel, getStatusOSColor } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { PermissionGate } from '@/components/PermissionGate';
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
      {/* Nº OS — cinza quando fechada/entregue */}
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[100px]">
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "font-bold text-base",
            (os.situacao === 'fechada' || ['entregue', 'entregue_faturada', 'finalizada', 'cancelada'].includes(os.status))
              ? "text-gray-500 dark:text-gray-400"
              : "text-blue-600 dark:text-blue-400"
          )}>{os.numero}</span>
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] px-1.5',
              os.situacao === 'fechada' ? 'border-gray-400 text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' :
              os.situacao === 'cancelada' ? 'border-red-500 text-red-700 bg-red-50' :
              'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300'
            )}
          >
            {os.situacao === 'fechada' ? 'Fechada' : os.situacao === 'cancelada' ? 'Cancelada' : 'Aberta'}
          </Badge>
        </div>
      </td>
      
      {/* Cliente */}
      <td className="py-3.5 px-3 text-left border-r border-gray-200 dark:border-gray-700 w-[200px] max-w-[200px]">
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
      <td className="py-3.5 px-3 text-left border-r border-gray-200 dark:border-gray-700 w-[180px] min-w-0 max-w-[180px]">
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
      <td className="py-3.5 px-3 text-center border-r border-gray-200 dark:border-gray-700 w-[160px]">
        <Badge className={cn('text-xs text-white shadow-sm', getStatusOSColor(os.status))}>
          {getStatusOSLabel(os.status)}
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
  
  // Tipos de campo de busca para OS
  type OSSearchFieldType = 'all' | 'numero' | 'cliente' | 'aparelho' | 'problema';
  
  const OS_SEARCH_FIELD_LABELS: Record<OSSearchFieldType, string> = {
    all: 'Todos',
    numero: 'Nº OS',
    cliente: 'Cliente',
    aparelho: 'Aparelho',
    problema: 'Problema',
  };

  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<OSSearchFieldType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('abertas');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [osToDelete, setOsToDelete] = useState<string | null>(null);
  const [osToReabrir, setOsToReabrir] = useState<{ id: string; motivo: string } | null>(null);
  const [page, setPage] = useState(1);
  
  // Estados de exportação
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('all');
  const [exportPeriodo, setExportPeriodo] = useState<string>('all');
  const [exportDataInicio, setExportDataInicio] = useState<string>('');
  const [exportDataFim, setExportDataFim] = useState<string>('');
  const [exportUsarFiltrosAtuais, setExportUsarFiltrosAtuais] = useState(true);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [exportColumns, setExportColumns] = useState([
    { id: 'numero', label: 'Nº OS', checked: true },
    { id: 'situacao', label: 'Situação', checked: true },
    { id: 'status', label: 'Status', checked: true },
    { id: 'cliente', label: 'Cliente', checked: true },
    { id: 'telefone', label: 'Telefone', checked: true },
    { id: 'aparelho', label: 'Aparelho', checked: true },
    { id: 'problema', label: 'Problema', checked: true },
    { id: 'data_entrada', label: 'Data Entrada', checked: true },
    { id: 'previsao', label: 'Previsão', checked: true },
    { id: 'valor', label: 'Valor', checked: true },
    { id: 'valor_pago', label: 'Valor Pago', checked: false },
    { id: 'imei', label: 'IMEI', checked: false },
    { id: 'observacoes', label: 'Observações', checked: false },
  ]);
  
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

  // Filtrar ordens (padrão: apenas abertas; fechadas ocultas até escolher "Todos os Status")
  const filteredOrdens = useMemo(() => {
    let result = [...ordens];

    if (statusFilter === 'abertas') {
      result = result.filter(os => os.situacao !== 'fechada' && os.situacao !== 'cancelada');
    } else if (statusFilter !== 'all') {
      result = result.filter(os => os.status === statusFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(os => {
        const cliente = getClienteById(os.cliente_id);
        
        // Filtrar por campo específico se selecionado
        if (searchField === 'numero') {
          return String(os.numero).includes(search);
        }
        if (searchField === 'cliente') {
          return cliente?.nome?.toLowerCase().includes(search) || 
                 cliente?.telefone?.includes(searchTerm) ||
                 cliente?.whatsapp?.includes(searchTerm);
        }
        if (searchField === 'aparelho') {
          const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
          const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
          return marca?.nome?.toLowerCase().includes(search) || 
                 modelo?.nome?.toLowerCase().includes(search) ||
                 os.imei?.includes(searchTerm);
        }
        if (searchField === 'problema') {
          return os.problema_relatado?.toLowerCase().includes(search) ||
                 os.observacoes?.toLowerCase().includes(search);
        }
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
  }, [ordens, statusFilter, searchTerm, searchField, periodoFilter, getClienteById, getMarcaById, getModeloById]);

  // Paginação
  const totalPages = Math.ceil(filteredOrdens.length / PAGE_SIZE);
  const paginatedOrdens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrdens.slice(start, start + PAGE_SIZE);
  }, [filteredOrdens, page]);

  // Reset página quando filtros mudam
  useEffect(() => { setPage(1); }, [searchTerm, searchField, statusFilter, periodoFilter]);

  // Handlers
  const handleWhatsApp = (telefone?: string) => {
    if (telefone) window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}`, '_blank');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSearchField('all');
    setStatusFilter('abertas');
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

  // ═══════════════════════════════════════════════════════════════
  // EXPORTAÇÃO
  // ═══════════════════════════════════════════════════════════════
  const toggleExportColumn = (id: string) => {
    setExportColumns(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const applyExportPreset = (preset: 'abertas' | 'finalizadas' | 'atrasadas' | 'hoje' | 'mes' | 'completo') => {
    const hojeDate = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    switch (preset) {
      case 'abertas':
        setExportStatus('aberta');
        setExportPeriodo('all');
        setExportDataInicio('');
        setExportDataFim('');
        break;
      case 'finalizadas':
        setExportStatus('finalizada');
        setExportPeriodo('all');
        break;
      case 'atrasadas':
        setExportStatus('all');
        setExportPeriodo('all');
        // Filtrar atrasadas será feito na exportação
        break;
      case 'hoje':
        setExportStatus('all');
        setExportPeriodo('all');
        setExportDataInicio(hojeDate);
        setExportDataFim(hojeDate);
        break;
      case 'mes':
        setExportStatus('all');
        setExportPeriodo('all');
        setExportDataInicio(inicioMes);
        setExportDataFim(hojeDate);
        break;
      case 'completo':
        setExportStatus('all');
        setExportPeriodo('all');
        setExportDataInicio('');
        setExportDataFim('');
        setExportColumns(prev => prev.map(c => ({ ...c, checked: true })));
        break;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dadosParaExportar = exportUsarFiltrosAtuais ? [...filteredOrdens] : [...ordens];

      // Aplicar filtros de exportação se não usar filtros atuais
      if (!exportUsarFiltrosAtuais) {
        if (exportStatus !== 'all') {
          dadosParaExportar = dadosParaExportar.filter(os => os.status === exportStatus);
        }

        if (exportDataInicio) {
          dadosParaExportar = dadosParaExportar.filter(os => {
            if (!os.data_entrada) return false;
            return os.data_entrada.split('T')[0] >= exportDataInicio;
          });
        }

        if (exportDataFim) {
          dadosParaExportar = dadosParaExportar.filter(os => {
            if (!os.data_entrada) return false;
            return os.data_entrada.split('T')[0] <= exportDataFim;
          });
        }
      }

      // Preparar dados com colunas selecionadas
      const colunasAtivas = exportColumns.filter(c => c.checked);
      
      const dadosFormatados = dadosParaExportar.map(os => {
        const cliente = getClienteById(os.cliente_id);
        const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
        const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
        const valorTotalItens = totaisPorOS[os.id] || 0;
        const valorTotal = valorTotalItens > 0 ? valorTotalItens : Number(os.valor_total || 0);
        
        const row: Record<string, any> = {};
        colunasAtivas.forEach(col => {
          switch (col.id) {
            case 'numero': row['Nº OS'] = os.numero; break;
            case 'situacao': row['Situação'] = os.situacao === 'fechada' ? 'Fechada' : os.situacao === 'cancelada' ? 'Cancelada' : 'Aberta'; break;
            case 'status': row['Status'] = getStatusOSLabel(os.status); break;
            case 'cliente': row['Cliente'] = cliente?.nome || os.cliente_nome || ''; break;
            case 'telefone': row['Telefone'] = os.telefone_contato || cliente?.telefone || ''; break;
            case 'aparelho': row['Aparelho'] = `${modelo?.nome || os.modelo_nome || ''} - ${marca?.nome || os.marca_nome || ''}`; break;
            case 'problema': row['Problema'] = os.descricao_problema || ''; break;
            case 'data_entrada': row['Data Entrada'] = os.data_entrada ? dateFormatters.short(os.data_entrada) : ''; break;
            case 'previsao': row['Previsão'] = os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : ''; break;
            case 'valor': row['Valor'] = valorTotal; break;
            case 'valor_pago': row['Valor Pago'] = Number(os.valor_pago || 0); break;
            case 'imei': row['IMEI'] = os.imei || ''; break;
            case 'observacoes': row['Observações'] = os.observacoes_internas || ''; break;
          }
        });
        return row;
      });

      // Gerar arquivo
      const ws = XLSX.utils.json_to_sheet(dadosFormatados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço');

      const filename = `os_${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === 'xlsx') {
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
      }

      toast({
        title: 'Exportação concluída!',
        description: `${dadosFormatados.length} OS exportadas com sucesso.`,
      });

      setShowExportModal(false);
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: error?.message || 'Ocorreu um erro ao exportar.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = searchTerm || searchField !== 'all' || (statusFilter !== 'all' && statusFilter !== 'abertas') || periodoFilter !== 'all';

  // Cards de estatísticas config (Abertas = não fechadas/canceladas; padrão da tela)
  const countAbertas = useMemo(() => ordens.filter(o => o.situacao !== 'fechada' && o.situacao !== 'cancelada').length, [ordens]);
  const statsCards = [
    { label: 'Total', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Abertas', value: countAbertas, color: 'yellow', filter: 'abertas' },
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
        {/* Mobile: Estatísticas inline compactas */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden flex-shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin">
          {statsCards.slice(0, 5).map((card) => (
            <button
              key={card.filter}
              onClick={() => setStatusFilter(card.filter)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap border",
                statusFilter === card.filter ? `bg-${card.color}-100 border-${card.color}-400 text-${card.color}-700` : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              <span className="font-bold">{card.value}</span>
              <span>{card.label}</span>
            </button>
          ))}
        </div>

        {/* Desktop: Cards de estatísticas */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 shrink-0 mb-3">
          {statsCards.map((card) => (
            <Card 
              key={card.filter}
              className={cn(
                `border-l-4 border-${card.color}-500 cursor-pointer hover:shadow-md transition-all`,
                statusFilter === card.filter ? `bg-${card.color}-50 dark:bg-${card.color}-950/20 ring-2 ring-${card.color}-400` : 'bg-white dark:bg-gray-900',
                'w-[calc(25%-0.5rem)] lg:w-[calc(12.5%-0.5rem)] min-w-[100px]'
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
        {/* Mobile: Filtros compactos */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden flex-shrink-0 bg-white/80 dark:bg-slate-900/50 border border-gray-200 rounded-lg p-2 mb-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar OS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-sm border-gray-200" />
            </div>
            <PermissionGate permission="os.create">
              <Button onClick={() => navigate('/os/nova')} size="sm" className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 flex-1 text-xs border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="abertas">Abertas</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs"><XCircle className="h-3 w-3" /></Button>
            )}
          </div>
        </div>

        {/* Desktop: Barra de filtros completa */}
        <div className="hidden md:block bg-background/95 backdrop-blur-sm shrink-0 shadow-sm rounded-xl mb-3 border border-gray-200/50">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={searchField === 'all' ? "Buscar por nº OS, cliente, aparelho, problema... (clique na coluna)" : `Buscar por ${OS_SEARCH_FIELD_LABELS[searchField]}...`} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className={`h-10 pl-10 text-base border-gray-200 focus:border-blue-400 ${searchField !== 'all' ? 'pr-24' : ''}`} 
                />
                {searchField !== 'all' && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                      {OS_SEARCH_FIELD_LABELS[searchField]}
                    </Badge>
                    <button onClick={() => setSearchField('all')} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[160px] shrink-0 border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="abertas">Abertas</SelectItem>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="h-10 px-3 text-muted-foreground hover:text-foreground">
                <XCircle className="h-4 w-4 mr-1.5" />Limpar
              </Button>
            </div>
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
              <Button onClick={() => setShowExportModal(true)} size="sm" variant="outline" className="h-9 gap-1.5 border-gray-200">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <PermissionGate permission="os.create">
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
                            <th 
                              className={`h-12 px-3 text-center align-middle font-semibold border-r border-gray-200 w-[100px] text-xs uppercase tracking-wide cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'numero' ? 'bg-blue-200 text-blue-700' : 'text-gray-700 dark:text-gray-200'}`}
                              onClick={() => setSearchField(searchField === 'numero' ? 'all' : 'numero')}
                              title="Clique para filtrar por Nº OS"
                            >
                              Nº OS {searchField === 'numero' && <Search className="inline h-3 w-3 ml-1" />}
                            </th>
                            <th 
                              className={`h-12 px-3 text-left align-middle font-semibold border-r border-gray-200 w-[200px] text-xs uppercase tracking-wide cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'cliente' ? 'bg-blue-200 text-blue-700' : 'text-gray-700 dark:text-gray-200'}`}
                              onClick={() => setSearchField(searchField === 'cliente' ? 'all' : 'cliente')}
                              title="Clique para filtrar por Cliente"
                            >
                              Cliente {searchField === 'cliente' && <Search className="inline h-3 w-3 ml-1" />}
                            </th>
                            <th 
                              className={`h-12 px-3 text-left align-middle font-semibold border-r border-gray-200 w-[130px] hidden lg:table-cell text-xs uppercase tracking-wide cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'aparelho' ? 'bg-blue-200 text-blue-700' : 'text-gray-700 dark:text-gray-200'}`}
                              onClick={() => setSearchField(searchField === 'aparelho' ? 'all' : 'aparelho')}
                              title="Clique para filtrar por Aparelho"
                            >
                              Aparelho {searchField === 'aparelho' && <Search className="inline h-3 w-3 ml-1" />}
                            </th>
                            <th 
                              className={`h-12 px-3 text-left align-middle font-semibold border-r border-gray-200 w-[180px] min-w-0 text-xs uppercase tracking-wide cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'problema' ? 'bg-blue-200 text-blue-700' : 'text-gray-700 dark:text-gray-200'}`}
                              onClick={() => setSearchField(searchField === 'problema' ? 'all' : 'problema')}
                              title="Clique para filtrar por Problema"
                            >
                              Problema {searchField === 'problema' && <Search className="inline h-3 w-3 ml-1" />}
                            </th>
                            <th className="h-12 px-3 text-center align-middle font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 w-[160px] text-xs uppercase tracking-wide">Status</th>
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
                                <Badge className={cn('text-xs text-white', getStatusOSColor(os.status))}>
                                  {getStatusOSLabel(os.status)}
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

      {/* Modal de Exportação */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Ordens de Serviço
            </DialogTitle>
            <DialogDescription>
              Configure os filtros e colunas para exportar. Total atual: {filteredOrdens.length} OS.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Presets rápidos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Presets Rápidos
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => applyExportPreset('abertas')} className="text-xs">
                  OS Abertas
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyExportPreset('finalizadas')} className="text-xs">
                  Finalizadas
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyExportPreset('hoje')} className="text-xs">
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyExportPreset('mes')} className="text-xs">
                  Este Mês
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyExportPreset('completo')} className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                  Relatório Completo
                </Button>
              </div>
            </div>

            {/* Atalhos de meses */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Selecionar Período
              </Label>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const meses = [];
                  const hoje = new Date();
                  for (let i = 0; i < 6; i++) {
                    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                    const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                    const ano = data.getFullYear();
                    meses.push({ 
                      label: `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano.toString().slice(-2)}`, 
                      inicio: new Date(data.getFullYear(), data.getMonth(), 1).toISOString().split('T')[0],
                      fim: new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString().split('T')[0]
                    });
                  }
                  return meses.map((mes, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setExportDataInicio(mes.inicio);
                        setExportDataFim(mes.fim);
                        setExportUsarFiltrosAtuais(false);
                      }}
                      className={cn(
                        "text-xs",
                        exportDataInicio === mes.inicio && exportDataFim === mes.fim && "bg-blue-100 border-blue-300"
                      )}
                    >
                      {mes.label}
                    </Button>
                  ));
                })()}
              </div>
            </div>

            {/* Filtros de período personalizado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={exportDataInicio}
                  onChange={(e) => {
                    setExportDataInicio(e.target.value);
                    if (e.target.value) setExportUsarFiltrosAtuais(false);
                  }}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={exportDataFim}
                  onChange={(e) => {
                    setExportDataFim(e.target.value);
                    if (e.target.value) setExportUsarFiltrosAtuais(false);
                  }}
                  className="h-10"
                />
              </div>
            </div>

            {/* Usar filtros atuais da tela */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Checkbox
                  id="usar-filtros"
                  checked={exportUsarFiltrosAtuais}
                  onCheckedChange={(checked) => {
                    setExportUsarFiltrosAtuais(checked === true);
                    if (checked) {
                      setExportDataInicio('');
                      setExportDataFim('');
                      setExportStatus('all');
                    }
                  }}
                />
                <label htmlFor="usar-filtros" className="text-sm cursor-pointer">
                  <span className="font-medium">Usar filtros aplicados na tela</span>
                  <span className="text-blue-600 text-xs ml-2">
                    ({filteredOrdens.length} OS filtradas)
                  </span>
                </label>
              </div>
            )}

            {/* Filtro de status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={exportStatus} onValueChange={(v) => {
                setExportStatus(v);
                if (v !== 'all') setExportUsarFiltrosAtuais(false);
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Colunas para exportar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Colunas para Exportar</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border">
                {exportColumns.map((col) => (
                  <div key={col.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={col.checked}
                      onCheckedChange={() => toggleExportColumn(col.id)}
                    />
                    <label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div className="space-y-2">
              <Label>Formato do Arquivo</Label>
              <Select value={exportFormat} onValueChange={(v: 'xlsx' | 'csv') => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || exportColumns.filter(c => c.checked).length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar {exportUsarFiltrosAtuais ? filteredOrdens.length : 'OS'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
