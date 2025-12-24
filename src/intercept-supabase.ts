// 🚫🚫🚫 INTERCEPTAÇÃO SUPABASE - DEVE SER O PRIMEIRO ARQUIVO EXECUTADO 🚫🚫🚫
// Este arquivo DEVE ser importado ANTES de qualquer outro código

// Interceptar fetch ANTES de qualquer coisa
const originalFetch = window.fetch;
(window as any).fetch = function(...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
  
  // Bloquear TODAS as requisições para Supabase Auth
  if (url && typeof url === 'string' && url.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 REQUISIÇÃO SUPABASE AUTH BLOQUEADA via fetch:', url);
    console.trace('Stack trace da requisição bloqueada:');
    return Promise.reject(new Error('Supabase Auth foi desabilitado. Use authAPI.login()'));
  }
  
  return originalFetch.apply(this, args);
};

// Interceptar XMLHttpRequest ANTES de qualquer coisa
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Salvar URL para verificar no send
  (this as any)._url = urlString;
  
  if (urlString.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 REQUISIÇÃO SUPABASE AUTH BLOQUEADA via XMLHttpRequest.open:', urlString);
    console.trace('Stack trace da requisição bloqueada:');
    throw new Error('Supabase Auth foi desabilitado. Use authAPI.login()');
  }
  
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args: any[]) {
  const url = (this as any)._url || '';
  if (url && url.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 REQUISIÇÃO SUPABASE AUTH BLOQUEADA via XMLHttpRequest.send:', url);
    console.trace('Stack trace da requisição bloqueada:');
    return;
  }
  return originalXHRSend.apply(this, args);
};

console.log('🚫 Interceptação Supabase Auth ATIVADA');

