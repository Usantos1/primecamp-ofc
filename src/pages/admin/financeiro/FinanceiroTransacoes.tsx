import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';

export function FinanceiroTransacoes() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dados simulados
  const transactions = [
    { id: '1', date: '2025-12-10', description: 'Venda OS #123', type: 'entrada', amount: 620, category: 'Serviços' },
    { id: '2', date: '2025-12-10', description: 'Compra Tela iPhone 12', type: 'saida', amount: 280, category: 'Peças' },
    { id: '3', date: '2025-12-09', description: 'Venda OS #122', type: 'entrada', amount: 350, category: 'Serviços' },
    { id: '4', date: '2025-12-09', description: 'Pagamento Fornecedor', type: 'saida', amount: 1500, category: 'Fornecedores' },
    { id: '5', date: '2025-12-08', description: 'Venda OS #121', type: 'entrada', amount: 180, category: 'Serviços' },
  ];

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totals = {
    entradas: transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0),
    saidas: transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />Total Entradas
            </div>
            <p className="text-2xl font-bold text-green-600">{currencyFormatters.brl(totals.entradas)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <TrendingDown className="h-4 w-4" />Total Saídas
            </div>
            <p className="text-2xl font-bold text-red-600">{currencyFormatters.brl(totals.saidas)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="text-blue-600 text-sm mb-1">Saldo</div>
            <p className={`text-2xl font-bold ${totals.entradas - totals.saidas >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {currencyFormatters.brl(totals.entradas - totals.saidas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de transações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Transações</CardTitle>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Transação</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar transações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState variant="no-data" title="Nenhuma transação encontrada" description="Registre transações financeiras." />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{dateFormatters.short(t.date)}</TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                      <TableCell>
                        <Badge className={t.type === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${t.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'entrada' ? '+' : '-'}{currencyFormatters.brl(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
