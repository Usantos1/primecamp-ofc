import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// 🧹 LIMPEZA FINAL DE TOKENS SUPABASE ANTES DE INICIAR A APLICAÇÃO
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('gogxicjaqpqbhsfzutij'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('[main.tsx] 🧹 Removido token Supabase:', key);
    });
    if (keysToRemove.length > 0) {
      console.log('[main.tsx] ✅ Limpeza final: removidos', keysToRemove.length, 'tokens do Supabase');
    }
  } catch (e) {
    console.warn('[main.tsx] Erro ao limpar tokens Supabase:', e);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
