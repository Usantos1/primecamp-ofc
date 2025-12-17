import jsPDF from 'jspdf';
// @ts-ignore
import JsBarcode from 'jsbarcode';

export interface EtiquetaData {
  descricao: string;
  descricao_abreviada?: string;
  preco_venda: number;
  codigo_barras?: string;
  codigo?: number;
  referencia?: string;
  empresa?: {
    nome?: string;
    logo?: string;
  };
}

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

function mmToPx(mm: number, dpi: number) {
  return Math.max(1, Math.round((mm * dpi) / 25.4));
}

// calcula dígito verificador EAN13 a partir de 12 dígitos
function ean13CheckDigit(d12: string) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(d12[i], 10);
    sum += (i % 2 === 0) ? n : n * 3;
  }
  const mod = sum % 10;
  return (mod === 0) ? 0 : (10 - mod);
}

// se não vier codigo_barras, monta EAN13: prefixo + código (padrão tipo o seu 78900000xxxxx?)
function buildEan13FromCodigo(codigo: number | string) {
  const cod = String(codigo ?? '').replace(/\D/g, '').padStart(5, '0'); // 2515 -> 02515
  const prefix12 = `78900000${cod}`; // 8 + 5 = 13? aqui é 12 antes do DV
  // garante 12 dígitos antes do DV
  const d12 = prefix12.slice(0, 12);
  const dv = ean13CheckDigit(d12);
  return `${d12}${dv}`;
}

function makeBarcodeDataUrl(value: string, targetWmm: number, targetHmm: number, dpi = 300) {
  const canvas = document.createElement('canvas');
  const digits = onlyDigits(value);

  const useEAN13 = digits.length === 13;
  const barcodeValue = useEAN13 ? digits : (value || '123456789012');

  // cria um canvas grande (alta resolução)
  const pxW = mmToPx(targetWmm, dpi);
  const pxH = mmToPx(targetHmm, dpi);
  canvas.width = pxW;
  canvas.height = pxH;

  // "altura" só das barras (sem texto)
  const barsPxH = Math.round(pxH * 0.78);

  // largura do módulo (px) proporcional ao tamanho final
  // 95 módulos do EAN13 + "respiro" (quiet zone)
  const modulePx = Math.max(2, Math.floor(pxW / 115));

  try {
    // @ts-ignore
    JsBarcode(canvas, barcodeValue, {
      format: useEAN13 ? 'EAN13' : 'CODE128',
      width: modulePx,
      height: barsPxH,
      margin: 0,
      displayValue: false,
    });
  } catch {
    // @ts-ignore
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE128',
      width: modulePx,
      height: barsPxH,
      margin: 0,
      displayValue: false,
    });
  }

  return { dataUrl: canvas.toDataURL('image/png'), barcodeValue };
}

function drawEtiqueta(doc: jsPDF, x: number, y: number, w: number, h: number, data: EtiquetaData) {
  const pad = 1;

  // Fundo
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'F');

  // ====== TOPO (nome + preço) ocupa a largura toda ======
  const topH = 7.5; // altura do cabeçalho

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  // Nome
  doc.setFontSize(7.2);
  const title = (data.descricao_abreviada || data.descricao || '').toUpperCase();
  const topPadY = y + 2.8;
  doc.text(title, x + pad, topPadY, { maxWidth: w - pad * 2 } as any);

  // Preço
  doc.setFontSize(7.0);
  const price = `R$ ${data.preco_venda.toFixed(2).replace('.', ',')}`;
  doc.text(price, x + pad, topPadY + 3.6);

  // ====== PARTE DE BAIXO ======
  const bottomY = y + topH;
  const bottomH = h - topH;

  // ====== LOGO (quadrado vermelho) ======
  // Área do logo (quadrado)
  const logoSize = 12;
  const logoX = x + pad;
  const logoY = y + h - pad - logoSize;

  // Fundo vermelho do logo
  doc.setFillColor(220, 38, 38);
  doc.rect(logoX, logoY, logoSize, logoSize, 'F');

  // Tenta desenhar logo (se existir). Se falhar, escreve PRIME/CAMP
  let logoOk = false;

  if (data.empresa?.logo) {
    try {
      doc.addImage(
        data.empresa.logo,
        'PNG',
        logoX + 0.6,
        logoY + 0.6,
        logoSize - 1.2,
        logoSize - 1.2
      );
      logoOk = true;
    } catch {
      logoOk = false;
    }
  }

  if (!logoOk) {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    // ajuste fino pra caber no quadrado 12x12
    doc.setFontSize(6.2);

    const cx = logoX + logoSize / 2;
    const cy = logoY + logoSize / 2;

    doc.text('PRIME', cx, cy - 1.2, { align: 'center' } as any);
    doc.text('CAMP',  cx, cy + 2.4, { align: 'center' } as any);
  }

  // Código do produto vertical (2515) entre logo e barcode
  const codeColW = 5;                 // "faixa" do código vertical
  const codeX = logoX + logoSize + 2; // logo + espaçamento
  if (data.codigo !== undefined && data.codigo !== null) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    // desenha de baixo pra cima (igual seu modelo) - alinhado com número do barcode
    doc.text(String(data.codigo), codeX + (codeColW / 2), y + h - 2.0, { angle: 90 } as any);
  }

  // Barcode à direita (com quiet zone - respiro lateral)
  const barcodeX = codeX + codeColW + 2.5; // +0.5mm de respiro (quiet zone)
  const barcodeW = x + w - pad - barcodeX;

  // valor do barcode
  let barcodeValueToUse = data.codigo_barras ? onlyDigits(data.codigo_barras) : '';
  if (!barcodeValueToUse && data.codigo !== undefined && data.codigo !== null) {
    barcodeValueToUse = buildEan13FromCodigo(data.codigo);
  }
  if (!barcodeValueToUse) barcodeValueToUse = '7890000000000';

  // reserva área do barcode (barras) + área do número (texto) abaixo
  const barcodeTextH = 3.2;
  const barcodeBarsH = 11.5;

  // DPI padrão: 203 (maioria das impressoras térmicas) ou 300 (alta resolução)
  // Ajuste conforme sua impressora: 203 para impressoras térmicas comuns, 300 para alta resolução
  const barcodeDpi = 203; // Altere para 300 se sua impressora for 300 DPI

  const { dataUrl: barcodePng, barcodeValue } = makeBarcodeDataUrl(
    barcodeValueToUse,
    barcodeW,
    barcodeBarsH,
    barcodeDpi
  );

  const barcodeBottom = y + h - pad;
  const barcodeTextY = barcodeBottom - 0.6;                 // linha do número
  const barcodeBarsY = barcodeBottom - barcodeTextH - barcodeBarsH; // barras acima do número

  doc.addImage(barcodePng, 'PNG', barcodeX, barcodeBarsY, barcodeW, barcodeBarsH);

  // número do barcode desenhado pelo PDF (fica perfeito na impressão)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5); // Fonte um pouco maior para melhor leitura em balcão
  doc.text(barcodeValue, barcodeX + barcodeW / 2, barcodeTextY, { align: 'center' } as any);
}

/**
 * Etiqueta única (igual a foto): 54mm x 25mm - HORIZONTAL
 */
export async function generateEtiquetaPDF(data: EtiquetaData): Promise<jsPDF> {
  // Validação dos dados
  if (!data.descricao) {
    throw new Error('Descrição do produto é obrigatória');
  }
  if (typeof data.preco_venda !== 'number' || data.preco_venda < 0) {
    throw new Error('Preço de venda inválido');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [54, 25], // Largura x Altura (54mm x 25mm) - HORIZONTAL
    compress: true,
  });

  drawEtiqueta(doc, 0, 0, 54, 25, data);
  return doc;
}

/**
 * A4 com várias etiquetas: desenha direto, sem "PDF dentro de PNG"
 */
export async function generateEtiquetasA4(
  produtos: EtiquetaData[],
  colunas: number = 3,
  linhas: number = 10
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;

  const w = 54; // Largura da etiqueta (horizontal)
  const h = 25; // Altura da etiqueta (horizontal)

  const gapX = 2;
  const gapY = 2;

  const gridW = colunas * w + (colunas - 1) * gapX;
  const gridH = linhas * h + (linhas - 1) * gapY;

  const startX = (pageW - gridW) / 2;
  const startY = (pageH - gridH) / 2;

  let i = 0;
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < colunas; c++) {
      if (i >= produtos.length) return doc;

      const x = startX + c * (w + gapX);
      const y = startY + r * (h + gapY);

      drawEtiqueta(doc, x, y, w, h, produtos[i]);
      i++;
    }
  }

  return doc;
}

/**
 * Imprime etiqueta diretamente
 */
export function printEtiqueta(data: EtiquetaData) {
  generateEtiquetaPDF(data).then((doc) => {
    doc.autoPrint();
    doc.output('dataurlnewwindow');
  });
}
