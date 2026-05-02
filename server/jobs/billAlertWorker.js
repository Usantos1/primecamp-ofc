/**
 * Worker periódico: envia alertas agendados de contas a pagar.
 * @param {import('pg').Pool} pool
 */
export async function runBillAlertTick(pool) {
  const service = await import('../services/billAlertService.js');
  return service.processDueBillAlerts(pool, 50);
}
