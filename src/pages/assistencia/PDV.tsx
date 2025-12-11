import { useState, useMemo, useCallback } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Minus, Search, Trash2, ShoppingCart, CreditCard, Banknote, 
  QrCode, User, Receipt, X, Check, Calculator
} from 'lucide-react';
import { useProdutos, useClientes } from '@/hooks/useAssistencia';
import { currencyFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ItemCarrinho {
  id: string;
  produto_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
}

type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito';

export default function PDV() {
  const { produtos, searchProdutos } = useProdutos();
  const { clientes, searchClientes } = useClientes();
  const { toast } = useToast();

  // Estados do carrinho
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [desconto, setDesconto] = useState(0);
  
  // Estados de busca
  const [produtoSearch, setProdutoSearch] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  
  // Estados do pagamento
  const [showPagamento, setShowPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [valorRecebido, setValorRecebido] = useState(0);
  const [showFinalizado, setShowFinalizado] = useState(false);

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    if (!produtoSearch || produtoSearch.length < 2) return produtos.slice(0, 20);
    return searchProdutos(produtoSearch);
  }, [produtoSearch, produtos, searchProdutos]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch || clienteSearch.length < 2) return [];
    return searchClientes(clienteSearch);
  }, [clienteSearch, searchClientes]);

  // Totais
  const subtotal = useMemo(() => 
    itens.reduce((acc, item) => acc + item.valor_total, 0),
    [itens]
  );

  const total = useMemo(() => 
    Math.max(0, subtotal - desconto),
    [subtotal, desconto]
  );

  const troco = useMemo(() => 
    Math.max(0, valorRecebido - total),
    [valorRecebido, total]
  );

  // Adicionar produto ao carrinho
  const addProduto = useCallback((produto: any) => {
    setItens(prev => {
      const existente = prev.find(i => i.produto_id === produto.id);
      if (existente) {
        return prev.map(i => 
          i.produto_id === produto.id 
            ? { 
                ...i, 
                quantidade: i.quantidade + 1,
                valor_total: (i.quantidade + 1) * i.valor_unitario - i.desconto
              }
            : i
        );
      }
      return [...prev, {
        id: `${Date.now()}`,
        produto_id: produto.id,
        descricao: produto.descricao,
        quantidade: 1,
        valor_unitario: produto.preco_venda,
        desconto: 0,
        valor_total: produto.preco_venda,
      }];
    });
    setProdutoSearch('');
  }, []);

  // Alterar quantidade
  const alterarQuantidade = useCallback((itemId: string, delta: number) => {
    setItens(prev => prev.map(item => {
      if (item.id === itemId) {
        const novaQtd = Math.max(1, item.quantidade + delta);
        return {
          ...item,
          quantidade: novaQtd,
          valor_total: novaQtd * item.valor_unitario - item.desconto,
        };
      }
      return item;
    }));
  }, []);

  // Remover item
  const removerItem = useCallback((itemId: string) => {
    setItens(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // Limpar carrinho
  const limparCarrinho = useCallback(() => {
    setItens([]);
    setClienteSelecionado(null);
    setDesconto(0);
    setProdutoSearch('');
    setClienteSearch('');
  }, []);

  // Finalizar venda
  const finalizarVenda = useCallback(() => {
    if (itens.length === 0) {
      toast({ title: 'Adicione itens ao carrinho', variant: 'destructive' });
      return;
    }

    if (formaPagamento === 'dinheiro' && valorRecebido < total) {
      toast({ title: 'Valor recebido insuficiente', variant: 'destructive' });
      return;
    }

    // Simular venda finalizada
    setShowPagamento(false);
    setShowFinalizado(true);
    
    setTimeout(() => {
      setShowFinalizado(false);
      limparCarrinho();
      setValorRecebido(0);
    }, 2000);
  }, [itens, formaPagamento, valorRecebido, total, toast, limparCarrinho]);

  // Atalho para forma de pagamento
  const selecionarFormaPagamento = useCallback((forma: FormaPagamento) => {
    setFormaPagamento(forma);
    if (forma !== 'dinheiro') {
      setValorRecebido(total);
    }
  }, [total]);

  return (
    <ModernLayout title="PDV" subtitle="Ponto de Venda">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {/* Coluna de Produtos */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Busca de produtos */}
          <Card>
            <CardContent className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto por nome, código de barras..."
                  value={produtoSearch}
                  onChange={(e) => setProdutoSearch(e.target.value)}
                  className="pl-9 text-lg h-12"
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          {/* Grid de produtos */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Produtos</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => addProduto(produto)}
                      className="p-3 border rounded-lg hover:bg-muted/50 hover:border-primary transition-all text-left group"
                    >
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary">
                        {produto.descricao}
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {currencyFormatters.brl(produto.preco_venda)}
                      </p>
                      {produto.tipo === 'peca' && (
                        <p className="text-xs text-muted-foreground">
                          Estoque: {produto.estoque_atual}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Coluna do Carrinho */}
        <div className="flex flex-col gap-4">
          {/* Cliente */}
          <Card>
            <CardContent className="py-3">
              {clienteSelecionado ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{clienteSelecionado.nome}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setClienteSelecionado(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente (opcional)..."
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setShowClienteSearch(true);
                    }}
                    onFocus={() => setShowClienteSearch(true)}
                    className="pl-9"
                  />
                  {showClienteSearch && clientesFiltrados.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-auto">
                      {clientesFiltrados.map(cliente => (
                        <div
                          key={cliente.id}
                          className="p-2 hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setClienteSelecionado(cliente);
                            setClienteSearch('');
                            setShowClienteSearch(false);
                          }}
                        >
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itens do carrinho */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho ({itens.length})
                </CardTitle>
                {itens.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={limparCarrinho}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-580px)]">
                {itens.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Carrinho vazio</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {itens.map(item => (
                      <div key={item.id} className="p-3">
                        <div className="flex justify-between mb-1">
                          <p className="font-medium text-sm line-clamp-1 flex-1">{item.descricao}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive"
                            onClick={() => removerItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => alterarQuantidade(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantidade}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => alterarQuantidade(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-semibold">{currencyFormatters.brl(item.valor_total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Totais e ações */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{currencyFormatters.brl(subtotal)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Desconto:</span>
                <Input
                  type="number"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-right"
                  placeholder="0,00"
                />
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span className="text-primary">{currencyFormatters.brl(total)}</span>
              </div>

              <Button 
                className="w-full h-12 text-lg gap-2" 
                onClick={() => setShowPagamento(true)}
                disabled={itens.length === 0}
              >
                <CreditCard className="h-5 w-5" />
                Finalizar Venda
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={showPagamento} onOpenChange={setShowPagamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento</DialogTitle>
            <DialogDescription>
              Total: <span className="font-bold text-primary text-xl">{currencyFormatters.brl(total)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Formas de pagamento */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={formaPagamento === 'dinheiro' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => selecionarFormaPagamento('dinheiro')}
              >
                <Banknote className="h-5 w-5" />
                <span>Dinheiro</span>
              </Button>
              <Button
                variant={formaPagamento === 'pix' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => selecionarFormaPagamento('pix')}
              >
                <QrCode className="h-5 w-5" />
                <span>PIX</span>
              </Button>
              <Button
                variant={formaPagamento === 'debito' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => selecionarFormaPagamento('debito')}
              >
                <CreditCard className="h-5 w-5" />
                <span>Débito</span>
              </Button>
              <Button
                variant={formaPagamento === 'credito' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => selecionarFormaPagamento('credito')}
              >
                <CreditCard className="h-5 w-5" />
                <span>Crédito</span>
              </Button>
            </div>

            {/* Valor recebido (apenas para dinheiro) */}
            {formaPagamento === 'dinheiro' && (
              <div className="space-y-2">
                <Label>Valor Recebido</Label>
                <Input
                  type="number"
                  value={valorRecebido || ''}
                  onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
                  className="text-xl h-12 text-right"
                  placeholder="0,00"
                  autoFocus
                />
                
                {/* Atalhos de valor */}
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100].map(valor => (
                    <Button
                      key={valor}
                      variant="outline"
                      size="sm"
                      onClick={() => setValorRecebido(prev => prev + valor)}
                    >
                      +{valor}
                    </Button>
                  ))}
                </div>

                {valorRecebido > 0 && valorRecebido >= total && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Troco:</p>
                    <p className="text-2xl font-bold text-green-600">{currencyFormatters.brl(troco)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamento(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={finalizarVenda}
              disabled={formaPagamento === 'dinheiro' && valorRecebido < total}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Venda Finalizada */}
      <Dialog open={showFinalizado} onOpenChange={setShowFinalizado}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Venda Finalizada!</h2>
            <p className="text-muted-foreground">Obrigado pela preferência</p>
          </div>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

