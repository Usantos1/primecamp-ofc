import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Search, Eye, Edit, Phone, Filter,
  Clock, AlertTriangle, CheckCircle, Wrench, Package, Calendar
} from 'lucide-react';
import { useOrdensServico, useClientes, useMarcasModelos } from '@/hooks/useAssistencia';
import { StatusOS, STATUS_OS_LABELS, STATUS_OS_COLORS } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function OrdensServico() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNumeroOS, setSearchNumeroOS] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const { ordens, isLoading, getEstatisticas, getOSById } = useOrdensServico();
  const { clientes, getClienteById } = useClientes();
  const { getMarcaById, getModeloById } = useMarcasModelos();

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
        // Normalizar data_entrada para comparação (remover hora se houver)
        const osDate = os.data_entrada.split('T')[0];
        return osDate >= dataInicio;
      });
    }

    if (dataFim) {
      result = result.filter(os => {
        if (!os.data_entrada) return false;
        // Normalizar data_entrada para comparação (remover hora se houver)
        const osDate = os.data_entrada.split('T')[0];
        return osDate <= dataFim;
      });
    }

    return result.sort((a, b) => b.numero - a.numero);
  }, [ordens, statusFilter, searchTerm, dataInicio, dataFim, getClienteById]);

  // Filtros rápidos
  const hoje = new Date().toISOString().split('T')[0];
  const osHoje = ordens.filter(os => os.data_entrada === hoje);
  const osAtrasadas = ordens.filter(os => {
    if (!os.previsao_entrega) return false;
    const previsaoDate = os.previsao_entrega.split('T')[0];
    return previsaoDate < hoje && !['finalizada', 'entregue', 'cancelada'].includes(os.status);
  });
  const osPrazoHoje = ordens.filter(os => {
    if (!os.previsao_entrega) return false;
    const previsaoDate = os.previsao_entrega.split('T')[0];
    return previsaoDate === hoje && !['finalizada', 'entregue', 'cancelada'].includes(os.status);
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
    setDataInicio('');
    setDataFim('');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dataInicio || dataFim;

  return (
    <ModernLayout title="Ordens de Serviço" subtitle="Gestão de assistência técnica">
      <div className="space-y-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
              <p className="text-2xl font-bold text-orange-600">{stats.aguardando}</p>
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

        {/* Filtros rápidos por prazo */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={!hasActiveFilters ? 'default' : 'outline'} 
            size="sm"
            onClick={clearFilters}
          >
            Todas
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => { setDataInicio(hoje); setDataFim(hoje); }}
          >
            <Calendar className="h-4 w-4" />
            Hoje ({osHoje.length})
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            onClick={() => { /* filtrar prazo hoje */ }}
          >
            <Clock className="h-4 w-4" />
            Prazo Hoje ({osPrazoHoje.length})
          </Button>
          {osAtrasadas.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Em Atraso ({osAtrasadas.length})
            </Button>
          )}
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg">Lista de Ordens de Serviço</CardTitle>
              <Button onClick={() => navigate('/pdv/os/nova')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova OS
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº OS, cliente, telefone, IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº OS..."
                  value={searchNumeroOS}
                  onChange={(e) => setSearchNumeroOS(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchNumeroOS) {
                      const numero = parseInt(searchNumeroOS);
                      if (!isNaN(numero)) {
                        const os = ordens.find(o => o.numero === numero);
                        if (os) {
                          navigate(`/pdv/os/${os.id}`);
                          setSearchNumeroOS('');
                        }
                      }
                    }
                  }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filtros avançados */}
            {showFilters && (
              <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Início</label>
                  <Input 
                    type="date" 
                    value={dataInicio} 
                    onChange={(e) => setDataInicio(e.target.value)} 
                    className="w-auto" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Input 
                    type="date" 
                    value={dataFim} 
                    onChange={(e) => setDataFim(e.target.value)} 
                    className="w-auto" 
                  />
                </div>
              </div>
            )}

            {/* Tabela de OS */}
            {filteredOrdens.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Nenhuma ordem de serviço"
                description="Cadastre uma nova OS para começar."
                action={{ label: 'Nova OS', onClick: () => navigate('/pdv/os/nova') }}
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Nº OS</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Aparelho</TableHead>
                      <TableHead>Problema</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Previsão</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrdens.map((os) => {
                      const cliente = getClienteById(os.cliente_id);
                      const marca = os.marca_id ? getMarcaById(os.marca_id) : null;
                      const modelo = os.modelo_id ? getModeloById(os.modelo_id) : null;
                      const isAtrasada = os.previsao_entrega && 
                        os.previsao_entrega.split('T')[0] < hoje && 
                        !['finalizada', 'entregue', 'cancelada'].includes(os.status);
                      
                      return (
                        <TableRow 
                          key={os.id} 
                          className={cn(
                            isAtrasada && 'bg-red-50 dark:bg-red-950/20',
                            'cursor-pointer hover:bg-muted/50'
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/pdv/os/${os.id}`);
                          }}
                        >
                          <TableCell className="font-bold text-primary">#{os.numero}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cliente?.nome || os.cliente_nome || '-'}</p>
                              {cliente?.cpf_cnpj && <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
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
                                <Phone className="h-3 w-3 mr-1" />
                                {os.telefone_contato || cliente?.telefone}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{modelo?.nome || os.modelo_nome || '-'}</p>
                              <p className="text-xs text-muted-foreground">{marca?.nome || os.marca_nome}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate">{os.descricao_problema}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs text-white', STATUS_OS_COLORS[os.status])}>
                              {STATUS_OS_LABELS[os.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {dateFormatters.short(os.data_entrada)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {os.previsao_entrega ? (
                              <span className={cn(isAtrasada && 'text-red-600 font-medium')}>
                                {dateFormatters.short(os.previsao_entrega)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {os.valor_total > 0 ? currencyFormatters.brl(os.valor_total) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </ModernLayout>
  );
}
