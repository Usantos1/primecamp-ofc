/**
 * Auto-teste rápido (sem banco): agendamento e template.
 * node server/scripts/os-followup-selftest.mjs
 */
import assert from 'assert';
import {
  renderFollowupTemplate,
  computeScheduledAt,
  FOLLOWUP_RULES,
  RANDOM_DELAY_MAX_SECONDS,
} from '../services/osPosVendaFollowupService.js';

assert.strictEqual(
  renderFollowupTemplate('Olá {cliente} OS {numero_os}', {
    cliente: 'Ana',
    numero_os: '99',
  }),
  'Olá Ana OS 99'
);

const base = new Date('2026-06-01T18:00:00.000Z');
const after = computeScheduledAt(base, FOLLOWUP_RULES.AFTER_24H, 'America/Sao_Paulo', 0);
assert.strictEqual(after.getTime() - base.getTime(), 24 * 60 * 60 * 1000);

const next10 = computeScheduledAt(base, FOLLOWUP_RULES.NEXT_DAY_10AM, 'America/Sao_Paulo', 0);
assert.ok(next10.getTime() > base.getTime());

assert.ok(RANDOM_DELAY_MAX_SECONDS >= 0 && RANDOM_DELAY_MAX_SECONDS <= 3600);

console.log('os-followup-selftest: OK');
