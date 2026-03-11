/**
 * URL base da API. Em produção:
 * - Se o site for acessado por ativafix.com ou www.ativafix.com → https://api.ativafix.com/api
 * - Caso contrário → https://api.primecamp.cloud/api
 * Permite um único build servir os dois domínios.
 */
export function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL && !String(import.meta.env.VITE_API_URL).includes('localhost')) {
    const url = String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
    return url.endsWith('/api') ? url : url + '/api';
  }
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'ativafix.com' || h === 'www.ativafix.com') return 'https://api.ativafix.com/api';
  }
  return 'https://api.primecamp.cloud/api';
}
