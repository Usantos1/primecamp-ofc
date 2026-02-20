import QRCode from 'qrcode';
import { OrdemServico } from '@/types/assistencia';
import { ChecklistConfigItem } from '@/hooks/useChecklistConfig';
import { dateFormatters, currencyFormatters } from '@/utils/formatters';

export interface OSTermicaData {
  os: OrdemServico;
  clienteNome: string;
  marcaNome?: string;
  modeloNome?: string;
  checklistEntrada: ChecklistConfigItem[];
  checklistEntradaMarcados: string[];
  fotoEntradaUrl?: string;
  imagemReferenciaUrl?: string; // URL da imagem de referência do aparelho
  areasDefeito?: string[]; // Array de strings no formato "x-y" (percentuais)
  via: 'cliente' | 'loja';
  /** Se true, não exibe a seção "CHECKLIST DE ENTRADA" na via (usado nas vias cliente e loja). */
  omitirChecklist?: boolean;
}

export async function generateOSTermica(data: OSTermicaData): Promise<string> {
  const { os, clienteNome, marcaNome, modeloNome, checklistEntrada, checklistEntradaMarcados, imagemReferenciaUrl, areasDefeito, via, omitirChecklist } = data;

  // Gerar QR Code com URL da OS
  let qrCodeImg = '';
  try {
    const publicDomain = 'https://primecamp.cloud';
    const qrCodeUrl = await QRCode.toDataURL(`${publicDomain}/acompanhar-os/${os.id}`, {
      width: 120,
      margin: 2,
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
    });
    qrCodeImg = `<img src="${qrCodeUrl}" style="width: 80px; height: 80px; margin: 5px auto; display: block; image-rendering: -webkit-optimize-contrast !important; image-rendering: crisp-edges !important; filter: contrast(1.2) brightness(0.95);" alt="QR Code" />`;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }

  // Formatar checklist de entrada - APENAS PROBLEMAS ENCONTRADOS (físicos)
  const checklistFisico = checklistEntrada
    .filter(item => item.categoria === 'fisico' && checklistEntradaMarcados.includes(item.item_id))
    .map(item => item.nome)
    .join(', ');

  // Dados formatados (compactos para reduzir comprimento da nota)
  const dataEntrada = dateFormatters.short(os.data_entrada);
  const horaEntrada = os.hora_entrada || '';
  const previsaoData = os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : '';
  const previsaoHora = (os as any).hora_previsao || '';
  const previsaoEntrega = previsaoData + (previsaoHora ? ` - Hora: ${previsaoHora}` : '') || '-';
  const valorTotal = os.valor_total ? currencyFormatters.brl(os.valor_total) : '-';
  const corAparelho = (os as any).cor ? String((os as any).cor).trim() : '';

  // Imagem de referência com pontos de defeito (se houver)
  let imagemReferenciaHtml = '';
  if (imagemReferenciaUrl) {
    // Gerar pontos de defeito
    const defectPoints = (areasDefeito || []).map(defect => {
      const parts = defect.split('-');
      if (parts.length >= 2) {
        return {
          x: parseFloat(parts[0]) || 0,
          y: parseFloat(parts[1]) || 0,
        };
      }
      return null;
    }).filter((d): d is { x: number; y: number } => d !== null);

    // Criar SVG com overlay dos defeitos
    const defectMarkers = defectPoints.map((point, index) => {
      // Converter percentuais para coordenadas SVG (assumindo viewBox 0 0 100 100)
      return `<circle cx="${point.x}" cy="${point.y}" r="2" fill="red" stroke="white" stroke-width="0.5" opacity="0.9" />`;
    }).join('');

    imagemReferenciaHtml = `
      <div style="margin: 5px 0; text-align: center;">
        <div style="position: relative; display: inline-block; max-width: 100%;">
          <img id="ref-img-${os.id}" src="${imagemReferenciaUrl}" style="max-width: 100%; max-height: 200px; object-fit: contain; border: 1px solid #000; display: block;" alt="Referência do Aparelho" />
          ${defectMarkers ? `
            <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;" viewBox="0 0 100 100" preserveAspectRatio="none">
              ${defectMarkers}
            </svg>
          ` : ''}
        </div>
        <p style="font-size: 8px; margin-top: 2px;">Referência do Aparelho${defectPoints.length > 0 ? ` • ${defectPoints.length} defeito${defectPoints.length !== 1 ? 's' : ''} marcado${defectPoints.length !== 1 ? 's' : ''}` : ''}</p>
      </div>
    `;
  }

  // Figura do padrão de desenho (senha) — maior e com números ao lado de cada bolinha (sequência 1, 2, 3...) para leitura em térmica
  // Grid 0-8: 0=top-left, 1=top-center, 2=top-right, 3=mid-left, 4=center, 5=mid-right, 6=bot-left, 7=bot-center, 8=bot-right
  // Aceita também 1-9 (formulário): 1→0, 2→1, ..., 9→8
  const patternToSvg = (pattern: string | undefined): string => {
    if (!pattern || !String(pattern).trim()) return '';
    const points: Record<string, [number, number]> = {
      '0': [20, 20], '1': [50, 20], '2': [80, 20],
      '3': [20, 50], '4': [50, 50], '5': [80, 50],
      '6': [20, 80], '7': [50, 80], '8': [80, 80],
    };
    let seq = String(pattern).replace(/\s/g, '').split(/[-,.]/).filter(Boolean);
    // Normalizar 1-9 para 0-8 se vier do formulário
    if (seq.every(d => d >= '1' && d <= '9')) {
      seq = seq.map(d => String(Number(d) - 1));
    }
    if (seq.length < 2) return '';
    const lines: string[] = [];
    for (let i = 0; i < seq.length - 1; i++) {
      const a = points[seq[i]];
      const b = points[seq[i + 1]];
      if (a && b) lines.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#000" stroke-width="2.5" />`);
    }
    const circles = ['0','1','2','3','4','5','6','7','8'].map(k => {
      const [x, y] = points[k];
      const active = seq.includes(k);
      const order = active ? seq.indexOf(k) + 1 : 0;
      // Número ao lado da bolinha (à direita) para não ficar em cima e ser legível em térmica
      const numText = order ? `<text x="${Math.min(x + 9, 92)}" y="${y + 4}" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="#000">${order}</text>` : '';
      return `<circle cx="${x}" cy="${y}" r="6" fill="${active ? '#000' : '#fff'}" stroke="#000" stroke-width="2"/>${numText}`;
    }).join('');
    return `<div style="margin: 6px 0; text-align: center;"><svg width="140" height="140" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;"><rect x="2" y="2" width="96" height="96" rx="6" fill="#fff" stroke="#000" stroke-width="2"/>${lines.join('')}${circles}</svg></div>`;
  };
  const patternSvgHtml = patternToSvg(os.padrao_desbloqueio);

  // Possui senha: uma linha só (ex: "Possui senha: Padrão Desenho" ou "Possui senha: Sim"); abaixo o desenho ou a senha
  const valorSenhaNum = os.senha_numerica || os.senha_aparelho || '';
  const ehPadraoDesenho = Boolean(os.padrao_desbloqueio || os.possui_senha_tipo === 'deslizar');
  const mostrarSenhaNum = os.possui_senha && !ehPadraoDesenho;
  const possuiSenhaTexto = !os.possui_senha ? 'Não' : ehPadraoDesenho ? 'Padrão Desenho' : 'Sim';
  let senhaHtml = `
    <div style="font-size: 10px; margin: 1px 0; padding: 2px; border: 1px solid #000;">
      <span class="bold">Possui senha: ${possuiSenhaTexto}</span>
      ${mostrarSenhaNum ? `<div style="font-size: 9px; margin-top: 2px;">Senha: ${valorSenhaNum || 'Informado'}</div>` : ''}
      ${ehPadraoDesenho && patternSvgHtml ? `<div style="margin-top: 2px;">${patternSvgHtml}</div>` : ''}
    </div>
  `;

  // Orçamento pré-autorizado (não mostrar valor quando "apenas orçamento")
  const apenasOrcamento = (os as any).apenas_orcamento === true;
  let orcamentoHtml = '';
  
  // Converter valores para número (tratando null, undefined, string)
  const valorDesconto = os.orcamento_desconto != null ? Number(os.orcamento_desconto) : 0;
  const valorParcelado = os.orcamento_parcelado != null ? Number(os.orcamento_parcelado) : 0;
  
  // Mostrar se houver valores de orçamento maiores que zero OU se estiver explicitamente autorizado (e não for apenas orçamento)
  const temOrcamento = valorDesconto > 0 || valorParcelado > 0;
  const deveMostrar = !apenasOrcamento && (temOrcamento || os.orcamento_autorizado === true);
  
  if (deveMostrar) {
    const valorPix = valorDesconto > 0 ? currencyFormatters.brl(valorDesconto) : null;
    const valorCartao = valorParcelado > 0 ? currencyFormatters.brl(valorParcelado) : null;
    if (valorPix || valorCartao) {
      orcamentoHtml = `
        <div style="font-size: 9px; margin: 0; padding: 2px; border: 1px solid #000; background: #f0f0f0;">
          <div class="bold">ORÇAMENTO PRÉ-AUTORIZADO</div>
          ${valorPix ? `<div style="padding-left: 4px;">PIX/Dinheiro: ${valorPix}</div>` : ''}
          ${valorCartao ? `<div style="padding-left: 4px;">Cartão (6x): ${valorCartao}</div>` : ''}
        </div>
      `;
    }
  }

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
            font-size: 11px !important;
            padding: 2mm 6mm 2mm 5mm !important;
            min-height: 297mm !important;
            transform: scale(1) !important;
            -webkit-transform: scale(1) !important;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          color: #000000 !important;
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
          line-height: 1.35;
          font-weight: 900;
          -webkit-font-smoothing: none !important;
          text-rendering: optimizeLegibility !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow: hidden;
          letter-spacing: 0.02em;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: 900 !important;
          color: #000000 !important;
        }
        .divider {
          border-top: 2px solid #000000 !important;
          margin: 2px 0;
        }
        .divider-dashed {
          border-top: 1px dashed #000000 !important;
          margin: 2px 0;
        }
        .line {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
          font-weight: 900 !important;
          font-size: 10px;
        }
        .label {
          font-weight: 900 !important;
          font-size: 9px;
        }
        .value {
          font-size: 9px;
          text-align: right;
        }
        .section-title {
          font-weight: 900 !important;
          font-size: 10px;
          margin: 2px 0 1px;
          text-decoration: underline;
        }
        .destaque-principal {
          font-weight: 900 !important;
          font-size: 13px;
          margin: 2px 0;
          text-decoration: none !important;
          letter-spacing: 0.03em;
        }
        .compact-line {
          font-size: 9px;
          margin: 0;
          line-height: 1.3;
        }
        .checklist-item {
          font-size: 9px;
          margin: 0 0 0 4px;
          padding-left: 4px;
        }
        .checklist-item::before {
          content: "✓ ";
          font-weight: 900;
        }
        img {
          filter: contrast(1.5) brightness(0.9);
          -webkit-filter: contrast(1.5) brightness(0.9);
        }
      </style>
    </head>
    <body>
      <div class="center" style="margin-bottom: 2px;">
        <div class="bold" style="font-size: 13px;">PRIME CAMP</div>
        <div style="font-size: 8px;">ASSISTÊNCIA TÉCNICA</div>
        <div style="font-size: 7px;">CNPJ: 31.833.574/0001-74</div>
        <div style="font-size: 7px;">Tel: (19) 98768-0453</div>
      </div>
      <div class="divider"></div>
      
      <div class="destaque-principal" style="text-align: center;">ORDEM DE SERVIÇO: #${os.numero}</div>
      <div class="compact-line">Data Entrada: ${dataEntrada}${horaEntrada ? ` - Hora: ${horaEntrada}` : ''}</div>
      <div class="compact-line">Previsão de entrega: ${previsaoEntrega}</div>
      <div class="divider"></div>
      
      <div class="section-title">DADOS DO CLIENTE</div>
      <div style="font-size: 11px; font-weight: 900; margin: 2px 0; line-height: 1.35;">Cliente: ${clienteNome}</div>
      <div style="font-size: 11px; font-weight: 900; margin: 2px 0; line-height: 1.35;">Contato: ${os.telefone_contato || '-'}</div>
      <div class="divider-dashed"></div>
      
      <div class="section-title">EQUIPAMENTO</div>
      <div class="compact-line">Aparelho: ${os.tipo_aparelho || '-'} - Marca: ${marcaNome || os.marca_nome || '-'}</div>
      <div class="destaque-principal" style="font-size: 11px;">Modelo: ${modeloNome || os.modelo_nome || '-'}${corAparelho ? ` - Cor: ${corAparelho}` : ''}</div>
      ${os.imei ? `<div class="compact-line">IMEI: ${os.imei}</div>` : ''}
      ${os.numero_serie ? `<div class="compact-line">Série: ${os.numero_serie}</div>` : ''}
      <div class="divider-dashed"></div>
      
      <div class="section-title">PROBLEMA INFORMADO</div>
      <div class="compact-line" style="padding: 1px; border: 1px solid #000;">${os.descricao_problema || '-'}</div>
      <div class="divider-dashed"></div>
      
      ${(os.condicoes_equipamento && String(os.condicoes_equipamento).trim()) ? `
      <div class="section-title">CONDIÇÕES DO EQUIPAMENTO</div>
      <div class="compact-line" style="padding: 1px; border: 1px solid #000;">${os.condicoes_equipamento}</div>
      <div class="divider-dashed"></div>
      ` : ''}
      
      ${senhaHtml}
      <div class="divider-dashed"></div>
      
      ${imagemReferenciaHtml}
      ${imagemReferenciaHtml ? '<div class="divider-dashed"></div>' : ''}
      
      ${omitirChecklist ? '' : `
      <div class="section-title">CHECKLIST DE ENTRADA</div>
      <div class="bold" style="font-size: 9px;">Problemas Encontrados:</div>
      ${checklistFisico ? checklistFisico.split(', ').map(item => `<div class="checklist-item">${item}</div>`).join('') : '<div class="compact-line">Nenhum problema encontrado</div>'}
      ${os.observacoes_checklist ? `<div style="font-size: 9px; margin-top: 2px;"><span class="bold">Observações:</span> ${os.observacoes_checklist}</div>` : ''}
      ${orcamentoHtml ? '' : '<div class="divider-dashed"></div>'}
      `}
      
      ${apenasOrcamento ? '<div class="compact-line">Realizar Orçamento</div>' : ''}
      
      ${orcamentoHtml || ''}
      
      ${qrCodeImg}
      <div class="center" style="font-size: 10px; margin-top: 2px; font-weight: 900;">Aponte a câmera para acompanhar o status da OS</div>
      <div class="divider-dashed"></div>
      
      <div class="section-title">CONDIÇÕES DE SERVIÇO</div>
      <div style="text-align: left; font-size: 9px; line-height: 1.3;">
        • Garantia de 90 dias em peças usadas<br/>
        • Não trocamos peças danificadas por mal uso<br/>
        • Guarde este comprovante<br/>
        • Aparelhos não retirados em 30 dias terão despesas de armazenamento de 6% ao mês.<br/>
        • Aparelhos não retirados em 90 dias serão descartados
      </div>
      <div class="divider"></div>
      
      <div class="center" style="font-size: 9px;">
        <div class="bold">${via === 'cliente' ? 'VIA DO CLIENTE' : 'VIA DA LOJA'}</div>
        <div style="font-size: 7px; margin-top: 1px;">${new Date().toLocaleString('pt-BR')}</div>
      </div>
    </body>
    </html>
  `;

  return html;
}

