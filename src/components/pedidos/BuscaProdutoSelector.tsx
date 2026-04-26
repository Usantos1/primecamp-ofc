import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export type ProdutoBusca = {
  id: string;
  nome: string;
  codigo?: number;
  referencia?: string;
};

type Props = {
  onSelect: (produto: ProdutoBusca) => void;
};

export function BuscaProdutoSelector({ onSelect }: Props) {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    const term = busca.trim();
    if (!term || term.length < 2) {
      setResultados([]);
      return;
    }
    setLoading(true);
    try {
      let query = from('produtos')
        .select('id,nome,codigo,referencia')
        .order('nome', { ascending: true })
        .limit(50);
      const codigoNum = parseInt(term);
      if (!isNaN(codigoNum)) {
        query = query.eq('codigo', codigoNum);
      } else {
        query = query.ilike('nome', `%${term}%`);
      }
      const { data, error } = await query.execute();
      if (error) throw error;
      setResultados(
        (data || []).map((r: any) => ({
          id: r.id,
          nome: r.nome || '',
          codigo: r.codigo,
          referencia: r.referencia,
        }))
      );
    } catch (e: any) {
      toast({
        title: 'Erro na busca',
        description: e?.message || 'Não foi possível buscar produtos.',
        variant: 'destructive',
      });
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [busca, toast]);

  const handleSelect = (p: ProdutoBusca) => {
    onSelect(p);
    setBusca('');
    setResultados([]);
  };

  return (
    <div>
      <Label className="text-sm">Buscar produto para adicionar</Label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 min-h-[44px] rounded-full touch-manipulation"
            placeholder="Nome ou código do produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscar();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={buscar}
          disabled={loading}
          className="min-h-[44px] rounded-full touch-manipulation shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {resultados.length > 0 && (
        <ul className="mt-2 border-2 border-gray-300 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-auto">
          {resultados.map((prod) => (
            <li key={prod.id}>
              <button
                type="button"
                className="w-full px-3 py-3 sm:py-2 text-left text-sm hover:bg-muted/60 flex justify-between items-center min-h-[44px] sm:min-h-0 touch-manipulation transition-colors"
                onClick={() => handleSelect(prod)}
              >
                <span className="truncate text-foreground">{prod.nome}</span>
                <span className="text-muted-foreground font-mono text-xs shrink-0 ml-2">
                  {prod.codigo ?? prod.referencia ?? ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
