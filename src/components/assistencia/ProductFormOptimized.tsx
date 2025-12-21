import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Produto } from '@/types/assistencia';
import { parseBRLInput, maskBRL } from '@/utils/currency';

interface ProductFormOptimizedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  onSave: (payload: any) => Promise<void>;
  grupos?: any[];
  marcas?: any[];
  modelos?: any[];
}

interface SupabasePayload {
  nome: string;
  nome_abreviado?: string;
  codigo?: number;
  codigo_barras?: string;
  referencia?: string;
  marca?: string;
  modelo?: string;
  grupo?: string;
  valor_compra?: number;
  valor_dinheiro_pix?: number;
  valor_venda?: number;
  margem_percentual?: number;
  quantidade?: number;
  estoque_minimo?: number;
  localizacao?: string;
  situacao?: 'ATIVO' | 'INATIVO';
}

export function ProductFormOptimized({
  open,
  onOpenChange,
  produto,
  onSave,
  grupos = [],
  marcas = [],
  modelos = [],
}: ProductFormOptimizedProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(produto?.id);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SupabasePayload>({
    defaultValues: {
      nome: '',
      nome_abreviado: '',
      codigo: undefined,
      codigo_barras: '',
      referencia: '',
      marca: '',
      modelo: '',
      grupo: '',
      valor_compra: 0,
      valor_dinheiro_pix: 0,
      valor_venda: 0,
      margem_percentual: 0,
      quantidade: 0,
      estoque_minimo: 0,
      localizacao: '',
      situacao: 'ATIVO',
    },
  });

  // Carrega dados do produto quando editar
  useEffect(() => {
    if (produto && open) {
      reset({
        nome: produto.descricao || '',
        nome_abreviado: produto.descricao_abreviada || '',
        codigo: produto.codigo,
        codigo_barras: produto.codigo_barras || '',
        referencia: produto.referencia || '',
        marca: produto.marca || '',
        modelo: produto.modelo_compativel || '',
        grupo: produto.categoria || '',
        valor_compra: produto.preco_custo || 0,
        valor_dinheiro_pix: produto.preco_venda || 0,
        valor_venda: produto.preco_venda || 0,
        margem_percentual: produto.margem_lucro || 0,
        quantidade: produto.estoque_atual || 0,
        estoque_minimo: produto.estoque_minimo || 0,
        localizacao: produto.localizacao || '',
        situacao: produto.situacao === 'inativo' ? 'INATIVO' : 'ATIVO',
      });
    } else if (!produto && open) {
      reset({
        nome: '',
        nome_abreviado: '',
        codigo: undefined,
        codigo_barras: '',
        referencia: '',
        marca: '',
        modelo: '',
        grupo: '',
        valor_compra: 0,
        valor_dinheiro_pix: 0,
        valor_venda: 0,
        margem_percentual: 0,
        quantidade: 0,
        estoque_minimo: 0,
        localizacao: '',
        situacao: 'ATIVO',
      });
    }
  }, [produto, open, reset]);

  const onSubmit = async (data: SupabasePayload) => {
    try {
      setIsSaving(true);
      
      // Converte valores de string para number quando necessário
      const payload: SupabasePayload = {
        ...data,
        valor_compra: typeof data.valor_compra === 'string' ? parseBRLInput(data.valor_compra) : (data.valor_compra || 0),
        valor_dinheiro_pix: typeof data.valor_dinheiro_pix === 'string' ? parseBRLInput(data.valor_dinheiro_pix) : (data.valor_dinheiro_pix || 0),
        valor_venda: typeof data.valor_venda === 'string' ? parseBRLInput(data.valor_venda) : (data.valor_venda || 0),
        quantidade: typeof data.quantidade === 'string' ? parseFloat(data.quantidade) || 0 : (data.quantidade || 0),
        estoque_minimo: typeof data.estoque_minimo === 'string' ? parseFloat(data.estoque_minimo) || 0 : (data.estoque_minimo || 0),
        margem_percentual: typeof data.margem_percentual === 'string' ? parseFloat(data.margem_percentual) || 0 : (data.margem_percentual || 0),
        codigo: typeof data.codigo === 'string' ? parseFloat(data.codigo) || undefined : data.codigo,
      };

      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const valorCompraDisplay = watch('valor_compra');
  const valorVendaDisplay = watch('valor_dinheiro_pix');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <Label htmlFor="nome">
                Nome/Descrição *
                {errors.nome && <span className="text-destructive ml-2">({errors.nome.message})</span>}
              </Label>
              <Input
                id="nome"
                {...register('nome', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Tela Samsung Galaxy A20S"
              />
            </div>

            {/* Nome Abreviado */}
            <div className="md:col-span-2">
              <Label htmlFor="nome_abreviado">Nome Abreviado</Label>
              <Input
                id="nome_abreviado"
                {...register('nome_abreviado')}
                placeholder="Ex: Tela A20S"
              />
            </div>

            {/* Código */}
            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                type="number"
                {...register('codigo', { valueAsNumber: true })}
                placeholder="Código do produto"
              />
            </div>

            {/* Código de Barras */}
            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                {...register('codigo_barras')}
                placeholder="EAN13"
              />
            </div>

            {/* Referência */}
            <div>
              <Label htmlFor="referencia">Referência</Label>
              <Input
                id="referencia"
                {...register('referencia')}
                placeholder="Referência do produto"
              />
            </div>

            {/* Grupo/Categoria */}
            <div>
              <Label htmlFor="grupo">Grupo/Categoria</Label>
              <Select
                value={watch('grupo') || ''}
                onValueChange={(value) => setValue('grupo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id || grupo} value={grupo.nome || grupo}>
                      {grupo.nome || grupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div>
              <Label htmlFor="marca">Marca</Label>
              <Select
                value={watch('marca') || ''}
                onValueChange={(value) => setValue('marca', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id || marca} value={marca.nome || marca}>
                      {marca.nome || marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo */}
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Select
                value={watch('modelo') || ''}
                onValueChange={(value) => setValue('modelo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo.id || modelo} value={modelo.nome || modelo}>
                      {modelo.nome || modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor de Compra */}
            <div>
              <Label htmlFor="valor_compra">Valor de Compra</Label>
              <Input
                id="valor_compra"
                {...register('valor_compra')}
                onChange={(e) => {
                  const masked = maskBRL(e.target.value);
                  setValue('valor_compra', masked as any);
                }}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Valor de Venda (Dinheiro/Pix) */}
            <div>
              <Label htmlFor="valor_dinheiro_pix">
                Valor de Venda (Dinheiro/Pix) *
                {errors.valor_dinheiro_pix && <span className="text-destructive ml-2">({errors.valor_dinheiro_pix.message})</span>}
              </Label>
              <Input
                id="valor_dinheiro_pix"
                {...register('valor_dinheiro_pix', { required: 'Valor de venda é obrigatório' })}
                onChange={(e) => {
                  const masked = maskBRL(e.target.value);
                  setValue('valor_dinheiro_pix', masked as any);
                }}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Margem de Lucro (%) */}
            <div>
              <Label htmlFor="margem_percentual">Margem de Lucro (%)</Label>
              <Input
                id="margem_percentual"
                type="number"
                step="0.01"
                {...register('margem_percentual', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            {/* Quantidade/Estoque Atual */}
            <div>
              <Label htmlFor="quantidade">Estoque Atual</Label>
              <Input
                id="quantidade"
                type="number"
                {...register('quantidade', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Estoque Mínimo */}
            <div>
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                {...register('estoque_minimo', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Localização */}
            <div>
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                {...register('localizacao')}
                placeholder="Ex: Prateleira A1"
              />
            </div>

            {/* Situação */}
            <div>
              <Label htmlFor="situacao">Situação</Label>
              <Select
                value={watch('situacao') || 'ATIVO'}
                onValueChange={(value: 'ATIVO' | 'INATIVO') => setValue('situacao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

