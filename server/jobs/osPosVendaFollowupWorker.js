/**
 * Worker periódico: envia follow-ups pós-venda agendados.
 * @param {import('pg').Pool} pool
 */
export async function runOsPosVendaFollowupTick(pool) {
  const { processDueFollowups } = await import('../services/osPosVendaFollowupService.js');
  return processDueFollowups(pool, 30);
}
