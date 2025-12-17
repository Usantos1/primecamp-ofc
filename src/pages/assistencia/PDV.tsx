import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Package, Wrench, DollarSign, ShoppingCart, UserCircle } from 'lucide-react';
import { useOrdensServico, useProdutos, useClientes } from '@/hooks/useAssistencia';
import { currencyFormatters } from '@/utils/formatters';

export default function PDV() {
  const navigate = useNavigate();
  const { getEstatisticas } = useOrdensServico();
  const { produtos } = useProdutos();
  const { clientes } = useClientes();

  const stats = getEstatisticas();

  // Calcular valor total dos produtos
  const valorTotalProdutos = produtos.reduce((sum, produto) => {
    return sum + ((produto.preco_venda || 0) * (produto.estoque_atual || 0));
  }, 0);

  return (
    <ModernLayout 
      title="PDV - Assistência Técnica" 
      subtitle="Visão geral e acesso rápido às funcionalidades."
    >
      <div className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.abertas} abertas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emAndamento}</div>
              <p className="text-xs text-muted-foreground">
                {stats.aguardandoPeca > 0 && `${stats.aguardandoPeca} aguardando peça`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.finalizadas}</div>
              <p className="text-xs text-muted-foreground">
                {stats.aguardandoRetirada > 0 && `${stats.aguardandoRetirada} aguardando retirada`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/pdv/os/nova')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nova Ordem de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Criar uma nova ordem de serviço
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/pdv/clientes')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {clientes.length} clientes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/pdv/produtos')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {produtos.length} produtos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/pdv/os')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Ordens de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.total} ordens no total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">OS criadas hoje:</span>
                <span className="text-sm font-medium">{stats.hoje}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">OS com prazo hoje:</span>
                <span className="text-sm font-medium">{stats.prazoHoje}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">OS em atraso:</span>
                <span className="text-sm font-medium text-red-600">{stats.emAtraso}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estoque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total de produtos:</span>
                <span className="text-sm font-medium">{produtos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor total do estoque:</span>
                <span className="text-sm font-medium">{currencyFormatters.brl(valorTotalProdutos)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}
