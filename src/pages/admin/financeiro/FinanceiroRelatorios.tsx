import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';

export function FinanceiroRelatorios() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const [selectedReport, setSelectedReport] = useState('dre');

  // DRE simulado
  const dreData = {
    receitas: [
      { descricao: 'Serviços de Assistência', valor: 35000 },
      { descricao: 'Venda de Acessórios', valor: 8000 },
      { descricao: 'Outras Receitas', valor: 2000 },
    ],
    despesas: [
      { descricao: 'Custo de Peças', valor: 12000 },
      { descricao: 'Aluguel', valor: 3500 },
      { descricao: 'Energia e Água', valor: 800 },
      { descricao: 'Internet e Telefone', valor: 300 },
      { descricao: 'Salários', valor: 8000 },
      { descricao: 'Impostos', valor: 2500 },
      { descricao: 'Outras Despesas', valor: 900 },
    ],
  };

  const totalReceitas = dreData.receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = dreData.despesas.reduce((sum, d) => sum + d.valor, 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLucro = (lucroLiquido / totalReceitas) * 100;

  return (
    <div className="space-y-6">
      {/* Seleção de relatório */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione o relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dre">DRE - Demonstrativo de Resultados</SelectItem>
                <SelectItem value="fluxo">Fluxo de Caixa</SelectItem>
                <SelectItem value="contas">Contas a Pagar/Receber</SelectItem>
                <SelectItem value="vendas">Vendas por Período</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DRE */}
      {selectedReport === 'dre' && (
        <Card>
          <CardHeader>
            <CardTitle>DRE - Demonstrativo de Resultado do Exercício</CardTitle>
            <CardDescription>Período: {startDate.slice(0, 7).replace('-', '/')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="text-right font-bold">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Receitas */}
                  <TableRow className="bg-green-50">
                    <TableCell className="font-bold text-green-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />RECEITAS OPERACIONAIS
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {currencyFormatters.brl(totalReceitas)}
                    </TableCell>
                  </TableRow>
                  {dreData.receitas.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-8">{r.descricao}</TableCell>
                      <TableCell className="text-right text-green-600">{currencyFormatters.brl(r.valor)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Despesas */}
                  <TableRow className="bg-red-50">
                    <TableCell className="font-bold text-red-700 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />DESPESAS OPERACIONAIS
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      ({currencyFormatters.brl(totalDespesas)})
                    </TableCell>
                  </TableRow>
                  {dreData.despesas.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-8">{d.descricao}</TableCell>
                      <TableCell className="text-right text-red-600">({currencyFormatters.brl(d.valor)})</TableCell>
                    </TableRow>
                  ))}

                  {/* Resultado */}
                  <TableRow className={lucroLiquido >= 0 ? 'bg-blue-50' : 'bg-red-100'}>
                    <TableCell className="font-bold text-lg">LUCRO LÍQUIDO</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${lucroLiquido >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {currencyFormatters.brl(lucroLiquido)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Margem de Lucro</TableCell>
                    <TableCell className={`text-right font-bold ${margemLucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {margemLucro.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outros relatórios podem ser adicionados aqui */}
      {selectedReport !== 'dre' && (
        <Card>
          <CardContent className="pt-8 text-center text-muted-foreground">
            <p>Relatório em desenvolvimento...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
