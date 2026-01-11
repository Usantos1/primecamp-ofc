// ============================================
// UTILITÁRIOS DE IMPRESSÃO
// ============================================

import { from } from '@/integrations/db/client';

/**
 * Atualiza campos de impressão no banco de dados após impressão
 */
export async function updatePrintStatus(
  table: 'sales' | 'ordens_servico',
  recordId: string,
  success: boolean
): Promise<void> {
  try {
    const printStatus = success ? 'SUCCESS' : 'ERROR';
    const now = new Date().toISOString();

    if (table === 'sales') {
      // Buscar tentativas atuais
      const { data: current } = await from('sales')
        .select('print_attempts')
        .eq('id', recordId)
        .single();

      const attempts = (current?.print_attempts || 0) + 1;

      await from('sales')
        .update({
          print_status: printStatus,
          print_attempts: attempts,
          ...(success ? { printed_at: now } : {}),
        })
        .eq('id', recordId);
    } else if (table === 'ordens_servico') {
      // Buscar tentativas atuais
      const { data: current } = await from('ordens_servico')
        .select('print_attempts')
        .eq('id', recordId)
        .single();

      const attempts = (current?.print_attempts || 0) + 1;

      await from('ordens_servico')
        .update({
          print_status: printStatus,
          print_attempts: attempts,
          ...(success ? { printed_at: now } : {}),
        })
        .eq('id', recordId);
    }
  } catch (error) {
    console.error(`Erro ao atualizar status de impressão para ${table}:`, error);
    // Não falhar se a atualização do status falhar
  }
}

/**
 * Imprime HTML usando iframe (sem abrir nova janela)
 */
export function printViaIframe(html: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (!printDoc) {
        reject(new Error('Não foi possível acessar o documento do iframe'));
        return;
      }

      printDoc.open();
      printDoc.write(html);
      printDoc.close();

      // Aguardar carregamento e imprimir
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          console.log('[IMPRESSÃO] Comando de impressão enviado via iframe');

          // Remover iframe após impressão
          setTimeout(() => {
            try {
              if (printFrame.parentNode) {
                document.body.removeChild(printFrame);
              }
            } catch (e) {
              console.error('Erro ao remover iframe:', e);
            }
            resolve();
          }, 2000);
        } catch (e) {
          console.error('Erro ao imprimir:', e);
          // Remover iframe mesmo em caso de erro
          try {
            if (printFrame.parentNode) {
              document.body.removeChild(printFrame);
            }
          } catch (removeError) {
            console.error('Erro ao remover iframe após erro:', removeError);
          }
          reject(e);
        }
      }, 1000); // Delay para garantir que HTML está totalmente carregado
    } catch (error) {
      reject(error);
    }
  });
}
