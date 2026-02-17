// ============================================
// UTILITÁRIOS DE IMPRESSÃO DE OS
// ============================================

import { generateOSTermica } from './osTermicaGenerator';
import { printViaIframe, updatePrintStatus } from './printUtils';

/**
 * Imprime OS térmica em 2 vias (cliente + loja) usando iframe (sem abrir nova janela)
 */
export async function printOSTermicaDirect(
  os: any,
  cliente: any,
  marca: any,
  modelo: any,
  checklistEntradaConfig: any[],
  osImageReferenceUrl?: string | null
): Promise<void> {
  try {
    // Buscar primeira foto de entrada
    const fotoEntrada = os.fotos_telegram_entrada?.[0];
    const fotoEntradaUrl = fotoEntrada 
      ? (typeof fotoEntrada === 'string' ? fotoEntrada : (fotoEntrada.url || fotoEntrada.thumbnailUrl))
      : undefined;

    const imagemReferenciaUrl = osImageReferenceUrl || null;
    const areasDefeito = os.areas_defeito || [];
    
    // Parse checklist entrada
    const checklistEntradaMarcados = Array.isArray(os.checklist_entrada) 
      ? os.checklist_entrada 
      : (typeof os.checklist_entrada === 'string' ? JSON.parse(os.checklist_entrada || '[]') : []);

    // Gerar via do cliente (com checklist nas duas vias)
    const htmlCliente = await generateOSTermica({
      os,
      clienteNome: cliente?.nome || os.cliente_nome || 'Cliente',
      marcaNome: marca?.nome || os.marca_nome,
      modeloNome: modelo?.nome || os.modelo_nome,
      checklistEntrada: checklistEntradaConfig,
      checklistEntradaMarcados,
      fotoEntradaUrl,
      imagemReferenciaUrl,
      areasDefeito,
      via: 'cliente',
      omitirChecklist: false,
    });

    // Gerar via da loja (com checklist nas duas vias)
    const htmlLoja = await generateOSTermica({
      os,
      clienteNome: cliente?.nome || os.cliente_nome || 'Cliente',
      marcaNome: marca?.nome || os.marca_nome,
      modeloNome: modelo?.nome || os.modelo_nome,
      checklistEntrada: checklistEntradaConfig,
      checklistEntradaMarcados,
      fotoEntradaUrl,
      imagemReferenciaUrl,
      areasDefeito,
      via: 'loja',
      omitirChecklist: false,
    });

    // Imprimir primeira via (cliente)
    console.log('[IMPRESSÃO OS] Iniciando impressão da primeira via (cliente)');
    await printViaIframe(htmlCliente);
    console.log('[IMPRESSÃO OS] Primeira via impressa');

    // Aguardar 3 segundos antes de imprimir segunda via
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Imprimir segunda via (loja)
    console.log('[IMPRESSÃO OS] Iniciando impressão da segunda via (loja)');
    await printViaIframe(htmlLoja);
    console.log('[IMPRESSÃO OS] Segunda via impressa com sucesso');

    // Atualizar campos de impressão no banco (sucesso)
    await updatePrintStatus('ordens_servico', os.id, true);
  } catch (error) {
    console.error('[IMPRESSÃO OS] Erro ao imprimir:', error);
    // Atualizar campos de impressão no banco (erro)
    if (os?.id) {
      await updatePrintStatus('ordens_servico', os.id, false).catch(() => {});
    }
    throw error;
  }
}
