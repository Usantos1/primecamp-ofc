/**
 * Worker periódico: sincroniza e envia mensagens de aniversário agendadas.
 * @param {import('pg').Pool} pool
 */
export async function runBirthdayMessageTick(pool) {
  const service = await import('../services/birthdayMessageService.js');
  const sync = await service.syncBirthdayJobs(pool);
  const process = await service.processDueBirthdayMessages(pool, 30);
  return { sync, process };
}
