// 🚫 BLOQUEAR SUPABASE AUTH ANTES DE QUALQUER COISA
// Interceptar fetch E XMLHttpRequest para bloquear requisições Supabase Auth

// Interceptar fetch
const originalFetch = window.fetch;
window.fetch = function(...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  
  // Bloquear TODAS as requisições para Supabase Auth
  if (url && typeof url === 'string' && url.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 Requisição Supabase Auth BLOQUEADA via fetch:', url);
    return Promise.reject(new Error('Supabase Auth foi desabilitado. Use authAPI.login()'));
  }
  
  return originalFetch.apply(this, args);
};

// Interceptar XMLHttpRequest (Supabase pode usar isso também)
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  if (urlString.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 Requisição Supabase Auth BLOQUEADA via XMLHttpRequest:', urlString);
    throw new Error('Supabase Auth foi desabilitado. Use authAPI.login()');
  }
  
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args: any[]) {
  const url = (this as any)._url || '';
  if (url.includes('supabase.co/auth/v1/token')) {
    console.error('🚫🚫🚫 Requisição Supabase Auth BLOQUEADA no send:', url);
    return;
  }
  return originalXHRSend.apply(this, args);
};

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
