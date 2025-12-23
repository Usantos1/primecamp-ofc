import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, Search, Edit, Phone, Filter,
  Clock, AlertTriangle, CheckCircle, Wrench, Package, Calendar, X, FileText, Trash2,
  MoreVertical, CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { useMarcasModelos } from '@/hooks/useAssistencia';
import { StatusOS, STATUS_OS_LABELS, STATUS_OS_COLORS } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export default function OrdensServico() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNumeroOS, setSearchNumeroOS] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [showImportarOS, setShowImportarOS] = useState(false);
  const [osToDelete, setOsToDelete] = useState<string | null>(null);
  const [osToReabrir, setOsToReabrir] = useState<{ id: string; motivo: string } | null>(null);
  const { toast } = useToast();
  
  const { ordens, isLoading, getEstatisticas, getOSById, deleteOS: deleteOSMutation, updateOS, updateStatus } = useOrdensServico();
  const { clientes, getClienteById } = useClientes();
  const { getMarcaById, getModeloById } = useMarcasModelos();

  // Buscar todos os itens de todas as OSs para calcular totais
  const { data: todosItens = [] } = useQuery({
    queryKey: ['os_items_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_items')
        .select('ordem_servico_id, valor_total');
      
      if (error) throw error;
      return (data || []) as Array<{ ordem_servico_id: string; valor_total: number }>;
    },
  });

  // Calcular totais por OS
  const totaisPorOS = useMemo(() => {
    const totais: Record<string, number> = {};
    todosItens.forEach(item => {
      const osId = item.ordem_servico_id;
      const valor = Number(item.valor_total || 0);
      totais[osId] = (totais[osId] || 0) + valor;
    });
    return totais;
  }, [todosItens]);

  const stats = getEstatisticas();

  // Buscar OS por número
  useEffect(() => {
    if (searchNumeroOS) {
      const numero = parseInt(searchNumeroOS);
      if (!isNaN(numero)) {
        const os = ordens.find(o => o.numero === numero);
        if (os) {
          navigate(`/pdv/os/${os.id}`);
          setSearchNumeroOS('');
        }
      }
    }
  }, [searchNumeroOS, ordens, navigate]);

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
          os.descricao_problema.toLowerCase().includes(search) ||
          cliente?.nome.toLowerCase().includes(search) ||
          cliente?.telefone?.includes(search) ||
          os.imei?.includes(search)
        );
      });
    }

    if (dataInicio) {
      result = result.filter(os => {
        if (!os.data_entrada) return false;
        const osDate = new Date(os.data_entrada.split('T')[0]);
        const inicioDate = new Date(dataInicio);
        inicioDate.setHours(0, 0, 0, 0);
        osDate.setHours(0, 0, 0, 0);
        return osDate >= inicioDate;
      });
    }

    if (dataFim) {
      result = result.filter(os => {
        if (!os.data_entrada) return false;
        const osDate = new Date(os.data_entrada.split('T')[0]);
        const fimDate = new Date(dataFim);
        fimDate.setHours(23, 59, 59, 999);
        osDate.setHours(0, 0, 0, 0);
        return osDate <= fimDate;
      });
    }

    return result.sort((a, b) => b.numero - a.numero);
  }, [ordens, statusFilter, searchTerm, dataInicio, dataFim, getClienteById]);

  // Filtros rápidos
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const osHoje = ordens.filter(os => {
    if (!os.data_entrada) return false;
    return os.data_entrada.split('T')[0] === hojeStr;
  });
  
  const osAtrasadas = ordens.filter(os => {
    if (!os.previsao_entrega) return false;
    const previsaoDate = os.previsao_entrega.split('T')[0];
    return previsaoDate < hojeStr && !['finalizada', 'entregue', 'cancelada'].includes(os.status);
  });
  
  const osPrazoHoje = ordens.filter(os => {
    if (!os.previsao_entrega) return false;
    const previsaoDate = os.previsao_entrega.split('T')[0];
    return previsaoDate === hojeStr && !['finalizada', 'entregue', 'cancelada'].includes(os.status);
  });

  const handleWhatsApp = (telefone?: string) => {
    if (telefone) {
      const numero = telefone.replace(/\D/g, '');
      window.open(`https://wa.me/55${numero}`, '_blank');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDataInicio(undefined);
    setDataFim(undefined);
    setPeriodoFilter('all');
  };

  const handlePeriodoFilter = (periodo: string) => {
    setPeriodoFilter(periodo);
    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);
    
    switch (periodo) {
      case 'hoje':
        setDataInicio(hojeDate);
        setDataFim(new Date(hojeDate));
        break;
      case 'semana':
        const inicioSemana = new Date(hojeDate);
        inicioSemana.setDate(hojeDate.getDate() - hojeDate.getDay());
        setDataInicio(inicioSemana);
        setDataFim(hojeDate);
        break;
      case 'mes':
        const inicioMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1);
        setDataInicio(inicioMes);
        setDataFim(hojeDate);
        break;
      case 'all':
        setDataInicio(undefined);
        setDataFim(undefined);
        break;
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dataInicio || dataFim || periodoFilter !== 'all';

  return (
    <ModernLayout title="Ordens de Serviço" subtitle="Gestão de assistência técnica">
      <div className="flex flex-col h-[calc(100vh-4rem-1rem)] md:h-[calc(100vh-5rem-1rem)] -mx-4 -mt-4 -mb-4">
        {/* Cards de estatísticas - shrink-0 para não encolher */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 shrink-0 px-4 md:px-4 pt-3 md:pt-4 pb-2 md:pb-3">
          <Card className="border-2 border-l-4 border-l-blue-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-blue-50/50 dark:bg-blue-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('all')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-muted-foreground font-medium md:mb-0">Total:</p>
                <p className="text-base md:text-2xl font-bold md:mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-yellow-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-yellow-50/50 dark:bg-yellow-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('aberta')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-yellow-600 font-medium md:mb-0">Abertas:</p>
                <p className="text-base md:text-2xl font-bold text-yellow-600 md:mt-1">{stats.abertas}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-purple-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-purple-50/50 dark:bg-purple-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('em_andamento')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-purple-600 font-medium md:mb-0">Em Andamento:</p>
                <p className="text-base md:text-2xl font-bold text-purple-600 md:mt-1">{stats.emAndamento}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-orange-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-orange-50/50 dark:bg-orange-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('aguardando_orcamento')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-orange-600 font-medium md:mb-0">Aguardando:</p>
                <p className="text-base md:text-2xl font-bold text-orange-600 md:mt-1">{stats.aguardando || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-emerald-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-emerald-50/50 dark:bg-emerald-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('finalizada')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-emerald-600 font-medium md:mb-0">Finalizadas:</p>
                <p className="text-base md:text-2xl font-bold text-emerald-600 md:mt-1">{stats.finalizadas}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-cyan-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-cyan-50/50 dark:bg-cyan-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('aguardando_retirada')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-cyan-600 font-medium md:mb-0">Ag. Retirada:</p>
                <p className="text-base md:text-2xl font-bold text-cyan-600 md:mt-1">{ordens.filter(o => o.status === 'aguardando_retirada').length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-gray-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-gray-50/50 dark:bg-gray-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('entregue')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-gray-600 font-medium md:mb-0">Entregues:</p>
                <p className="text-base md:text-2xl font-bold text-gray-600 md:mt-1">{stats.entregues || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-red-400 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-red-50/50 dark:bg-red-950/10 md:bg-transparent md:dark:bg-transparent w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]" onClick={() => setStatusFilter('cancelada')}>
            <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
              <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                <p className="text-xs md:text-xs text-red-600 font-medium md:mb-0">Canceladas:</p>
                <p className="text-base md:text-2xl font-bold text-red-600 md:mt-1">{stats.canceladas || 0}</p>
              </div>
            </CardContent>
          </Card>

          {stats.atrasadas > 0 && (
            <Card className="border-2 border-l-4 border-l-red-500 border-red-300 bg-red-50 dark:bg-red-950/20 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 w-[calc(50%-0.25rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(11.11%-0.67rem)] min-w-[140px] max-w-[200px]">
              <CardContent className="pt-2 pb-2 md:pt-3 md:pb-3 px-2 md:px-6">
                <div className="flex items-center justify-center md:flex-col md:items-center md:justify-center">
                  <p className="text-xs md:text-xs text-red-600 font-medium md:mb-0">Atrasadas:</p>
                  <p className="text-base md:text-2xl font-bold text-red-600 md:mt-1">{stats.atrasadas}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Barra de filtros e ações - fixa no topo */}
        <div className="sticky top-0 z-30 bg-background border-b-2 border-gray-300 shadow-sm shrink-0">
          {/* Filtros rápidos - linha superior */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-nowrap px-4 md:px-3 py-2">
            <Button 
              variant={!hasActiveFilters ? 'default' : 'outline'} 
              size="sm"
              onClick={clearFilters}
              className="h-9 shrink-0 px-3 text-xs whitespace-nowrap border-2 border-gray-300"
            >
              Todas
            </Button>
            <Button 
              variant={periodoFilter === 'hoje' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1.5 h-9 shrink-0 px-3 whitespace-nowrap border-2 border-gray-300"
              onClick={() => handlePeriodoFilter('hoje')}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs">Hoje</span>
              <span className="text-xs opacity-70">({osHoje.length})</span>
            </Button>
            <Button 
              variant={periodoFilter === 'semana' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1.5 h-9 shrink-0 px-3 whitespace-nowrap border-2 border-gray-300"
              onClick={() => handlePeriodoFilter('semana')}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs">Semana</span>
            </Button>
            <Button 
              variant={periodoFilter === 'mes' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1.5 h-9 shrink-0 px-3 whitespace-nowrap border-2 border-gray-300"
              onClick={() => handlePeriodoFilter('mes')}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs">Mês</span>
            </Button>
            
            {/* Caixa de pesquisa - no meio */}
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº OS, cliente, telefone, IMEI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm w-full border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            
            {/* Status e ações - continua na mesma linha no mobile */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[120px] md:w-[160px] shrink-0 text-xs border-2 border-gray-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Botões de ação */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 shrink-0 px-2 border-2 border-gray-300">
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0 hidden md:block"></div>
              
              <PermissionGate permission="os.create">
                <Button 
                  onClick={() => setShowImportarOS(true)} 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 h-9 shrink-0 px-3 border-2 border-gray-300"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-xs whitespace-nowrap font-semibold">Importar OS</span>
                </Button>
                <Button 
                  onClick={() => navigate('/pdv/os/nova')} 
                  size="sm" 
                  className="gap-1.5 h-9 shrink-0 px-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs whitespace-nowrap font-semibold">Nova OS</span>
                </Button>
              </PermissionGate>
            </div>
          </div>
          
          {/* Filtros avançados (colapsável) */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/50 border-t">
              <div className="space-y-1">
                <label className="text-xs font-medium">Data Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 w-[200px] justify-start text-left font-normal text-xs ${!dataInicio && "text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Data Fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 w-[200px] justify-start text-left font-normal text-xs ${!dataFim && "text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Área da tabela - apenas o corpo rola */}
        <div className="flex-1 min-h-0 px-2 md:px-4 pb-3 md:pb-4">
          <Card className="h-full flex flex-col overflow-hidden border-2 border-gray-300">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : filteredOrdens.length === 0 ? (
                <div className="p-8 md:p-12 text-center">
                  <EmptyState
                    icon={<Package className="h-12 w-12" />}
                    title="Nenhuma ordem de serviço"
                    description={searchTerm ? 'Tente buscar por outro termo' : 'Cadastre uma nova OS para começar.'}
                    action={!searchTerm ? { label: 'Nova OS', onClick: () => navigate('/pdv/os/nova') } : undefined}
                  />
                </div>
              ) : (
                <>
                  {/* Cards no mobile, tabela no desktop */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Cards Mobile */}
                    <div className="md:hidden flex-1 overflow-y-auto space-y-3 p-2">
                      {filteredOrdens.map((os, index) => {
                        const cliente = getClienteById(os.cliente_id);
                        const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
                        const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
                        const isAtrasada = os.previsao_entrega && 
                          os.previsao_entrega.split('T')[0] < hojeStr && 
                          !['finalizada', 'entregue', 'cancelada'].includes(os.status);
                        
                        const valorTotalItens = totaisPorOS[os.id] || 0;
                        const valorTotalOS = Number(os.valor_total || 0);
                        const valorTotal = valorTotalItens > 0 ? valorTotalItens : (valorTotalOS > 0 ? valorTotalOS : 0);
                        const valorPago = Number(os.valor_pago || 0);
                        const temSaldoPendente = valorTotal > 0 && valorPago < valorTotal;
                        
                        return (
                          <Card 
                            key={os.id}
                            className={cn(
                              "border-2 border-gray-300 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]",
                              isAtrasada && 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            )}
                            onClick={() => navigate(`/pdv/os/${os.id}`)}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Header com Nº OS e Status */}
                              <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-primary text-base">#{os.numero}</p>
                                  <Badge className={cn('text-xs text-white', STATUS_OS_COLORS[os.status as StatusOS] || 'bg-gray-500')}>
                                    {STATUS_OS_LABELS[os.status as StatusOS] || os.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/pdv/os/${os.id}`);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/pdv/os/${os.id}`);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Cliente */}
                              <div className="border-b border-gray-200 pb-2">
                                <p className="font-medium text-sm">{cliente?.nome || os.cliente_nome || '-'}</p>
                                {cliente?.cpf_cnpj && <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>}
                                {(cliente?.telefone || os.telefone_contato) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-auto p-0 text-green-600 hover:text-green-700 text-xs mt-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWhatsApp(os.telefone_contato || cliente?.whatsapp || cliente?.telefone);
                                    }}
                                  >
                                    <Phone className="h-3 w-3 mr-1 inline" />
                                    {os.telefone_contato || cliente?.telefone}
                                  </Button>
                                )}
                              </div>
                              
                              {/* Aparelho */}
                              {(modelo?.nome || os.modelo_nome || marca?.nome || os.marca_nome) && (
                                <div className="border-b border-gray-200 pb-2">
                                  <p className="text-xs text-muted-foreground">Aparelho</p>
                                  <p className="font-medium text-sm">{modelo?.nome || os.modelo_nome || '-'}</p>
                                  <p className="text-xs text-muted-foreground">{marca?.nome || os.marca_nome || '-'}</p>
                                </div>
                              )}
                              
                              {/* Problema */}
                              {os.descricao_problema && (
                                <div className="border-b border-gray-200 pb-2">
                                  <p className="text-xs text-muted-foreground">Problema</p>
                                  <p className="text-sm line-clamp-2">{os.descricao_problema}</p>
                                </div>
                              )}
                              
                              {/* Datas e Valor */}
                              <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
                                <div className="space-y-1">
                                  {os.data_entrada && (
                                    <p className="text-xs text-muted-foreground">
                                      Entrada: {dateFormatters.short(os.data_entrada)}
                                    </p>
                                  )}
                                  {os.previsao_entrega && (
                                    <p className={cn("text-xs", isAtrasada ? "text-red-600 font-medium" : "text-muted-foreground")}>
                                      Previsão: {dateFormatters.short(os.previsao_entrega)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {valorTotal > 0 ? (
                                    <div>
                                      <p className="font-semibold text-green-600 text-sm">
                                        {currencyFormatters.brl(valorTotal)}
                                      </p>
                                      {temSaldoPendente && valorPago > 0 && (
                                        <p className="text-xs text-orange-600">
                                          Pago: {currencyFormatters.brl(valorPago)}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* Tabela Desktop */}
                    <div className="hidden md:flex flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                      <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                        {/* Cabeçalho fixo */}
                        <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm">
                          <tr className="border-b-2 border-gray-300">
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[90px]">Nº OS</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[160px]">Cliente</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[130px] hidden md:table-cell">Aparelho</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[180px]">Problema</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[110px]">Status</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[115px] hidden md:table-cell">Entrada</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[115px] hidden md:table-cell">Previsão</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[100px]">Valor</th>
                            <th className="h-11 px-2 text-center align-middle font-semibold text-foreground bg-muted/60 w-[90px]">Ações</th>
                          </tr>
                        </thead>
                        {/* Corpo da tabela */}
                        <tbody>
                          {filteredOrdens.map((os, index) => {
                            const cliente = getClienteById(os.cliente_id);
                            const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
                            const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
                            const isAtrasada = os.previsao_entrega && 
                              os.previsao_entrega.split('T')[0] < hojeStr && 
                              !['finalizada', 'entregue', 'cancelada'].includes(os.status);
                            
                            const zebraClass = index % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                            // Calcular valor total: usar o total dos itens (mais confiável) ou o valor_total da OS como fallback
                            const valorTotalItens = totaisPorOS[os.id] || 0;
                            const valorTotalOS = Number(os.valor_total || 0);
                            // Priorizar o total calculado dos itens, mas usar valor_total da OS se os itens não tiverem valor
                            // Se ambos forem 0, mostrar 0 mesmo assim
                            const valorTotal = valorTotalItens > 0 ? valorTotalItens : (valorTotalOS > 0 ? valorTotalOS : 0);
                            const valorPago = Number(os.valor_pago || 0);
                            const temSaldoPendente = valorTotal > 0 && valorPago < valorTotal;
                            
                            // Debug: logar valores para diagnóstico (apenas primeira OS)
                            if (index === 0) {
                              console.log('[OrdensServico] Debug valores:', {
                                osId: os.id,
                                osNumero: os.numero,
                                valorTotalItens,
                                valorTotalOS,
                                valorTotal,
                                valorPago,
                                temSaldoPendente,
                                osItemsCount: todosItens.filter(i => i.ordem_servico_id === os.id).length,
                                situacao: os.situacao,
                                status: os.status
                              });
                            }
                            
                            return (
                              <tr 
                                key={os.id} 
                                className={cn(
                                  zebraClass,
                                  isAtrasada && 'bg-red-50 dark:bg-red-950/20',
                                  'cursor-pointer hover:bg-muted/60 border-b border-gray-200 transition-colors'
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/pdv/os/${os.id}`);
                                }}
                              >
                                {/* Nº OS */}
                                <td className="font-bold text-primary py-3.5 px-2 text-center border-r border-gray-200">
                                  <div className="flex flex-col items-center">
                                    <span>{os.numero}</span>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        'text-xs mt-1',
                                        os.situacao === 'fechada' ? 'border-green-500 text-green-700 bg-green-50' :
                                        os.situacao === 'cancelada' ? 'border-red-500 text-red-700 bg-red-50' :
                                        'border-blue-500 text-blue-700 bg-blue-50'
                                      )}
                                    >
                                      {os.situacao === 'fechada' ? 'Fechada' : 
                                       os.situacao === 'cancelada' ? 'Cancelada' : 
                                       'Aberta'}
                                    </Badge>
                                  </div>
                                </td>
                                
                                {/* Cliente */}
                                <td className="py-3.5 px-2 text-left border-r border-gray-200">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{cliente?.nome || os.cliente_nome || '-'}</p>
                                    {cliente?.telefone || os.telefone_contato ? (
                                      <p className="text-xs text-muted-foreground truncate">
                                        Telefone: {cliente?.telefone || os.telefone_contato}
                                      </p>
                                    ) : null}
                                    {cliente?.cpf_cnpj && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        CPF: {cliente.cpf_cnpj}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Aparelho */}
                                <td className="py-3.5 px-2 text-left border-r border-gray-200 hidden md:table-cell">
                                  <div>
                                    <p className="font-medium text-sm">{modelo?.nome || os.modelo_nome || '-'}</p>
                                    <p className="text-xs text-muted-foreground">{marca?.nome || os.marca_nome || '-'}</p>
                                  </div>
                                </td>
                                
                                {/* Problema */}
                                <td className="py-3.5 px-2 text-left border-r border-gray-200">
                                  <div className="text-sm line-clamp-2 break-words">
                                    {os.descricao_problema || '-'}
                                  </div>
                                </td>
                                
                                {/* Status */}
                                <td className="py-3.5 px-2 text-center border-r border-gray-200">
                                  <Badge className={cn('text-xs text-white', STATUS_OS_COLORS[os.status as StatusOS] || 'bg-gray-500')}>
                                    {STATUS_OS_LABELS[os.status as StatusOS] || os.status}
                                  </Badge>
                                </td>
                                
                                {/* Entrada */}
                                <td className="py-3.5 px-2 text-center text-sm border-r border-gray-200 hidden md:table-cell">
                                  <div>
                                    {os.data_entrada ? (
                                      <>
                                        <p className="font-medium">{dateFormatters.short(os.data_entrada)}</p>
                                        {os.hora_entrada ? (
                                          <p className="text-xs text-muted-foreground">Horário: {os.hora_entrada}</p>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">Horário: 00:00:00</p>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Previsão */}
                                <td className="py-3.5 px-2 text-center text-sm border-r border-gray-200 hidden md:table-cell">
                                  {os.previsao_entrega ? (
                                    <div>
                                      <p className={cn("font-medium", isAtrasada && 'text-red-600')}>
                                        {dateFormatters.short(os.previsao_entrega)}
                                      </p>
                                      {os.hora_previsao ? (
                                        <p className={cn("text-xs", isAtrasada ? "text-red-600" : "text-muted-foreground")}>
                                          Horário: {os.hora_previsao}
                                        </p>
                                      ) : (
                                        <p className={cn("text-xs", isAtrasada ? "text-red-600" : "text-muted-foreground")}>
                                          Horário: 00:00:00
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                
                                {/* Valor */}
                                <td className="py-3.5 px-2 text-center border-r border-gray-200">
                                  {valorTotal > 0 || valorTotalOS > 0 || valorTotalItens > 0 ? (
                                    <div>
                                      <p className="font-semibold text-green-600">
                                        {currencyFormatters.brl(valorTotal)}
                                      </p>
                                      {temSaldoPendente && valorPago > 0 && (
                                        <p className="text-xs text-orange-600">
                                          Pago: {currencyFormatters.brl(valorPago)}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </td>
                                
                                {/* Ações */}
                                <td className="py-3.5 px-2 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/pdv/os/${os.id}`);
                                        }}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                      </DropdownMenuItem>
                                      
                                      {os.status !== 'finalizada' && (
                                        <DropdownMenuItem
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await updateStatus(os.id, 'finalizada');
                                              toast({
                                                title: 'OS Finalizada',
                                                description: `OS #${os.numero} foi finalizada com sucesso.`,
                                              });
                                            } catch (error) {
                                              toast({
                                                title: 'Erro',
                                                description: 'Não foi possível finalizar a OS.',
                                                variant: 'destructive',
                                              });
                                            }
                                          }}
                                        >
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Finalizar
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {os.status !== 'entregue' && (
                                        <DropdownMenuItem
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await updateStatus(os.id, 'entregue');
                                              toast({
                                                title: 'OS Entregue',
                                                description: `OS #${os.numero} foi marcada como entregue sem reparo.`,
                                              });
                                            } catch (error) {
                                              toast({
                                                title: 'Erro',
                                                description: 'Não foi possível marcar como entregue.',
                                                variant: 'destructive',
                                              });
                                            }
                                          }}
                                        >
                                          <Package className="mr-2 h-4 w-4" />
                                          Entregue sem reparo
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {(os.situacao === 'fechada' || os.status === 'entregue' || os.status === 'finalizada' || os.status === 'cancelada') && (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOsToReabrir({ id: os.id, motivo: '' });
                                          }}
                                        >
                                          <RotateCcw className="mr-2 h-4 w-4" />
                                          Reabrir OS
                                        </DropdownMenuItem>
                                      )}
                                      
                                      <PermissionGate permission="os.delete">
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOsToDelete(os.id);
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </PermissionGate>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportarOS
        open={showImportarOS}
        onOpenChange={setShowImportarOS}
        onSuccess={() => {
          // Recarregar a página para atualizar a lista
          window.location.reload();
        }}
      />
      
      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={osToDelete !== null} onOpenChange={(open) => !open && setOsToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta OS? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (osToDelete) {
                  try {
                    await deleteOSMutation.mutateAsync(osToDelete);
                    toast({
                      title: 'Sucesso',
                      description: 'OS excluída com sucesso!',
                    });
                    setOsToDelete(null);
                  } catch (error: any) {
                    toast({
                      title: 'Erro',
                      description: error.message || 'Erro ao excluir OS',
                      variant: 'destructive',
                    });
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

      {/* Dialog de reabertura de OS */}
      <Dialog open={osToReabrir !== null} onOpenChange={(open) => !open && setOsToReabrir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir OS</DialogTitle>
            <DialogDescription>
              Informe o motivo da reabertura da OS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-reabertura">Motivo da Reabertura</Label>
              <Textarea
                id="motivo-reabertura"
                placeholder="Descreva o motivo da reabertura..."
                value={osToReabrir?.motivo || ''}
                onChange={(e) => setOsToReabrir(osToReabrir ? { ...osToReabrir, motivo: e.target.value } : null)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOsToReabrir(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (osToReabrir && osToReabrir.motivo.trim()) {
                  try {
                    const osReabrir = ordens.find(o => o.id === osToReabrir.id);
                    await updateOS(osToReabrir.id, {
                      status: 'aberta',
                      situacao: 'aberta',
                      observacoes_internas: osToReabrir.motivo
                        ? `${osToReabrir.motivo}${osReabrir?.observacoes_internas ? `\n\n${osReabrir.observacoes_internas}` : ''}`
                        : osReabrir?.observacoes_internas,
                    });
                    toast({
                      title: 'OS Reaberta',
                      description: `OS #${osReabrir?.numero || osToReabrir.id} foi reaberta com sucesso.`,
                    });
                    setOsToReabrir(null);
                  } catch (error) {
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível reabrir a OS.',
                      variant: 'destructive',
                    });
                  }
                } else {
                  toast({
                    title: 'Atenção',
                    description: 'Por favor, informe o motivo da reabertura.',
                    variant: 'destructive',
                  });
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
