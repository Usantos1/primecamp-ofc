import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ==================== GERADOR DE CUPOM NÃO FISCAL ====================

export interface CupomData {
  numero: number;
  data: string;
  hora: string;
  empresa?: {
    nome?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
  };
  cliente?: {
    nome?: string;
    cpf_cnpj?: string;
    telefone?: string;
  };
  itens: Array<{
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
  }>;
  vendedor?: string;
  observacoes?: string;
  termos_garantia?: string;
}

export async function generateCupomTermica(data: CupomData, qrCodeData?: string): Promise<string> {
  // Gerar QR Code se fornecido
  let qrCodeImg = '';
  if (qrCodeData) {
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 60,
        margin: 1
      });
      qrCodeImg = `<img src="${qrCodeUrl}" style="width: 60px; height: 60px; margin: 5px auto; display: block;" />`;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  }

  // HTML para impressão térmica 80mm
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 3mm;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.3;
          }
        }
        body {
          width: 80mm;
          margin: 0;
          padding: 3mm;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          line-height: 1.3;
        }
        .header {
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
          margin-bottom: 5px;
        }
        .title {
          font-weight: bold;
          font-size: 13px;
          color: #000;
          text-transform: uppercase;
        }
        .info {
          font-size: 10px;
          margin: 2px 0;
          color: #000;
          line-height: 1.4;
        }
        .item {
          margin: 3px 0;
          font-size: 10px;
          color: #000;
        }
        .item-name {
          font-weight: bold;
          font-size: 11px;
          color: #000;
          margin-bottom: 1px;
        }
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #000;
        }
        .total {
          border-top: 1px solid #000;
          margin-top: 5px;
          padding-top: 5px;
          font-weight: bold;
          font-size: 11px;
          color: #000;
        }
        .payment {
          margin: 2px 0;
          font-size: 10px;
          color: #000;
        }
        .footer {
          text-align: center;
          margin-top: 8px;
          font-size: 9px;
          border-top: 1px solid #000;
          padding-top: 5px;
          color: #000;
        }
        .qr-code {
          text-align: center;
          margin: 8px 0;
        }
        * {
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        strong {
          font-weight: bold;
          color: #000;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${data.empresa?.nome || 'PRIME CAMP'}</div>
        <div class="info">Assistência Técnica</div>
        ${data.empresa?.cnpj ? `<div class="info">CNPJ: ${data.empresa.cnpj}</div>` : ''}
        ${data.empresa?.endereco ? `<div class="info">${data.empresa.endereco}</div>` : ''}
        ${data.empresa?.telefone ? `<div class="info">Telefone: ${data.empresa.telefone}</div>` : ''}
      </div>
      
      <div class="info">
        <strong>CUPOM NÃO FISCAL</strong>
      </div>
      <div class="info">
        Venda #${data.numero}
      </div>
      <div class="info">
        Data: ${data.data} ${data.hora}
      </div>
      
      ${data.cliente?.nome ? `
        <div class="info">
          Cliente: ${data.cliente.nome}
          ${data.cliente.cpf_cnpj ? `<br>CPF/CNPJ: ${data.cliente.cpf_cnpj}` : ''}
          ${data.cliente.telefone ? `<br>Tel: ${data.cliente.telefone}` : ''}
        </div>
      ` : ''}
      
      <div style="border-top: 1px dashed #000; margin: 5px 0; padding-top: 5px;">
        ${data.itens.map(item => `
          <div class="item">
            <div class="item-name">${item.nome}</div>
            <div class="item-details">
              <span>${item.quantidade}x ${formatCurrency(item.valor_unitario)}</span>
              ${item.desconto > 0 ? `<span>Desc: -${formatCurrency(item.desconto)}</span>` : ''}
              <span>${formatCurrency(item.valor_total)}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="total">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.desconto_total > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Desconto:</span>
            <span>-${formatCurrency(data.desconto_total)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span><strong>TOTAL:</strong></span>
          <span><strong>${formatCurrency(data.total)}</strong></span>
        </div>
      </div>
      
      <div style="border-top: 1px solid #000; margin: 5px 0; padding-top: 5px;">
        ${data.pagamentos.map(pag => `
          <div class="payment">
            <div style="display: flex; justify-content: space-between;">
              <span>${pag.forma}:</span>
              <span>${formatCurrency(pag.valor)}</span>
            </div>
            ${pag.troco ? `
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 2px;">
                <span>Troco:</span>
                <span>${formatCurrency(pag.troco)}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      ${data.observacoes ? `
        <div class="info" style="margin-top: 5px;">
          <strong>Obs:</strong> ${data.observacoes}
        </div>
      ` : ''}
      
      ${data.vendedor ? `
        <div class="info">
          Vendedor: ${data.vendedor}
        </div>
      ` : ''}
      
      ${data.termos_garantia ? `
        <div style="border-top: 1px dashed #000; margin: 5px 0; padding-top: 5px; font-size: 7px;">
          <div style="font-weight: bold; margin-bottom: 3px;">TERMOS DE GARANTIA:</div>
          <div style="text-align: justify; line-height: 1.3;">${data.termos_garantia}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <div>Obrigado pela preferência!</div>
        <div>Volte sempre</div>
        ${qrCodeImg ? `
          <div class="qr-code">
            ${qrCodeImg}
          </div>
        ` : ''}
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
    doc.text(`${pag.forma}:`, margin, y);
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
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 40,
        margin: 1
      });
      
      doc.addImage(qrCodeUrl, 'PNG', (pageWidth - 40) / 2, y, 40, 40);
      y += 45;
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

