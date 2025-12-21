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
  Plus, Search, Eye, Edit, Phone, Filter,
  Clock, AlertTriangle, CheckCircle, Wrench, Package, Calendar, X
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export default function OrdensServico() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNumeroOS, setSearchNumeroOS] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  
  const { ordens, isLoading, getEstatisticas, getOSById } = useOrdensServico();
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0 px-4 pt-4 pb-3">
          <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('all')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('aberta')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-yellow-600">Abertas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.abertas}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('em_andamento')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-purple-600">Em Andamento</p>
              <p className="text-2xl font-bold text-purple-600">{stats.emAndamento}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('aguardando_orcamento')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-orange-600">Aguardando</p>
              <p className="text-2xl font-bold text-orange-600">{stats.aguardando || 0}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('finalizada')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-emerald-600">Finalizadas</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.finalizadas}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('aguardando_retirada')}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-cyan-600">Ag. Retirada</p>
              <p className="text-2xl font-bold text-cyan-600">{ordens.filter(o => o.status === 'aguardando_retirada').length}</p>
            </CardContent>
          </Card>

          {stats.atrasadas > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer hover:shadow-md">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-red-600">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.atrasadas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Barra de filtros e ações - fixa no topo */}
        <div className="sticky top-0 z-30 bg-background border-b shadow-sm shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-wrap md:flex-nowrap px-3 py-2">
            {/* Filtros rápidos */}
            <Button 
              variant={!hasActiveFilters ? 'default' : 'outline'} 
              size="sm"
              onClick={clearFilters}
              className="h-9 shrink-0 px-2"
            >
              Todas
            </Button>
            <Button 
              variant={periodoFilter === 'hoje' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1 h-9 shrink-0 px-2"
              onClick={() => handlePeriodoFilter('hoje')}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden lg:inline text-xs">Hoje ({osHoje.length})</span>
            </Button>
            <Button 
              variant={periodoFilter === 'semana' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1 h-9 shrink-0 px-2"
              onClick={() => handlePeriodoFilter('semana')}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden lg:inline text-xs">Esta Semana</span>
            </Button>
            <Button 
              variant={periodoFilter === 'mes' ? 'default' : 'outline'} 
              size="sm" 
              className="gap-1 h-9 shrink-0 px-2"
              onClick={() => handlePeriodoFilter('mes')}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden lg:inline text-xs">Este Mês</span>
            </Button>
            
            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº OS, cliente, telefone, IMEI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            
            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px] shrink-0 text-xs">
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 shrink-0 px-2">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            
            <div className="w-px h-5 bg-border mx-0.5 shrink-0"></div>
            
            <Button onClick={() => navigate('/pdv/os/nova')} size="sm" className="gap-1 h-9 shrink-0 px-2">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-xs">Nova OS</span>
            </Button>
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
        <div className="flex-1 min-h-0 px-4 pb-4">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : filteredOrdens.length === 0 ? (
                <div className="p-12 text-center">
                  <EmptyState
                    icon={<Package className="h-12 w-12" />}
                    title="Nenhuma ordem de serviço"
                    description={searchTerm ? 'Tente buscar por outro termo' : 'Cadastre uma nova OS para começar.'}
                    action={!searchTerm ? { label: 'Nova OS', onClick: () => navigate('/pdv/os/nova') } : undefined}
                  />
                </div>
              ) : (
                <>
                  {/* Estrutura da tabela com cabeçalho fixo e scroll no corpo */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Container da tabela com scroll apenas vertical */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                      <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                        {/* Cabeçalho fixo */}
                        <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm">
                          <tr className="border-b-2 border-gray-300">
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[90px]">Nº OS</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 min-w-[180px]">Cliente</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[140px] hidden lg:table-cell">Contato</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[160px] hidden md:table-cell">Aparelho</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 min-w-[200px]">Problema</th>
                            <th className="h-11 px-3 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[130px]">Status</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[110px] hidden md:table-cell">Entrada</th>
                            <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[110px] hidden md:table-cell">Previsão</th>
                            <th className="h-11 px-3 text-right align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[120px]">Valor</th>
                            <th className="h-11 px-3 text-center align-middle font-semibold text-foreground bg-muted/60 w-[90px]">Ações</th>
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
                                <td className="font-bold text-primary py-3.5 px-3 text-left border-r border-gray-200">
                                  #{os.numero}
                                </td>
                                
                                {/* Cliente */}
                                <td className="py-3.5 px-3 text-left border-r border-gray-200">
                                  <div>
                                    <p className="font-medium">{cliente?.nome || os.cliente_nome || '-'}</p>
                                    {cliente?.cpf_cnpj && <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>}
                                  </div>
                                </td>
                                
                                {/* Contato */}
                                <td className="py-3.5 px-3 text-left border-r border-gray-200 hidden lg:table-cell">
                                  {(cliente?.telefone || os.telefone_contato) && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-auto p-0 text-green-600 hover:text-green-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleWhatsApp(os.telefone_contato || cliente?.whatsapp || cliente?.telefone);
                                      }}
                                    >
                                      <Phone className="h-3 w-3 mr-1 inline" />
                                      <span className="text-xs">{os.telefone_contato || cliente?.telefone}</span>
                                    </Button>
                                  )}
                                </td>
                                
                                {/* Aparelho */}
                                <td className="py-3.5 px-3 text-left border-r border-gray-200 hidden md:table-cell">
                                  <div>
                                    <p className="font-medium text-sm">{modelo?.nome || os.modelo_nome || '-'}</p>
                                    <p className="text-xs text-muted-foreground">{marca?.nome || os.marca_nome || '-'}</p>
                                  </div>
                                </td>
                                
                                {/* Problema */}
                                <td className="py-3.5 px-3 text-left border-r border-gray-200">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="truncate">
                                          {os.descricao_problema || '-'}
                                        </div>
                                      </TooltipTrigger>
                                      {os.descricao_problema && os.descricao_problema.length > 30 && (
                                        <TooltipContent>
                                          <p className="max-w-xs">{os.descricao_problema}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                
                                {/* Status */}
                                <td className="py-3.5 px-3 text-center border-r border-gray-200">
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge className={cn('text-xs text-white', STATUS_OS_COLORS[os.status as StatusOS] || 'bg-gray-500')}>
                                      {STATUS_OS_LABELS[os.status as StatusOS] || os.status}
                                    </Badge>
                                    {os.situacao && (
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          'text-xs',
                                          os.situacao === 'fechada' ? 'border-green-500 text-green-700 bg-green-50' :
                                          os.situacao === 'cancelada' ? 'border-red-500 text-red-700 bg-red-50' :
                                          'border-blue-500 text-blue-700 bg-blue-50'
                                        )}
                                      >
                                        {os.situacao === 'fechada' ? 'Fechada' : 
                                         os.situacao === 'cancelada' ? 'Cancelada' : 
                                         'Aberta'}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Entrada */}
                                <td className="py-3.5 px-3 text-left text-sm border-r border-gray-200 hidden md:table-cell">
                                  {dateFormatters.short(os.data_entrada)}
                                </td>
                                
                                {/* Previsão */}
                                <td className="py-3.5 px-3 text-left text-sm border-r border-gray-200 hidden md:table-cell">
                                  {os.previsao_entrega ? (
                                    <span className={cn(isAtrasada && 'text-red-600 font-medium')}>
                                      {dateFormatters.short(os.previsao_entrega)}
                                    </span>
                                  ) : '-'}
                                </td>
                                
                                {/* Valor */}
                                <td className="py-3.5 px-3 text-right border-r border-gray-200">
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
                                <td className="py-3.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/pdv/os/${os.id}`);
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/pdv/os/${os.id}`);
                                      }}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
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

    </ModernLayout>
  );
}
