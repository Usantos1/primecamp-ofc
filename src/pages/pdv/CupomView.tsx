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
      
      // Carregar venda diretamente do Supabase (público)
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select('*')
        .execute().eq('id', id)
        .single();
      
      if (saleError) throw saleError;
      setSale(saleData);
      
      // Carregar items
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .execute().eq('sale_id', id);
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
      
      // Carregar payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .execute().eq('sale_id', id);
      
      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
      
      // Carregar configuração do cupom (pode falhar se não houver, mas não é crítico)
      try {
        const { data: configData } = await supabase
          .from('kv_store_2c4defad')
          .select('value')
          .execute().eq('key', 'cupom_config')
          .single();
        
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

