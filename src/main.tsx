import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// 🚫 BLOQUEAR SUPABASE AUTH ANTES DE QUALQUER COISA
// Interceptar fetch para bloquear requisições Supabase Auth
const originalFetch = window.fetch;
window.fetch = function(...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  
  // Bloquear TODAS as requisições para Supabase Auth
  if (url && typeof url === 'string' && url.includes('supabase.co/auth/v1/token')) {
    console.warn('🚫 Requisição Supabase Auth BLOQUEADA:', url);
    return Promise.reject(new Error('Supabase Auth foi desabilitado. Use authAPI.login()'));
  }
  
  return originalFetch.apply(this, args);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
