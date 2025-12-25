// 🚫🚫🚫 SUPABASE COMPLETAMENTE REMOVIDO 🚫🚫🚫
// Este arquivo existe apenas para evitar erros de importação
// NENHUM código deve usar Supabase mais - Use PostgreSQL via @/integrations/db/client

// NÃO IMPORTAR NADA DO SUPABASE - isso inclui código no build!
// import type { Database } from './types'; // REMOVIDO
// import { useAuth } from '@/contexts/AuthContext'; // REMOVIDO

export const SUPABASE_URL = "";
export const SUPABASE_PUBLISHABLE_KEY = "";

// Mock que lança erro se tentar usar
const throwError = (method: string) => {
  throw new Error(`🚫 Supabase foi REMOVIDO. Não use mais ${method}. Use PostgreSQL via @/integrations/db/client`);
};

const createMockClient = () => {
  return {
    auth: {
      signInWithPassword: () => throwError('supabase.auth.signInWithPassword()'),
      signUp: () => throwError('supabase.auth.signUp()'),
      signOut: () => throwError('supabase.auth.signOut()'),
      onAuthStateChange: () => throwError('supabase.auth.onAuthStateChange()'),
      getSession: () => throwError('supabase.auth.getSession()'),
      getUser: () => throwError('supabase.auth.getUser()'),
    },
    from: () => {
      throwError('supabase.from()');
      return {} as any;
    },
    channel: () => {
      throwError('supabase.channel()');
      return {} as any;
    },
    storage: {
      from: () => {
        throwError('supabase.storage.from()');
        return {} as any;
      },
    },
    functions: {
      invoke: () => {
        throwError('supabase.functions.invoke()');
        return Promise.reject(new Error('Supabase removido'));
      },
    },
  } as any;
};

// Mock que lança erro se tentar usar
export const supabase = createMockClient();

// Mock que lança erro
export const createSupabaseClientWithHeaders = () => {
  throw new Error('🚫 Supabase foi REMOVIDO. Use PostgreSQL via @/integrations/db/client');
};

// Tipo vazio para evitar erros de TypeScript (sem importar do Supabase)
export type Database = any;