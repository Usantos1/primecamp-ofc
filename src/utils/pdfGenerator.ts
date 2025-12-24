import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { from } from '@/integrations/db/client';
import type { CupomConfig } from '@/hooks/useCupomConfig';
import { PAYMENT_METHOD_LABELS } from '@/types/pdv';

// ==================== GERADOR DE CUPOM NÃO FISCAL ====================

export interface CupomData {
  numero: number;
  data: string;
  hora: string;
  empresa?: {
    nome?: string;
    cnpj?: string;
    ie?: string;
    endereco?: string;
    telefone?: string;
    whatsapp?: string;
    logo_url?: string;
  };
  cliente?: {
    nome?: string;
    cpf_cnpj?: string;
    telefone?: string;
    cidade?: string;
  };
  itens: Array<{
    codigo?: string;
    nome: string;
    quantidade: number;
    valor_unitario: number;
    desconto: number;
    valor_total: number;
  }>;
  subtotal: number;
  desconto_total: number;
  total: number;
  pagamentos: Array<{
    forma: string;
    valor: number;
    troco?: number;
    parcelas?: number;
    valor_parcela?: number;
  }>;
  vendedor?: string;
  observacoes?: string;
  termos_garantia?: string;
  mostrar_logo?: boolean;
  mostrar_qr_code?: boolean;
  mensagem_rodape?: string;
}

export async function generateCupomTermica(data: CupomData, qrCodeData?: string): Promise<string> {
  // Buscar configurações do cupom
  let config: CupomConfig | null = null;
  try {
    const { data: configData } = await supabase
      .from('cupom_config')
      .select('*')
      .execute().limit(1)
      .single();
    config = configData as CupomConfig | null;
  } catch (error) {
    console.warn('Não foi possível carregar configurações do cupom, usando valores padrão');
  }

  // Usar configurações do banco ou valores padrão
  const empresaNome = data.empresa?.nome || config?.empresa_nome || 'PRIME CAMP ASSISTÊNCIA TÉCNICA';
  const empresaCnpj = data.empresa?.cnpj || config?.empresa_cnpj || '';
  const empresaIe = data.empresa?.ie || config?.empresa_ie || '';
  const empresaEndereco = data.empresa?.endereco || config?.empresa_endereco || '';
  const empresaTelefone = data.empresa?.telefone || config?.empresa_telefone || '';
  const empresaWhatsapp = data.empresa?.whatsapp || config?.empresa_whatsapp || '';
  const logoUrl = data.empresa?.logo_url || config?.logo_url || '';
  const mostrarLogo = data.mostrar_logo !== undefined ? data.mostrar_logo : (config?.mostrar_logo ?? true);
  const mostrarQrCode = data.mostrar_qr_code !== undefined ? data.mostrar_qr_code : (config?.mostrar_qr_code ?? true);
  const termosGarantia = data.termos_garantia || config?.termos_garantia || '';
  const mensagemRodape = data.mensagem_rodape || config?.mensagem_rodape || 'Obrigado pela preferência! Volte sempre';

  // Gerar QR Code se fornecido e configurado
  let qrCodeImg = '';
  if (qrCodeData && mostrarQrCode) {
    try {
      // Aumentar resolução do QR code para melhor qualidade de impressão
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 200, // Aumentado para 200px para melhor qualidade/DPI
        margin: 3,
        errorCorrectionLevel: 'H', // Alto nível de correção de erro para melhor leitura
        type: 'image/png',
        quality: 1.0,
        color: {
          dark: '#000000', // Preto absoluto
          light: '#FFFFFF' // Branco absoluto
        },
        rendererOpts: {
          quality: 1.0
        }
      });
      qrCodeImg = `<img src="${qrCodeUrl}" style="width: 80px; height: 80px; margin: 5px auto; display: block; image-rendering: -webkit-optimize-contrast !important; image-rendering: crisp-edges !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; filter: contrast(1.2) brightness(0.95);" alt="QR Code - Segunda Via" />`;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  }

  // HTML para impressão térmica 80mm - Formato simplificado e legível
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: 80mm 297mm;
          margin: 0;
          padding: 0;
        }
        @media print {
          @page {
            size: 80mm 297mm;
            margin: 0;
            padding: 0;
          }
        }
        @media print {
          * {
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: none !important;
            text-rendering: optimizeLegibility !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
          }
          body {
            font-size: 12px !important;
            padding: 2mm 6mm 2mm 5mm !important;
            min-height: 297mm !important;
            transform: scale(1) !important;
            -webkit-transform: scale(1) !important;
            -webkit-font-smoothing: none !important;
            text-rendering: optimizeLegibility !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          color: #000000 !important;
          -webkit-font-smoothing: none !important;
          text-rendering: optimizeLegibility !important;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
        }
        body {
          width: 80mm;
          max-width: 80mm;
          min-height: 297mm;
          margin: 0;
          padding: 2mm 6mm 2mm 5mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          color: #000000 !important;
          background: #ffffff;
          line-height: 1.4;
          font-weight: 900;
          -webkit-font-smoothing: none !important;
          text-rendering: optimizeLegibility !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow: hidden;
          letter-spacing: 0.2px;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
          transform: scale(1) !important;
          -webkit-transform: scale(1) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          print-color-adjust: exact;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: 900 !important;
          color: #000000 !important;
        }
        .divider {
          border-top: 3px solid #000000 !important;
          margin: 3px 0;
        }
        .divider-dashed {
          border-top: 2px dashed #000000 !important;
          margin: 3px 0;
        }
        .line {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
          font-weight: 900 !important;
          color: #000000 !important;
        }
        .item-line {
          margin: 2px 0;
        }
        .item-name {
          font-weight: 900 !important;
          margin-bottom: 1px;
          color: #000000 !important;
        }
        .total-line {
          font-weight: 900 !important;
          font-size: 11px;
          color: #000000 !important;
        }
        span {
          font-weight: 900 !important;
          color: #000000 !important;
        }
        strong {
          font-weight: 900 !important;
          color: #000000 !important;
        }
        div {
          color: #000000 !important;
          font-weight: 900 !important;
        }
        p {
          color: #000000 !important;
          font-weight: 900 !important;
        }
        img {
          filter: contrast(1.5) brightness(0.9);
          -webkit-filter: contrast(1.5) brightness(0.9);
        }
      </style>
    </head>
    <body>
      ${mostrarLogo && logoUrl ? `
        <div class="center" style="margin-bottom: 3px;">
          <img src="${logoUrl}" style="max-width: 60mm; max-height: 20mm; object-fit: contain; filter: contrast(2) brightness(0.8) saturate(1.2); -webkit-filter: contrast(2) brightness(0.8) saturate(1.2); image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" alt="Logo" />
        </div>
      ` : ''}
      
      <div class="center bold" style="font-size: 12px; margin-bottom: 2px; font-weight: 900 !important; color: #000000 !important;">
        ${empresaNome}
      </div>
      ${empresaCnpj ? `<div class="center" style="font-size: 9px; margin-bottom: 1px; font-weight: 900 !important; color: #000000 !important;">CNPJ: ${empresaCnpj}</div>` : ''}
      ${empresaIe ? `<div class="center" style="font-size: 9px; margin-bottom: 1px; font-weight: 900 !important; color: #000000 !important;">IE: ${empresaIe}</div>` : ''}
      ${empresaEndereco ? `<div class="center" style="font-size: 9px; margin-bottom: 1px; font-weight: 900 !important; color: #000000 !important;">${empresaEndereco}</div>` : ''}
      ${empresaTelefone || empresaWhatsapp ? `
        <div class="center" style="font-size: 9px; margin-bottom: 3px; font-weight: 900 !important; color: #000000 !important;">
          ${empresaTelefone ? `Tel:${empresaTelefone}` : ''}${empresaTelefone && empresaWhatsapp ? ' / ' : ''}${empresaWhatsapp ? `WhatsApp:${empresaWhatsapp}` : ''}
        </div>
      ` : ''}
      
      <div class="divider" style="margin: 3px 0;"></div>
      
      <div class="center bold" style="font-size: 10px; margin: 3px 0; font-weight: 900 !important; color: #000000 !important;">
        PEDIDO N° ${data.numero}
      </div>
      <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">Operação:</span>
        <span style="font-weight: 900 !important; color: #000000 !important;">VENDA</span>
      </div>
      <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">${data.data} - ${data.hora.split(':').slice(0, 2).join(':')}</span>
      </div>
      ${data.vendedor ? `
        <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
          <span style="font-weight: 900 !important; color: #000000 !important;">VENDEDOR:</span>
          <span style="font-weight: 900 !important; color: #000000 !important;">${data.vendedor}</span>
        </div>
      ` : ''}
      
      <div class="line" style="font-size: 10px; margin-top: 2px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">CLIENTE:</span>
        <span style="font-weight: 900 !important; color: #000000 !important;">${data.cliente?.nome || 'CONSUMIDOR FINAL'}</span>
      </div>
      ${data.cliente?.cidade ? `
        <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
          <span style="font-weight: 900 !important; color: #000000 !important;">CIDADE:</span>
          <span style="font-weight: 900 !important; color: #000000 !important;">${data.cliente.cidade}</span>
        </div>
      ` : ''}
      
      <div class="divider-dashed" style="margin: 3px 0;"></div>
      
      <div style="font-size: 10px; margin-bottom: 2px; font-weight: 900 !important; color: #000000 !important;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000000; padding: 2px 0; gap: 6px;">
          <span style="font-weight: 900 !important; color: #000000 !important; min-width: 32px;">Cod</span>
          <span style="font-weight: 900 !important; color: #000000 !important; flex: 1; text-align: center; margin: 0 6px;">Descrição</span>
          <span style="font-weight: 900 !important; color: #000000 !important; min-width: 30px; text-align: right;">Qtd</span>
          <span style="font-weight: 900 !important; color: #000000 !important; min-width: 44px; text-align: right;">Vl Item</span>
          <span style="font-weight: 900 !important; color: #000000 !important; min-width: 50px; text-align: right;">Vl Total</span>
        </div>
      </div>
      
      ${data.itens.map((item, idx) => `
        <div style="font-size: 10px; margin: 2px 0; font-weight: 900 !important; color: #000000 !important;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
            <span style="font-weight: 900 !important; color: #000000 !important; min-width: 35px;">${item.codigo || String(idx + 1).padStart(6, '0')}</span>
            <span style="font-weight: 900 !important; color: #000000 !important; flex: 1; text-align: left; margin: 0 4px; text-transform: uppercase; letter-spacing: 0.1px;">${(item.nome || '').toUpperCase()}</span>
            <span style="font-weight: 900 !important; color: #000000 !important; min-width: 32px; text-align: right;">${item.quantidade}</span>
            <span style="font-weight: 900 !important; color: #000000 !important; min-width: 46px; text-align: right;">${formatCurrency(item.valor_unitario)}</span>
            <span style="font-weight: 900 !important; color: #000000 !important; min-width: 52px; text-align: right;">${formatCurrency(item.valor_total)}</span>
          </div>
        </div>
      `).join('')}
      
      <div class="divider" style="margin: 3px 0;"></div>
      
      <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">Total Desconto:</span>
        <span style="font-weight: 900 !important; color: #000000 !important;">${formatCurrency(data.desconto_total)}</span>
      </div>
      <div class="line total-line" style="font-size: 11px; margin-top: 2px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">Total:</span>
        <span style="font-weight: 900 !important; color: #000000 !important;">${formatCurrency(data.total)}</span>
      </div>
      
      <div class="line" style="font-size: 10px; margin-top: 2px; font-weight: 900 !important; color: #000000 !important;">
        <span style="font-weight: 900 !important; color: #000000 !important;">Valor Pago:</span>
        <span style="font-weight: 900 !important; color: #000000 !important;">${formatCurrency(data.total)}</span>
      </div>
      
      ${data.pagamentos.map(pag => {
        const troco = pag.troco || 0;
        // Traduzir forma de pagamento para português
        const formaPagamentoLabel = PAYMENT_METHOD_LABELS[pag.forma as keyof typeof PAYMENT_METHOD_LABELS] || pag.forma.toUpperCase();
        const parcelas = pag.parcelas && pag.parcelas > 1 ? ` (${pag.parcelas}x)` : '';
        return `
          ${troco > 0 ? `
            <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
              <span style="font-weight: 900 !important; color: #000000 !important;">Troco:</span>
              <span style="font-weight: 900 !important; color: #000000 !important;">${formatCurrency(troco)}</span>
            </div>
          ` : ''}
          <div class="line" style="font-size: 10px; font-weight: 900 !important; color: #000000 !important;">
            <span style="font-weight: 900 !important; color: #000000 !important;">${formaPagamentoLabel}${parcelas}:</span>
            <span style="font-weight: 900 !important; color: #000000 !important;">${formatCurrency(pag.valor)}</span>
          </div>
        `;
      }).join('')}
      
      ${termosGarantia ? `
        <div class="divider-dashed" style="margin: 3px 0;"></div>
        <div style="font-size: 8px; line-height: 1.3; font-weight: 900 !important; color: #000000 !important; text-align: justify;">
          ${termosGarantia}
        </div>
      ` : ''}
      
      <div class="divider" style="margin: 3px 0;"></div>
      
      <div class="center" style="font-size: 9px; margin-top: 3px; font-weight: 900 !important; color: #000000 !important;">
        <div style="font-weight: 900 !important; color: #000000 !important;">${mensagemRodape}</div>
        ${qrCodeImg ? `
          <div style="margin-top: 3px;">
            ${qrCodeImg}
          </div>
        ` : ''}
        <div style="font-size: 8px; margin-top: 2px; font-weight: 900 !important; color: #000000 !important;">
          Impresso em ${data.data} - ${data.hora.split(':').slice(0, 2).join(':')}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

export async function generateCupomPDF(data: CupomData, qrCodeData?: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297] // 80mm width, auto height
  });

  let y = 10;
  const pageWidth = 80;
  const margin = 5;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.empresa?.nome || 'PRIME CAMP', pageWidth / 2, y, { align: 'center' });
  y += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assistência Técnica', pageWidth / 2, y, { align: 'center' });
  y += 4;
  if (data.empresa?.cnpj) {
    doc.text(`CNPJ: ${data.empresa.cnpj}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (data.empresa?.endereco) {
    const enderecoLines = doc.splitTextToSize(data.empresa.endereco, pageWidth - 2 * margin);
    enderecoLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 4;
    });
  }
  if (data.empresa?.telefone) {
    doc.text(`Telefone: ${data.empresa.telefone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  y += 6;

  // Linha divisória
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Título
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUPOM NÃO FISCAL', pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Informações da venda
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Venda #${data.numero}`, margin, y);
  y += 4;
  doc.text(`Data: ${data.data} ${data.hora}`, margin, y);
  y += 5;

  // Cliente
  if (data.cliente?.nome) {
    doc.text(`Cliente: ${data.cliente.nome}`, margin, y);
    y += 4;
    if (data.cliente.cpf_cnpj) {
      doc.text(`CPF/CNPJ: ${data.cliente.cpf_cnpj}`, margin, y);
      y += 4;
    }
    if (data.cliente.telefone) {
      doc.text(`Tel: ${data.cliente.telefone}`, margin, y);
      y += 4;
    }
    y += 2;
  }

  // Linha divisória
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Itens
  data.itens.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.nome, margin, y);
    y += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const itemLine = `${item.quantidade}x ${formatCurrency(item.valor_unitario)}`;
    const itemTotal = formatCurrency(item.valor_total);
    doc.text(itemLine, margin, y);
    doc.text(itemTotal, pageWidth - margin, y, { align: 'right' });
    y += 4;
    
    if (item.desconto > 0) {
      doc.text(`Desc: -${formatCurrency(item.desconto)}`, margin + 5, y);
      y += 3;
    }
    y += 2;
  });

  // Linha divisória
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Totais
  doc.setFontSize(8);
  doc.text('Subtotal:', margin, y);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 4;

  if (data.desconto_total > 0) {
    doc.text('Desconto:', margin, y);
    doc.text(`-${formatCurrency(data.desconto_total)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', margin, y);
  doc.text(formatCurrency(data.total), pageWidth - margin, y, { align: 'right' });
  y += 6;

  // Linha divisória
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Pagamentos
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  data.pagamentos.forEach(pag => {
    // Traduzir forma de pagamento para português
    const formaPagamentoLabel = PAYMENT_METHOD_LABELS[pag.forma as keyof typeof PAYMENT_METHOD_LABELS] || pag.forma.toUpperCase();
    doc.text(`${formaPagamentoLabel}:`, margin, y);
    doc.text(formatCurrency(pag.valor), pageWidth - margin, y, { align: 'right' });
    y += 4;
    
    if (pag.troco) {
      doc.setFontSize(7);
      doc.text(`Troco: ${formatCurrency(pag.troco)}`, margin + 5, y);
      y += 4;
      doc.setFontSize(8);
    }
    y += 2;
  });

  // Observações
  if (data.observacoes) {
    y += 3;
    doc.text(`Obs: ${data.observacoes}`, margin, y);
    y += 5;
  }

  // Vendedor
  if (data.vendedor) {
    doc.text(`Vendedor: ${data.vendedor}`, margin, y);
    y += 5;
  }

  // QR Code
  if (qrCodeData) {
    try {
      // Aumentar resolução do QR code para melhor qualidade no PDF
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 200, // Alta resolução para melhor qualidade
        margin: 3,
        errorCorrectionLevel: 'H', // Alto nível de correção de erro
        type: 'image/png',
        quality: 1.0,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        rendererOpts: {
          quality: 1.0
        }
      });
      
      // Adicionar QR code com tamanho maior e melhor qualidade
      doc.addImage(qrCodeUrl, 'PNG', (pageWidth - 50) / 2, y, 50, 50, undefined, 'FAST');
      y += 55;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  }

  // Termos de Garantia
  if (data.termos_garantia) {
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMOS DE GARANTIA:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const termosLines = doc.splitTextToSize(data.termos_garantia, pageWidth - 2 * margin);
    termosLines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 3;
    });
  }

  // Rodapé
  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(7);
  doc.text('Obrigado pela preferência!', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Volte sempre', pageWidth / 2, y, { align: 'center' });

  return doc;
}

// ==================== GERADOR DE COMPROVANTE DE PAGAMENTO ====================

export interface ComprovanteData {
  numero: number;
  data: string;
  hora: string;
  cliente?: {
    nome?: string;
    cpf_cnpj?: string;
  };
  pagamento: {
    forma: string;
    valor: number;
    troco?: number;
    parcelas?: number;
    valor_parcela?: number;
  };
  vendedor?: string;
}

export async function generateComprovantePDF(data: ComprovanteData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let y = 20;
  const pageWidth = 210;
  const margin = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE PAGAMENTO', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Informações
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Venda #${data.numero}`, margin, y);
  y += 6;
  doc.text(`Data: ${data.data} ${data.hora}`, margin, y);
  y += 8;

  if (data.cliente?.nome) {
    doc.text(`Cliente: ${data.cliente.nome}`, margin, y);
    y += 6;
    if (data.cliente.cpf_cnpj) {
      doc.text(`CPF/CNPJ: ${data.cliente.cpf_cnpj}`, margin, y);
      y += 6;
    }
  }

  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Pagamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DADOS DO PAGAMENTO', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Forma de Pagamento: ${data.pagamento.forma}`, margin, y);
  y += 6;
  doc.text(`Valor: ${formatCurrency(data.pagamento.valor)}`, margin, y);
  y += 6;

  if (data.pagamento.troco) {
    doc.text(`Troco: ${formatCurrency(data.pagamento.troco)}`, margin, y);
    y += 6;
  }

  if (data.pagamento.parcelas && data.pagamento.parcelas > 1) {
    doc.text(`Parcelas: ${data.pagamento.parcelas}x`, margin, y);
    y += 6;
    if (data.pagamento.valor_parcela) {
      doc.text(`Valor da Parcela: ${formatCurrency(data.pagamento.valor_parcela)}`, margin, y);
      y += 6;
    }
  }

  if (data.vendedor) {
    y += 5;
    doc.text(`Vendedor: ${data.vendedor}`, margin, y);
  }

  return doc;
}

// ==================== GERADOR DE TERMO DE GARANTIA ====================

export interface GarantiaData {
  numero: number;
  data: string;
  cliente: {
    nome: string;
    cpf_cnpj?: string;
    telefone?: string;
    endereco?: string;
  };
  produto: {
    nome: string;
    codigo?: string;
  };
  garantia: {
    dias: number;
    data_inicio: string;
    data_fim: string;
    regras?: string;
  };
  vendedor?: string;
}

export async function generateTermoGarantiaPDF(data: GarantiaData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let y = 20;
  const pageWidth = 210;
  const margin = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE GARANTIA', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Informações
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Venda #${data.numero}`, margin, y);
  y += 6;
  doc.text(`Data: ${data.data}`, margin, y);
  y += 10;

  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.cliente.nome}`, margin, y);
  y += 6;
  if (data.cliente.cpf_cnpj) {
    doc.text(`CPF/CNPJ: ${data.cliente.cpf_cnpj}`, margin, y);
    y += 6;
  }
  if (data.cliente.telefone) {
    doc.text(`Telefone: ${data.cliente.telefone}`, margin, y);
    y += 6;
  }
  if (data.cliente.endereco) {
    doc.text(`Endereço: ${data.cliente.endereco}`, margin, y);
    y += 6;
  }

  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Produto
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTO', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.produto.nome}`, margin, y);
  y += 6;
  if (data.produto.codigo) {
    doc.text(`Código: ${data.produto.codigo}`, margin, y);
    y += 6;
  }

  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Garantia
  doc.setFont('helvetica', 'bold');
  doc.text('PERÍODO DE GARANTIA', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Prazo: ${data.garantia.dias} dias`, margin, y);
  y += 6;
  doc.text(`Data de Início: ${data.garantia.data_inicio}`, margin, y);
  y += 6;
  doc.text(`Data de Término: ${data.garantia.data_fim}`, margin, y);
  y += 10;

  if (data.garantia.regras) {
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES DA GARANTIA', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const regrasLines = doc.splitTextToSize(data.garantia.regras, pageWidth - 2 * margin);
    doc.text(regrasLines, margin, y);
    y += regrasLines.length * 6;
  }

  y += 10;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Assinaturas
  doc.setFontSize(9);
  doc.text('Assinatura do Cliente:', margin, y);
  y += 20;
  doc.line(margin, y, pageWidth / 2 - 10, y);
  y += 5;
  doc.text(data.cliente.nome, margin, y);
  
  y -= 25;
  doc.text('Assinatura do Vendedor:', pageWidth / 2 + 10, y);
  y += 20;
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;
  if (data.vendedor) {
    doc.text(data.vendedor, pageWidth / 2 + 10, y);
  }

  return doc;
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ==================== IMPRESSÃO TÉRMICA ====================

export function printTermica(html: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Aguardar carregamento do QR Code se houver
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

