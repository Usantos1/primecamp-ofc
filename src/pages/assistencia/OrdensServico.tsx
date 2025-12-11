import { useState, useMemo } from 'react';
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
  Clock, AlertTriangle, CheckCircle, Truck, Calendar,
  Smartphone, Wrench
} from 'lucide-react';
import { useOrdensServico, useClientes } from '@/hooks/useAssistencia';
import { STATUS_OS_LABELS, STATUS_OS_COLORS, StatusOS } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function OrdensServico() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [prazoFilter, setPrazoFilter] = useState<string>('all');
  
  const { ordens, isLoading } = useOrdensServico();
  const { clientes } = useClientes();

  // Filtrar ordens
  const filteredOrdens = useMemo(() => {
    let filtered = ordens;

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(o => {
        const cliente = clientes.find(c => c.id === o.cliente_id);
        return (
          o.numero.toString().includes(search) ||
          cliente?.nome.toLowerCase().includes(search) ||
          o.descricao_problema.toLowerCase().includes(search) ||
          o.imei?.includes(search)
        );
      });
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Filtro por prazo
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (prazoFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (!o.data_previsao) return prazoFilter === 'sem_prazo';
        const previsao = new Date(o.data_previsao);
        previsao.setHours(0, 0, 0, 0);
        
        switch (prazoFilter) {
          case 'hoje':
            return previsao.getTime() === hoje.getTime();
          case 'atrasado_hoje':
            return previsao.getTime() === hoje.getTime() && o.status !== 'entregue' && o.status !== 'concluido';
          case 'atrasado':
            return previsao < hoje && o.status !== 'entregue' && o.status !== 'concluido';
          case 'futuro':
            return previsao > hoje;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [ordens, clientes, searchTerm, statusFilter, prazoFilter]);

  // Contadores de status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ordens.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [ordens]);

  // Contadores de prazo
  const prazoCounts = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return {
      hoje: ordens.filter(o => {
        if (!o.data_previsao) return false;
        const previsao = new Date(o.data_previsao);
        previsao.setHours(0, 0, 0, 0);
        return previsao.getTime() === hoje.getTime();
      }).length,
      atrasado: ordens.filter(o => {
        if (!o.data_previsao) return false;
        const previsao = new Date(o.data_previsao);
        previsao.setHours(0, 0, 0, 0);
        return previsao < hoje && o.status !== 'entregue' && o.status !== 'concluido';
      }).length,
    };
  }, [ordens]);

  const getClienteNome = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome || 'Cliente não encontrado';
  };

  const getStatusBadge = (status: StatusOS) => {
    return (
      <Badge className={cn('text-white', STATUS_OS_COLORS[status])}>
        {STATUS_OS_LABELS[status]}
      </Badge>
    );
  };

  const getDaysUntilDeadline = (dataPrevisao?: string) => {
    if (!dataPrevisao) return null;
    const hoje = new Date();
    const previsao = new Date(dataPrevisao);
    const diff = Math.ceil((previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <ModernLayout 
      title="Ordens de Serviço" 
      subtitle="Gerencie os serviços de assistência técnica"
    >
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wrench className="h-4 w-4" />
                Total
              </div>
              <p className="text-2xl font-bold">{ordens.length}</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => setStatusFilter('aberto')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Clock className="h-4 w-4" />
                Abertas
              </div>
              <p className="text-2xl font-bold text-blue-600">{statusCounts['aberto'] || 0}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500" onClick={() => setStatusFilter('em_andamento')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                <Wrench className="h-4 w-4" />
                Em Andamento
              </div>
              <p className="text-2xl font-bold text-purple-600">{statusCounts['em_andamento'] || 0}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-cyan-500" onClick={() => setStatusFilter('aguardando_retirada')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-cyan-600 text-sm mb-1">
                <Truck className="h-4 w-4" />
                Aguardando Retirada
              </div>
              <p className="text-2xl font-bold text-cyan-600">{statusCounts['aguardando_retirada'] || 0}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500" onClick={() => setPrazoFilter('hoje')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <Calendar className="h-4 w-4" />
                Encerra Hoje
              </div>
              <p className="text-2xl font-bold text-green-600">{prazoCounts.hoje}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500" onClick={() => setPrazoFilter('atrasado')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
                <AlertTriangle className="h-4 w-4" />
                Em Atraso
              </div>
              <p className="text-2xl font-bold text-red-600">{prazoCounts.atrasado}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros rápidos de prazo */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={prazoFilter === 'hoje' ? 'default' : 'outline'} 
            size="sm"
            className={prazoFilter === 'hoje' ? 'bg-green-500 hover:bg-green-600' : ''}
            onClick={() => setPrazoFilter(prazoFilter === 'hoje' ? 'all' : 'hoje')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Encerra no dia
          </Button>
          <Button 
            variant={prazoFilter === 'atrasado_hoje' ? 'default' : 'outline'} 
            size="sm"
            className={prazoFilter === 'atrasado_hoje' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            onClick={() => setPrazoFilter(prazoFilter === 'atrasado_hoje' ? 'all' : 'atrasado_hoje')}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Em atraso no dia
          </Button>
          <Button 
            variant={prazoFilter === 'atrasado' ? 'default' : 'outline'} 
            size="sm"
            className={prazoFilter === 'atrasado' ? 'bg-red-500 hover:bg-red-600' : ''}
            onClick={() => setPrazoFilter(prazoFilter === 'atrasado' ? 'all' : 'atrasado')}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Em atraso
          </Button>
          <Button 
            variant={prazoFilter === 'futuro' ? 'default' : 'outline'} 
            size="sm"
            className={prazoFilter === 'futuro' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
            onClick={() => setPrazoFilter(prazoFilter === 'futuro' ? 'all' : 'futuro')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Prazo futuro
          </Button>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Ordens de Serviço
              </CardTitle>
              <Button onClick={() => navigate('/assistencia/os/nova')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova O.S.
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº OS, cliente, problema, IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            </div>

            {/* Tabela */}
            {filteredOrdens.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Nenhuma OS encontrada"
                description="Cadastre uma nova ordem de serviço para começar."
                action={{ label: 'Nova O.S.', onClick: () => navigate('/assistencia/os/nova') }}
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Nº O.S.</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Previsão</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrdens.map((ordem) => {
                      const diasRestantes = getDaysUntilDeadline(ordem.data_previsao);
                      const isAtrasado = diasRestantes !== null && diasRestantes < 0 && 
                        ordem.status !== 'entregue' && ordem.status !== 'concluido';
                      
                      return (
                        <TableRow 
                          key={ordem.id} 
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            isAtrasado && "bg-red-50 dark:bg-red-950/20"
                          )}
                          onClick={() => navigate(`/assistencia/os/${ordem.id}`)}
                        >
                          <TableCell className="font-bold text-primary">
                            #{ordem.numero}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getClienteNome(ordem.cliente_id)}
                          </TableCell>
                          <TableCell>
                            {ordem.telefone_contato && (
                              <a 
                                href={`https://wa.me/55${ordem.telefone_contato.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-green-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                {ordem.telefone_contato}
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {ordem.descricao_problema}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ordem.modelo?.nome || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ordem.status)}
                          </TableCell>
                          <TableCell>
                            {ordem.data_previsao ? (
                              <div className={cn(
                                "flex items-center gap-1",
                                isAtrasado && "text-red-600 font-medium"
                              )}>
                                {isAtrasado && <AlertTriangle className="h-4 w-4" />}
                                {dateFormatters.short(ordem.data_previsao)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(ordem.valor_total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/assistencia/os/${ordem.id}`);
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
                                  navigate(`/assistencia/os/${ordem.id}/editar`);
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

