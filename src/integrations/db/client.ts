/**
 * Cliente de Banco de Dados - PostgreSQL via API REST
 * 
 * Este arquivo é o ÚNICO ponto de acesso ao banco de dados.
 * Todas as operações passam pela API em api.primecamp.cloud
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api';

// Validação de segurança
if (API_URL.includes('.supabase.co')) {
  throw new Error('CONFIGURAÇÃO INVÁLIDA: API_URL não pode apontar para Supabase');
}

console.log('[DB] ✅ Cliente PostgreSQL inicializado:', API_URL);

interface QueryOptions {
  select?: string | string[];
  where?: Record<string, any>;
  orderBy?: { field: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

class DatabaseClient {
  private tableName: string;
  private options: QueryOptions = {};

  constructor(tableName: string) {
    this.tableName = tableName;
    this.options = {};
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  select(fields: string | string[]) {
    this.options.select = fields;
    return this;
  }

  eq(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[field] = value;
    return this;
  }

  neq(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__neq`] = value;
    return this;
  }

  gt(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__gt`] = value;
    return this;
  }

  gte(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__gte`] = value;
    return this;
  }

  lt(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__lt`] = value;
    return this;
  }

  lte(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__lte`] = value;
    return this;
  }

  like(field: string, value: string) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__like`] = value;
    return this;
  }

  ilike(field: string, value: string) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__ilike`] = value;
    return this;
  }

  in(field: string, values: any[]) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__in`] = values;
    return this;
  }

  or(conditions: string) {
    if (!this.options.where) this.options.where = {};
    this.options.where['__or'] = conditions;
    return this;
  }

  not(field: string, operator: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__not__${operator}`] = value;
    return this;
  }

  is(field: string, value: any) {
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__is`] = value;
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.options.orderBy = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.options.limit = count;
    return this;
  }

  range(from: number, to: number) {
    this.options.offset = from;
    this.options.limit = to - from + 1;
    return this;
  }

  async execute(): Promise<{ data: any[] | null; error: any | null; count?: number }> {
    try {
      const response = await fetch(`${API_URL}/query/${this.tableName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(this.options),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro de conexão' }));
        console.error(`[DB] Erro ao consultar ${this.tableName}:`, error);
        return { data: null, error };
      }

      const result = await response.json();
      return { 
        data: result.rows || result.data || [], 
        error: null,
        count: result.count 
      };
    } catch (error: any) {
      console.error(`[DB] Erro de rede ao consultar ${this.tableName}:`, error);
      return { data: null, error: { message: error.message || 'Erro de conexão' } };
    }
  }

  async single(): Promise<{ data: any | null; error: any | null }> {
    this.options.limit = 1;
    const result = await this.execute();
    if (result.error) return result;
    
    if (!result.data || result.data.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'Registro não encontrado' } };
    }
    return { data: result.data[0], error: null };
  }

  async maybeSingle(): Promise<{ data: any | null; error: any | null }> {
    this.options.limit = 1;
    const result = await this.execute();
    if (result.error) return result;
    return { data: result.data?.[0] || null, error: null };
  }

  async insert(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const response = await fetch(`${API_URL}/insert/${this.tableName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao inserir' }));
        return { data: null, error };
      }

      const result = await response.json();
      return { data: result.data || result.rows?.[0] || result, error: null };
    } catch (error: any) {
      console.error(`[DB] Erro ao inserir em ${this.tableName}:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  async update(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const response = await fetch(`${API_URL}/update/${this.tableName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ data, where: this.options.where }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao atualizar' }));
        return { data: null, error };
      }

      const result = await response.json();
      const rows = result.data || result.rows || [];
      return { data: rows[0] || null, error: null };
    } catch (error: any) {
      console.error(`[DB] Erro ao atualizar ${this.tableName}:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  async upsert(data: any, options?: { onConflict?: string }): Promise<{ data: any | null; error: any | null }> {
    try {
      const response = await fetch(`${API_URL}/upsert/${this.tableName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ data, onConflict: options?.onConflict }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao upsert' }));
        return { data: null, error };
      }

      const result = await response.json();
      return { data: result.data || result, error: null };
    } catch (error: any) {
      console.error(`[DB] Erro ao upsert ${this.tableName}:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  async delete(): Promise<{ data: any | null; error: any | null }> {
    try {
      const response = await fetch(`${API_URL}/delete/${this.tableName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ where: this.options.where }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao deletar' }));
        return { data: null, error };
      }

      const result = await response.json();
      return { data: result.data || result, error: null };
    } catch (error: any) {
      console.error(`[DB] Erro ao deletar de ${this.tableName}:`, error);
      return { data: null, error: { message: error.message } };
    }
  }
}

/**
 * Função principal para acessar tabelas
 * Uso: from('tabela').select('*').eq('campo', valor).execute()
 */
export const from = (tableName: string): DatabaseClient => {
  return new DatabaseClient(tableName);
};

// Funções de compatibilidade (sempre retornam 'postgres')
export const getDbMode = () => 'postgres';
export const isPostgresMode = () => true;

// Exportações para compatibilidade com código legado (vão dar erro se usados)
export const supabase = null;
export const auth = null;
