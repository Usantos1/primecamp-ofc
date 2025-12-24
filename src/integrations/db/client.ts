/**
 * Cliente unificado de banco de dados
 * 
 * Permite alternar entre Supabase e PostgreSQL sem mudar o código do frontend.
 * Configure VITE_DB_MODE no .env para 'supabase' ou 'postgres'
 */

import { from as postgresFrom } from '@/integrations/postgres/api-client';
import { supabase } from '@/integrations/supabase/client';

const DB_MODE = import.meta.env.VITE_DB_MODE || 'supabase';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Log para debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('[DB Client] Configuração:', {
    DB_MODE,
    API_URL,
    usando: DB_MODE === 'postgres' ? 'PostgreSQL' : 'Supabase'
  });
}

/**
 * Cliente compatível com a API do Supabase
 * Usa PostgreSQL se VITE_DB_MODE=postgres, caso contrário usa Supabase
 */
export const from = (tableName: string) => {
  if (DB_MODE === 'postgres') {
    if (import.meta.env.DEV) {
      console.log(`[DB Client] Usando PostgreSQL para tabela: ${tableName}`);
    }
    return postgresFrom(tableName);
  }
  if (import.meta.env.DEV) {
    console.log(`[DB Client] Usando Supabase para tabela: ${tableName}`);
  }
  return supabase.from(tableName);
};

/**
 * Exporta o cliente de autenticação do Supabase
 * (Autenticação ainda usa Supabase por enquanto)
 */
export const auth = supabase.auth;

/**
 * Exporta o cliente completo do Supabase (para casos especiais)
 */
export { supabase };

/**
 * Verifica qual modo está sendo usado
 */
export const getDbMode = () => DB_MODE;

/**
 * Verifica se está usando PostgreSQL
 */
export const isPostgresMode = () => DB_MODE === 'postgres';

/**
 * Verifica se está usando Supabase
 */
export const isSupabaseMode = () => DB_MODE === 'supabase';

