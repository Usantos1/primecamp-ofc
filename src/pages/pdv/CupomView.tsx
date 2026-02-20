import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, Share2 } from 'lucide-react';
import { generateCupomTermica, generateCupomPDF, printTermica } from '@/utils/pdfGenerator';
import { from } from '@/integrations/db/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function CupomView() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cupomConfig, setCupomConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSale();
    }
  }, [id]);

  useEffect(() => {
    if (sale && items && payments && cupomConfig !== undefined) {
      renderCupomPreview();
    }
  }, [sale, items, payments, cupomConfig]);

  const renderCupomPreview = async () => {
    if (!sale || !items || !payments) return;

    const cupomData = {
      numero: sale.numero,
      data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(sale.created_at).toLocaleTimeString('pt-BR'),
      empresa: {
        nome: 'PRIME CAMP',
        cnpj: '31.833.574/0001-74',
        endereco: undefined,
        telefone: undefined,
      },
      cliente: sale.cliente_nome ? {
        nome: sale.cliente_nome,
        cpf_cnpj: sale.cliente_cpf_cnpj || undefined,
        telefone: sale.cliente_telefone || undefined,
      } : undefined,
      itens: items.map((item: any) => ({
        codigo: item.produto_codigo || item.produto_codigo_barras || undefined,
        nome: item.produto_nome,
        quantidade: Number(item.quantidade),
        valor_unitario: Number(item.valor_unitario),
        desconto: Number(item.desconto || 0),
        valor_total: Number(item.valor_total),
      })),
      subtotal: Number(sale.subtotal),
      desconto_total: Number(sale.desconto_total),
      total: Number(sale.total),
      pagamentos: payments
        .filter((p: any) => p.status === 'confirmed')
        .map((p: any) => ({
          forma: p.forma_pagamento,
          valor: Number(p.valor),
          troco: p.troco ? Number(p.troco) : undefined,
        })),
      vendedor: sale.vendedor_nome || undefined,
      observacoes: sale.observacoes || undefined,
      mostrar_termos_garantia_os: !!sale?.ordem_servico_id,
    };

    const qrCodeData = `${window.location.origin}/cupom/${sale.id}`;
    const html = await generateCupomTermica(cupomData, qrCodeData, cupomConfig || undefined);
    
    const previewElement = document.getElementById('cupom-preview');
    if (previewElement) {
      previewElement.innerHTML = html;
    }
  };

  const loadSale = async () => {
    if (!id) return;
    try {
      setLoading(true);

      // Tentar por ID (UUID) primeiro
      let saleData: any = null;
      let saleError: any = null;
      const byId = await from('sales')
        .select('*')
        .eq('id', id)
        .single()
        .execute();
      saleData = byId.data;
      saleError = byId.error;

      // Se não encontrou e o id parece número (link compartilhado com número da venda), buscar por numero
      const idAsNum = id ? parseInt(id, 10) : NaN;
      if ((saleError || !saleData) && !isNaN(idAsNum) && String(idAsNum) === id) {
        const byNumero = await from('sales')
          .select('*')
          .eq('numero', idAsNum)
          .maybeSingle()
          .execute();
        if (byNumero.data) {
          saleData = byNumero.data;
          saleError = null;
        }
      }

      if (saleError) throw saleError;
      setSale(saleData);

      const saleId = saleData?.id;
      if (!saleId) {
        setLoading(false);
        return;
      }

      // Carregar items
      const { data: itemsData, error: itemsError } = await from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
        .execute();
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
      
      // Carregar payments
      const { data: paymentsData, error: paymentsError } = await from('payments')
        .select('*')
        .eq('sale_id', saleId)
        .execute();
      
      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
      
      // Carregar configuração do cupom (pode falhar se não houver, mas não é crítico)
      try {
        const { data: configData } = await from('kv_store_2c4defad')
          .select('value')
          .eq('key', 'cupom_config')
          .single()
          .execute();
        
        if (configData) {
          setCupomConfig(configData.value);
        }
      } catch (configError) {
        console.warn('Não foi possível carregar configuração do cupom:', configError);
      }
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!sale || !items || !payments) return;

    const cupomData = {
      numero: sale.numero,
      data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(sale.created_at).toLocaleTimeString('pt-BR'),
      empresa: {
        nome: 'PRIME CAMP',
        cnpj: '31.833.574/0001-74',
        endereco: undefined,
        telefone: undefined,
      },
      cliente: sale.cliente_nome ? {
        nome: sale.cliente_nome,
        cpf_cnpj: sale.cliente_cpf_cnpj || undefined,
        telefone: sale.cliente_telefone || undefined,
      } : undefined,
      itens: items.map((item: any) => ({
        codigo: item.produto_codigo || item.produto_codigo_barras || undefined,
        nome: item.produto_nome,
        quantidade: Number(item.quantidade),
        valor_unitario: Number(item.valor_unitario),
        desconto: Number(item.desconto || 0),
        valor_total: Number(item.valor_total),
      })),
      subtotal: Number(sale.subtotal),
      desconto_total: Number(sale.desconto_total),
      total: Number(sale.total),
      pagamentos: payments
        .filter((p: any) => p.status === 'confirmed')
        .map((p: any) => ({
          forma: p.forma_pagamento,
          valor: Number(p.valor),
          troco: p.troco ? Number(p.troco) : undefined,
        })),
      vendedor: sale.vendedor_nome || undefined,
      observacoes: sale.observacoes || undefined,
      mostrar_termos_garantia_os: !!sale?.ordem_servico_id,
    };

    const qrCodeData = `${window.location.origin}/cupom/${sale.id}`;
    const html = await generateCupomTermica(cupomData, qrCodeData, cupomConfig || undefined);
    printTermica(html);
  };

  const handleDownloadPDF = async () => {
    if (!sale || !items || !payments) return;

    const cupomData = {
      numero: sale.numero,
      data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(sale.created_at).toLocaleTimeString('pt-BR'),
      empresa: {
        nome: 'PRIME CAMP',
        cnpj: '31.833.574/0001-74',
      },
      cliente: sale.cliente_nome ? {
        nome: sale.cliente_nome,
      } : undefined,
      itens: items.map((item: any) => ({
        codigo: item.produto_codigo || item.produto_codigo_barras || undefined,
        nome: item.produto_nome,
        quantidade: Number(item.quantidade),
        valor_unitario: Number(item.valor_unitario),
        desconto: Number(item.desconto || 0),
        valor_total: Number(item.valor_total),
      })),
      subtotal: Number(sale.subtotal),
      desconto_total: Number(sale.desconto_total),
      total: Number(sale.total),
      pagamentos: payments
        .filter((p: any) => p.status === 'confirmed')
        .map((p: any) => ({
          forma: p.forma_pagamento,
          valor: Number(p.valor),
          troco: p.troco ? Number(p.troco) : undefined,
        })),
      vendedor: sale.vendedor_nome || undefined,
      mostrar_termos_garantia_os: !!sale?.ordem_servico_id,
    };

    const qrCodeData = `${window.location.origin}/cupom/${sale.id}`;
    const pdf = await generateCupomPDF(cupomData, qrCodeData);
    pdf.save(`cupom-${sale.numero}.pdf`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Cupom #${sale?.numero}`,
        text: `Visualize o cupom da venda #${sale?.numero}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return <LoadingSkeleton type="cards" count={3} />;
  }

  if (!sale) {
    return (
      <ModernLayout title="Cupom não encontrado">
        <div className="space-y-4 md:space-y-6 px-1 md:px-0">
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="text-center">
                <p className="text-sm md:text-base text-muted-foreground">
                  Cupom não encontrado ou você não tem permissão para visualizá-lo.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title={`Cupom #${sale.numero}`} subtitle="Visualização do cupom fiscal">
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-lg md:text-xl font-bold">Cupom #{sale.numero}</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {new Date(sale.created_at).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadPDF} 
                  size="sm" 
                  variant="outline"
                  className="h-9 border-2 border-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Baixar PDF</span>
                </Button>
                <Button 
                  onClick={handlePrint} 
                  size="sm" 
                  className="h-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-md"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Reimprimir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div 
              id="cupom-preview" 
              className="bg-white border-2 border-gray-300 rounded-lg overflow-auto mx-auto"
              style={{ maxWidth: '80mm', minHeight: '200px' }}
            >
              {loading ? (
                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  Carregando preview do cupom...
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}

