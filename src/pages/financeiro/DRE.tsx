import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { currencyFormatters } from '@/utils/formatters';
import { useDRE } from '@/hooks/useFinanceiro';

export default function DRE() {
  const [periodo, setPeriodo] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [tipo, setTipo] = useState<'mensal' | 'anual'>('mensal');
  
  const { data: dreData, isLoading, error } = useDRE(periodo, tipo);
  
  if (isLoading) {
    return (
      <ModernLayout title="DRE - Demonstrativo do Resultado do Exercício" subtitle="Demonstração do resultado financeiro">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando DRE...</p>
        </div>
      </ModernLayout>
    );
  }
  
  if (error) {
    return (
      <ModernLayout title="DRE - Demonstrativo do Resultado do Exercício" subtitle="Demonstração do resultado financeiro">
        <div className="flex flex-col gap-4">
          <FinanceiroNavMenu />
          <Card className="flex-1 border-[3px] border-red-400 rounded-xl shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-red-600">Erro ao carregar DRE</h3>
              <p className="text-muted-foreground">
                {error.message || 'Erro desconhecido ao calcular o DRE. Verifique os logs do servidor.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    );
  }
  
  if (!dreData || !dreData.dre) {
    return (
      <ModernLayout title="DRE - Demonstrativo do Resultado do Exercício" subtitle="Demonstração do resultado financeiro">
        <div className="flex flex-col gap-4">
          {/* Menu de Navegação */}
          <FinanceiroNavMenu />
          
          <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                        !periodo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {periodo ? format(new Date(periodo), "MM/yyyy", { locale: ptBR }) : "Período"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent 
                      mode="single" 
                      selected={periodo ? new Date(periodo) : undefined} 
                      onSelect={(date) => date && setPeriodo(format(date, 'yyyy-MM-01'))}
                      initialFocus 
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                <Select value={tipo} onValueChange={(v: 'mensal' | 'anual') => setTipo(v)}>
                  <SelectTrigger className="h-10 rounded-lg border-[3px] border-gray-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          <Card className="flex-1 border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">DRE não encontrado</h3>
              <p className="text-muted-foreground">
                Não foi possível calcular o DRE para o período selecionado. 
                Verifique se há vendas e contas registradas no período.
              </p>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    );
  }
  
  const dre = dreData.dre;
  
  return (
    <ModernLayout title="DRE - Demonstrativo do Resultado do Exercício" subtitle="Demonstração do resultado financeiro">
      <div className="flex flex-col gap-4">
        {/* Menu de Navegação */}
        <FinanceiroNavMenu />
        
        {/* Filtros */}
        <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                      !periodo && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {periodo ? format(new Date(periodo), "MM/yyyy", { locale: ptBR }) : "Período"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent 
                    mode="single" 
                    selected={periodo ? new Date(periodo) : undefined} 
                    onSelect={(date) => date && setPeriodo(format(date, 'yyyy-MM-01'))}
                    initialFocus 
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
              <Select value={tipo} onValueChange={(v: 'mensal' | 'anual') => setTipo(v)}>
                <SelectTrigger className="h-10 rounded-lg border-[3px] border-gray-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
        
        {/* DRE Table */}
        <Card className="flex-1 overflow-hidden border-[3px] border-gray-400 rounded-xl shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Demonstrativo do Resultado do Exercício</CardTitle>
            <CardDescription>
              Período: {format(new Date(periodo), "MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto scrollbar-thin p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b-[3px] border-gray-400">
                <TableRow>
                  <TableHead className="font-bold w-[60%]">Descrição</TableHead>
                  <TableHead className="font-bold text-right">Valor</TableHead>
                  <TableHead className="font-bold text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b-[2px] border-gray-300 bg-blue-50">
                  <TableCell className="font-bold">(+) Receita Bruta</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatters.brl(dre.receita_bruta || 0)}</TableCell>
                  <TableCell className="text-right font-bold">100.0%</TableCell>
                </TableRow>
                <TableRow className="border-b-[2px] border-gray-300">
                  <TableCell className="pl-6">(-) Deduções</TableCell>
                  <TableCell className="text-right">{currencyFormatters.brl(dre.deducoes || 0)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
                <TableRow className="border-b-[3px] border-gray-400 bg-green-50">
                  <TableCell className="font-bold">(=) Receita Líquida</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatters.brl(dre.receita_liquida || 0)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {Number(dre.receita_bruta || 0) > 0 ? (Number(dre.receita_liquida || 0) / Number(dre.receita_bruta || 1) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-[2px] border-gray-300">
                  <TableCell className="pl-6">(-) CMV - Custo das Mercadorias/Peças Vendidas</TableCell>
                  <TableCell className="text-right">{currencyFormatters.brl(dre.custo_produtos_vendidos || 0)}</TableCell>
                  <TableCell className="text-right">
                    {Number(dre.receita_liquida || 0) > 0 ? (Number(dre.custo_produtos_vendidos || 0) / Number(dre.receita_liquida || 1) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-[3px] border-gray-400 bg-yellow-50">
                  <TableCell className="font-bold">(=) Lucro Bruto</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatters.brl(dre.lucro_bruto || 0)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {Number(dre.receita_liquida || 0) > 0 ? (Number(dre.lucro_bruto || 0) / Number(dre.receita_liquida || 1) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-[2px] border-gray-300">
                  <TableCell className="pl-6">(-) Despesas Operacionais</TableCell>
                  <TableCell className="text-right">{currencyFormatters.brl(dre.despesas_operacionais || 0)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
                <TableRow className="border-b-[2px] border-gray-300 bg-purple-50">
                  <TableCell className="font-semibold">(=) EBITDA</TableCell>
                  <TableCell className="text-right font-semibold">{currencyFormatters.brl(dre.ebitda || 0)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(dre.receita_liquida || 0) > 0 ? (Number(dre.ebitda || 0) / Number(dre.receita_liquida || 1) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-[2px] border-gray-300">
                  <TableCell className="pl-6">(+) Resultado Financeiro</TableCell>
                  <TableCell className="text-right">{currencyFormatters.brl(dre.resultado_financeiro || 0)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
                <TableRow className="border-b-[3px] border-gray-500 bg-green-100">
                  <TableCell className="font-bold text-lg">(=) Lucro Líquido</TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {currencyFormatters.brl(dre.lucro_liquido || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {Number(dre.receita_liquida || 0) > 0 ? (Number(dre.lucro_liquido || 0) / Number(dre.receita_liquida || 1) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Margem Bruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(dre.margem_bruta_percentual || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Margem Líquida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(dre.margem_liquida_percentual || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                EBITDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(dre.ebitda || 0)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}
