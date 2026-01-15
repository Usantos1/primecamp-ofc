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
}

export async function generateOSTermica(data: OSTermicaData): Promise<string> {
  const { os, clienteNome, marcaNome, modeloNome, checklistEntrada, checklistEntradaMarcados, fotoEntradaUrl, imagemReferenciaUrl, areasDefeito, via } = data;

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

  // Formatar checklist de entrada
  const checklistFisico = checklistEntrada
    .filter(item => item.categoria === 'fisico' && checklistEntradaMarcados.includes(item.item_id))
    .map(item => item.nome)
    .join(', ');

  const checklistFuncional = checklistEntrada
    .filter(item => item.categoria === 'funcional' && checklistEntradaMarcados.includes(item.item_id))
    .map(item => item.nome)
    .join(', ');

  // Dados formatados
  const dataEntrada = dateFormatters.short(os.data_entrada);
  const horaEntrada = os.hora_entrada || '-';
  const previsaoEntrega = os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : '-';
  const valorTotal = os.valor_total ? currencyFormatters.brl(os.valor_total) : '-';

  // Foto de entrada (se houver)
  let fotoEntradaHtml = '';
  if (fotoEntradaUrl) {
    fotoEntradaHtml = `
      <div style="margin: 5px 0; text-align: center;">
        <img src="${fotoEntradaUrl}" style="max-width: 100%; max-height: 200px; object-fit: contain; border: 1px solid #000;" alt="Foto de Entrada" />
        <p style="font-size: 8px; margin-top: 2px;">Foto de Entrada</p>
      </div>
    `;
  }

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

  // Senha do aparelho
  let senhaHtml = '';
  if (os.possui_senha) {
    const senhaTipo = os.possui_senha_tipo || (os.padrao_desbloqueio ? 'Padrão' : 'Senha');
    const senhaValor = os.senha_aparelho || os.senha_numerica || os.padrao_desbloqueio || 'Sim';
    senhaHtml = `
      <div style="font-size: 9px; margin: 2px 0; padding: 2px; border: 1px solid #000;">
        <div class="bold">Senha do Aparelho:</div>
        <div style="padding-left: 4px;">${senhaTipo}: ${senhaValor}</div>
      </div>
    `;
  }

  // Orçamento pré-autorizado
  let orcamentoHtml = '';
  
  // Converter valores para número (tratando null, undefined, string)
  const valorDesconto = os.orcamento_desconto != null ? Number(os.orcamento_desconto) : 0;
  const valorParcelado = os.orcamento_parcelado != null ? Number(os.orcamento_parcelado) : 0;
  
  // Mostrar se houver valores de orçamento maiores que zero OU se estiver explicitamente autorizado
  const temOrcamento = valorDesconto > 0 || valorParcelado > 0;
  const deveMostrar = temOrcamento || os.orcamento_autorizado === true;
  
  console.log('[generateOSTermica] Verificando orçamento:', {
    orcamento_autorizado: os.orcamento_autorizado,
    orcamento_desconto: os.orcamento_desconto,
    orcamento_parcelado: os.orcamento_parcelado,
    valorDesconto,
    valorParcelado,
    temOrcamento,
    deveMostrar,
    osId: os.id
  });
  
  if (deveMostrar) {
    const valorPix = valorDesconto > 0 ? currencyFormatters.brl(valorDesconto) : null;
    const valorCartao = valorParcelado > 0 ? currencyFormatters.brl(valorParcelado) : null;
    
    console.log('[generateOSTermica] Valores formatados:', { valorPix, valorCartao });
    
    if (valorPix || valorCartao) {
      orcamentoHtml = `
        <div style="font-size: 9px; margin: 2px 0; padding: 2px; border: 1px solid #000; background: #f0f0f0;">
          <div class="bold">ORÇAMENTO PRÉ-AUTORIZADO</div>
          ${valorPix ? `<div style="padding-left: 4px;">PIX/Dinheiro: ${valorPix}</div>` : ''}
          ${valorCartao ? `<div style="padding-left: 4px;">Cartão (6x): ${valorCartao}</div>` : ''}
        </div>
      `;
      console.log('[generateOSTermica] Orçamento HTML gerado:', orcamentoHtml.substring(0, 150));
    } else {
      console.log('[generateOSTermica] Orçamento não gerado: nenhum valor válido');
    }
  } else {
    console.log('[generateOSTermica] Orçamento não deve ser mostrado');
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
          font-size: 11px;
          color: #000000 !important;
          background: #ffffff;
          line-height: 1.3;
          font-weight: 900;
          -webkit-font-smoothing: none !important;
          text-rendering: optimizeLegibility !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow: hidden;
          letter-spacing: 0.1px;
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
          font-size: 10px;
        }
        .label {
          font-weight: 900 !important;
          font-size: 9px;
        }
        .value {
          font-size: 10px;
          text-align: right;
        }
        .section-title {
          font-weight: 900 !important;
          font-size: 11px;
          margin: 4px 0 2px;
          text-decoration: underline;
        }
        .checklist-item {
          font-size: 9px;
          margin: 1px 0;
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
      
      <div class="divider-dashed"></div>
      
      ${senhaHtml}
      
      ${imagemReferenciaHtml}
      
      ${fotoEntradaHtml}
      
      <div class="section-title">CHECKLIST DE ENTRADA</div>
      
      ${checklistFisico ? `
        <div style="font-size: 9px; margin: 2px 0;">
          <div class="bold">Problemas Encontrados:</div>
          <div style="padding-left: 4px; font-size: 8px;">
            ${checklistFisico.split(', ').map(item => `<div class="checklist-item">${item}</div>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${checklistFuncional ? `
        <div style="font-size: 9px; margin: 2px 0;">
          <div class="bold">Funcional OK:</div>
          <div style="padding-left: 4px; font-size: 8px;">
            ${checklistFuncional.split(', ').map(item => `<div class="checklist-item">${item}</div>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${os.observacoes_checklist ? `
        <div style="font-size: 8px; margin: 2px 0; padding: 2px; border: 1px solid #000;">
          <div class="bold">Observações:</div>
          ${os.observacoes_checklist}
        </div>
      ` : ''}
      
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
      ${os.valor_total ? `
        <div class="line">
          <span class="label">Valor Total:</span>
          <span class="value">${valorTotal}</span>
        </div>
      ` : ''}
      
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

