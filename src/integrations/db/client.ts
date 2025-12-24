/**
 * Cliente unificado de banco de dados
 * 
 * FORÇA uso de PostgreSQL quando VITE_DB_MODE=postgres
 * Bloqueia acesso ao Supabase para dados (apenas auth permitido)
 */

import { from as postgresFrom } from '@/integrations/postgres/api-client';
import { supabase } from '@/integrations/supabase/client';

const DB_MODE = import.meta.env.VITE_DB_MODE || 'postgres'; // Padrão: PostgreSQL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Log para debug (sempre mostrar em produção também para garantir)
console.log('[DB Client] Configuração:', {
  DB_MODE,
  API_URL,
  usando: DB_MODE === 'postgres' ? 'PostgreSQL' : 'Supabase',
  FORÇADO: DB_MODE === 'postgres' ? 'PostgreSQL (Supabase BLOQUEADO)' : 'Supabase'
});

/**
 * Cliente compatível com a API do Supabase
 * FORÇA PostgreSQL se VITE_DB_MODE=postgres
 * BLOQUEIA Supabase para dados quando em modo PostgreSQL
 */
export const from = (tableName: string) => {
  if (DB_MODE === 'postgres') {
    console.log(`[DB Client] ✅ Usando PostgreSQL para tabela: ${tableName}`);
    return postgresFrom(tableName);
  }
  
  // Modo Supabase (apenas se explicitamente configurado)
  console.warn(`[DB Client] ⚠️ Usando Supabase para tabela: ${tableName} (modo legado)`);
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

