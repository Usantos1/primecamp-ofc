/**
 * Cliente unificado de banco de dados
 * 
 * 🚫 SUPABASE COMPLETAMENTE REMOVIDO 🚫
 * APENAS PostgreSQL é usado agora
 */

import { from as postgresFrom } from '@/integrations/postgres/api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Log para debug
console.log('[DB Client] ✅ Usando APENAS PostgreSQL (Supabase REMOVIDO)', {
  API_URL,
});

/**
 * Cliente compatível com a API do Supabase
 * SEMPRE usa PostgreSQL - Supabase foi REMOVIDO
 */
export const from = (tableName: string) => {
  console.log(`[DB Client] ✅ Usando PostgreSQL para tabela: ${tableName}`);
  return postgresFrom(tableName);
};

/**
 * 🚫 SUPABASE REMOVIDO - Não exportar mais
 * Se algum código tentar usar, vai dar erro
 */
export const supabase = null as any;

/**
 * 🚫 SUPABASE REMOVIDO - Use authAPI de @/integrations/auth/api-client
 */
export const auth = {
  signInWithPassword: () => {
    throw new Error('🚫 Supabase foi REMOVIDO. Use authAPI.login() de @/integrations/auth/api-client');
  },
  signUp: () => {
    throw new Error('🚫 Supabase foi REMOVIDO. Use authAPI.signup() de @/integrations/auth/api-client');
  },
  signOut: () => {
    throw new Error('🚫 Supabase foi REMOVIDO. Use authAPI.logout() de @/integrations/auth/api-client');
  },
  onAuthStateChange: () => {
    throw new Error('🚫 Supabase foi REMOVIDO. Use AuthContext para gerenciar estado');
  },
  getSession: () => {
    throw new Error('🚫 Supabase foi REMOVIDO. Use authAPI.getCurrentUser() de @/integrations/auth/api-client');
  },
};

/**
 * Sempre PostgreSQL agora
 */
export const getDbMode = () => 'postgres';
export const isPostgresMode = () => true;
export const isSupabaseMode = () => false;

