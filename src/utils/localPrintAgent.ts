import type { CupomConfig } from '@/hooks/useCupomConfig';

export const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:3333';

type PrintAgentOptions = {
  copies?: number;
  jobName?: string;
  source?: string;
};

function getAgentUrl(config?: Pick<CupomConfig, 'print_agent_url'> | null) {
  return (config?.print_agent_url || DEFAULT_PRINT_AGENT_URL).replace(/\/+$/, '');
}

export function isPrintAgentEnabled(config?: Pick<CupomConfig, 'usar_print_agent'> | null) {
  return config?.usar_print_agent === true;
}

export async function checkPrintAgent(config?: Pick<CupomConfig, 'print_agent_url'> | null) {
  const response = await fetch(`${getAgentUrl(config)}/health`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Agente respondeu ${response.status}`);
  return response.json();
}

export async function testPrintAgent(config?: Pick<CupomConfig, 'print_agent_url' | 'impressora_padrao'> | null) {
  const response = await fetch(`${getAgentUrl(config)}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerName: config?.impressora_padrao || undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Agente respondeu ${response.status}`);
  }
}

export async function printHtmlViaAgent(
  htmlOrText: string,
  config?: Pick<CupomConfig, 'usar_print_agent' | 'print_agent_url' | 'impressora_padrao'> | null,
  options: PrintAgentOptions = {}
) {
  if (!isPrintAgentEnabled(config)) return false;

  const response = await fetch(`${getAgentUrl(config)}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: options.source?.includes('text') ? undefined : htmlOrText,
      text: options.source?.includes('text') ? htmlOrText : undefined,
      printerName: config?.impressora_padrao || undefined,
      copies: options.copies || 1,
      jobName: options.jobName || 'AtivaFIX',
      source: options.source || 'ativafix-web',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Agente respondeu ${response.status}`);
  }

  return true;
}
