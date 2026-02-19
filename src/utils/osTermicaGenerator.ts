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

  // Dados formatados
  const dataEntrada = dateFormatters.short(os.data_entrada);
  const horaEntrada = os.hora_entrada || '-';
  const previsaoEntrega = os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : '-';
  const valorTotal = os.valor_total ? currencyFormatters.brl(os.valor_total) : '-';

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

  // Figura do padrão de desenho (senha) — só o desenho na impressão, sem código numérico
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
      if (a && b) lines.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#000" stroke-width="2" />`);
    }
    const circles = ['0','1','2','3','4','5','6','7','8'].map(k => {
      const [x, y] = points[k];
      const active = seq.includes(k);
      return `<circle cx="${x}" cy="${y}" r="5" fill="${active ? '#000' : '#fff'}" stroke="#000" stroke-width="1.5" />`;
    }).join('');
    return `<div style="margin: 4px 0; text-align: center;"><svg width="80" height="80" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;"><rect x="5" y="5" width="90" height="90" rx="6" fill="#fff" stroke="#000" stroke-width="2"/>${lines.join('')}${circles}</svg></div>`;
  };
  const patternSvgHtml = patternToSvg(os.padrao_desbloqueio);

  // Possui senha: Sim/Não; senha numérica só se não for desenho; padrão desenho = só o desenho (sem código na impressão)
  const possuiSenhaLabel = os.possui_senha ? 'Sim' : 'Não';
  const valorSenhaNum = os.senha_numerica || os.senha_aparelho || '';
  const ehPadraoDesenho = Boolean(os.padrao_desbloqueio || os.possui_senha_tipo === 'deslizar');
  const mostrarSenhaNum = os.possui_senha && !ehPadraoDesenho;
  let senhaHtml = `
    <div style="font-size: 10px; margin: 2px 0; padding: 3px; border: 1px solid #000;">
      <div class="bold">Possui senha:</div>
      <div style="padding-left: 4px;">${possuiSenhaLabel}</div>
      ${mostrarSenhaNum ? `<div style="padding-left: 4px; font-size: 9px; margin-top: 2px;">Senha: ${valorSenhaNum || 'Informado'}</div>` : ''}
      ${ehPadraoDesenho && patternSvgHtml ? `<div style="margin-top: 4px;">Padrão (desenho):</div><div style="margin-top: 2px;">${patternSvgHtml}</div>` : ''}
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
        <div style="font-size: 9px; margin: 2px 0; padding: 2px; border: 1px solid #000; background: #f0f0f0;">
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
          margin: 4px 0;
        }
        .divider-dashed {
          border-top: 1px dashed #000000 !important;
          margin: 3px 0;
        }
        .line {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
          font-weight: 900 !important;
          font-size: 11px;
        }
        .label {
          font-weight: 900 !important;
          font-size: 10px;
        }
        .value {
          font-size: 11px;
          text-align: right;
        }
        .section-title {
          font-weight: 900 !important;
          font-size: 12px;
          margin: 4px 0 2px;
          text-decoration: underline;
        }
        .checklist-item {
          font-size: 10px;
          margin: 2px 0;
          padding-left: 8px;
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
      <div class="center" style="margin-bottom: 4px;">
        <div class="bold" style="font-size: 14px;">PRIME CAMP</div>
        <div style="font-size: 9px;">ASSISTÊNCIA TÉCNICA</div>
        <div style="font-size: 8px;">CNPJ: 31.833.574/0001-74</div>
        <div style="font-size: 8px;">Tel: (19) 98768-0453</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="center" style="margin: 4px 0;">
        <div class="bold" style="font-size: 13px;">ORDEM DE SERVIÇO</div>
        <div class="bold" style="font-size: 16px;">#${os.numero}</div>
        <div style="font-size: 9px; margin-top: 2px;">${via === 'cliente' ? 'VIA DO CLIENTE' : 'VIA DA LOJA'}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section-title">DADOS DO CLIENTE</div>
      <div class="line">
        <span class="label">Cliente:</span>
        <span class="value">${clienteNome}</span>
      </div>
      <div class="line">
        <span class="label">Contato:</span>
        <span class="value">${os.telefone_contato || '-'}</span>
      </div>
      
      <div class="divider-dashed"></div>
      
      <div class="section-title">EQUIPAMENTO</div>
      <div class="line">
        <span class="label">Aparelho:</span>
        <span class="value">${os.tipo_aparelho || '-'}</span>
      </div>
      <div class="line">
        <span class="label">Marca:</span>
        <span class="value">${marcaNome || os.marca_nome || '-'}</span>
      </div>
      <div class="line">
        <span class="label">Modelo:</span>
        <span class="value">${modeloNome || os.modelo_nome || '-'}</span>
      </div>
      ${os.imei ? `<div class="line"><span class="label">IMEI:</span><span class="value">${os.imei}</span></div>` : ''}
      ${os.numero_serie ? `<div class="line"><span class="label">Série:</span><span class="value">${os.numero_serie}</span></div>` : ''}
      
      <div class="divider-dashed"></div>
      
      <div class="section-title">PROBLEMA INFORMADO</div>
      <div style="font-size: 9px; margin: 2px 0; padding: 2px; border: 1px solid #000;">
        ${os.descricao_problema || '-'}
      </div>
      
      ${(os.condicoes_equipamento && String(os.condicoes_equipamento).trim()) ? `
      <div class="divider-dashed"></div>
      <div class="section-title">CONDIÇÕES DO EQUIPAMENTO</div>
      <div style="font-size: 9px; margin: 2px 0; padding: 2px; border: 1px solid #000;">
        ${os.condicoes_equipamento}
      </div>
      ` : ''}
      
      <div class="divider-dashed"></div>
      
      ${senhaHtml}
      
      ${imagemReferenciaHtml}
      
      ${omitirChecklist ? '' : `
      <div class="section-title">CHECKLIST DE ENTRADA</div>
      
      ${checklistFisico ? `
        <div style="font-size: 10px; margin: 3px 0;">
          <div class="bold">Problemas Encontrados:</div>
          <div style="padding-left: 4px; font-size: 10px;">
            ${checklistFisico.split(', ').map(item => `<div class="checklist-item">${item}</div>`).join('')}
          </div>
        </div>
      ` : '<div style="font-size: 10px; margin: 3px 0;">Nenhum problema encontrado</div>'}
      
      ${os.observacoes_checklist ? `
        <div style="font-size: 10px; margin: 3px 0; padding: 3px; border: 1px solid #000;">
          <div class="bold">Observações:</div>
          ${os.observacoes_checklist}
        </div>
      ` : ''}
      `}
      
      <div class="divider-dashed"></div>
      
      <div class="section-title">INFORMAÇÕES</div>
      <div class="line">
        <span class="label">Data Entrada:</span>
        <span class="value">${dataEntrada}</span>
      </div>
      <div class="line">
        <span class="label">Hora:</span>
        <span class="value">${horaEntrada}</span>
      </div>
      <div class="line">
        <span class="label">Previsão:</span>
        <span class="value">${previsaoEntrega}</span>
      </div>
      ${(os.valor_total && !apenasOrcamento) ? `
        <div class="line">
          <span class="label">Valor Total:</span>
          <span class="value">${valorTotal}</span>
        </div>
      ` : ''}
      ${apenasOrcamento ? '<div class="line"><span class="label">Realizar Orçamento</span><span class="value">-</span></div>' : ''}
      
      ${orcamentoHtml ? `
        <div class="divider-dashed"></div>
        ${orcamentoHtml}
      ` : ''}
      
      <div class="divider"></div>
      
      ${qrCodeImg}
      
      <div class="center" style="margin-top: 8px; font-size: 8px;">
        <div class="bold">CONDIÇÕES DE SERVIÇO</div>
        <div style="text-align: left; margin-top: 2px; font-size: 7px;">
          • Garantia de 90 dias em peças usadas<br/>
          • Não trocamos peças danificadas por mal uso<br/>
          • Guarde este comprovante<br/>
          • Aparelhos não retirados em 30 dias terão despesas de armazenamento<br/>
          • Aparelhos não retirados em 90 dias serão descartados
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="center" style="margin-top: 4px; font-size: 9px;">
        <div>${via === 'cliente' ? 'VIA DO CLIENTE' : 'VIA DA LOJA'}</div>
        <div style="font-size: 7px; margin-top: 2px;">${new Date().toLocaleString('pt-BR')}</div>
      </div>
    </body>
    </html>
  `;

  return html;
}

