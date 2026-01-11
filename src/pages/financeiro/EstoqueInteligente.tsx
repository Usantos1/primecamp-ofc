import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { useRecomendacoesEstoque } from '@/hooks/useFinanceiro';

export default function EstoqueInteligente() {
  const { data: recomendacoes, isLoading } = useRecomendacoesEstoque();
  
  if (isLoading) {
    return (
      <ModernLayout title="Estoque Inteligente" subtitle="Recomendações de reposição baseadas em IA">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando recomendações...</p>
        </div>
      </ModernLayout>
    );
  }
  
  const recomendacoesCriticas = (recomendacoes || []).filter((r: any) => r.prioridade >= 9);
  const recomendacoesAltas = (recomendacoes || []).filter((r: any) => r.prioridade >= 7 && r.prioridade < 9);
  const recomendacoesMedias = (recomendacoes || []).filter((r: any) => r.prioridade < 7);
  
  const getPrioridadeBadge = (prioridade: number) => {
    if (prioridade >= 9) {
      return <Badge variant="destructive">Crítica</Badge>;
    } else if (prioridade >= 7) {
      return <Badge className="bg-orange-500">Alta</Badge>;
    } else {
      return <Badge className="bg-yellow-500">Média</Badge>;
    }
  };
  
  const renderRecomendacoes = (recs: any[], titulo: string, icon: any) => {
    if (recs.length === 0) return null;
    
    return (
      <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {icon}
            {titulo}
            <Badge variant="outline" className="ml-auto">
              {recs.length} {recs.length === 1 ? 'produto' : 'produtos'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recs.map((rec: any) => (
              <div key={rec.produtoId} className="p-4 border-[3px] border-gray-300 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-base">{rec.produtoNome}</h4>
                      {getPrioridadeBadge(rec.prioridade)}
                      {rec.produtoCodigo && (
                        <Badge variant="outline" className="text-xs">
                          {rec.produtoCodigo}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Estoque Atual</p>
                        <p className="text-lg font-bold">{rec.estoqueAtual} un</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                        <p className="text-lg font-semibold">{rec.estoqueMinimo} un</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Venda Média Diária</p>
                        <p className="text-lg font-semibold">{rec.vendaMediaDiaria.toFixed(2)} un/dia</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dias Restantes</p>
                        <p className={`text-lg font-bold ${rec.diasRestantes < 7 ? 'text-red-600' : rec.diasRestantes < 14 ? 'text-orange-600' : 'text-green-600'}`}>
                          {rec.diasRestantes} dias
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-[2px] border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-1">Recomendação da IA:</p>
                          <p className="text-sm font-bold text-blue-800">
                            Repor {rec.quantidadeSugerida} unidades
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Garantir estoque para {Math.ceil(rec.quantidadeSugerida / rec.vendaMediaDiaria)} dias
                          </p>
                        </div>
                        {rec.prioridade >= 9 && (
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <ModernLayout title="Estoque Inteligente" subtitle="Recomendações de reposição baseadas em IA">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[3px] border-red-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{recomendacoesCriticas.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Produtos com estoque zero ou crítico</p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-orange-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700">
                <TrendingDown className="h-5 w-5" />
                Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{recomendacoesAltas.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Produtos abaixo do mínimo</p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-yellow-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-yellow-700">
                <Package className="h-5 w-5" />
                Monitorar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{recomendacoesMedias.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Produtos próximos do mínimo</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Lista de Recomendações */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {recomendacoesCriticas.length > 0 && renderRecomendacoes(recomendacoesCriticas, 'Críticos - Ação Imediata', <AlertTriangle className="h-5 w-5 text-red-600" />)}
          {recomendacoesAltas.length > 0 && renderRecomendacoes(recomendacoesAltas, 'Alta Prioridade', <TrendingDown className="h-5 w-5 text-orange-600" />)}
          {recomendacoesMedias.length > 0 && renderRecomendacoes(recomendacoesMedias, 'Monitorar', <Package className="h-5 w-5 text-yellow-600" />)}
          
          {(recomendacoes || []).length === 0 && (
            <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Estoque em Dia!</h3>
                <p className="text-muted-foreground">
                  Todos os produtos estão com estoque adequado. Nenhuma ação necessária no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
