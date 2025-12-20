import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, Share2 } from 'lucide-react';
import { generateCupomTermica, generateCupomPDF, printTermica } from '@/utils/pdfGenerator';
import { useSales, useSaleItems, usePayments } from '@/hooks/usePDV';
import { useCupomConfig } from '@/hooks/useCupomConfig';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function CupomView() {
  const { id } = useParams<{ id: string }>();
  const { getSaleById } = useSales();
  const { items, isLoading: itemsLoading } = useSaleItems(id || '');
  const { payments, isLoading: paymentsLoading } = usePayments(id || '');
  const { data: cupomConfig } = useCupomConfig();
  const [sale, setSale] = useState<any>(null);
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
      const saleData = await getSaleById(id);
      setSale(saleData);
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

  if (loading || itemsLoading || paymentsLoading) {
    return <LoadingSkeleton type="cards" count={3} />;
  }

  if (!sale) {
    return (
      <ModernLayout title="Cupom não encontrado">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Cupom não encontrado ou você não tem permissão para visualizá-lo.
            </p>
          </CardContent>
        </Card>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title={`Cupom #${sale.numero}`} subtitle="Segunda via do cupom fiscal">
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Cupom
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div 
              id="cupom-preview" 
              className="bg-white p-4 border rounded-lg overflow-auto"
              style={{ maxWidth: '80mm', margin: '0 auto', minHeight: '200px' }}
            >
              {loading ? 'Carregando preview do cupom...' : ''}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}

