/**
 * Cliente PostgreSQL para uso no frontend via API REST
 * 
 * Este cliente faz requisições HTTP para uma API backend que se conecta ao PostgreSQL.
 * Não tenta conectar diretamente ao PostgreSQL do navegador (não é possível por segurança).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Verificar se estamos em modo desenvolvimento ou produção
const isDevelopment = import.meta.env.DEV;
const defaultPort = isDevelopment ? 3000 : (import.meta.env.VITE_API_PORT || 3000);
const defaultHost = isDevelopment ? 'localhost' : (import.meta.env.VITE_API_HOST || 'localhost');
const protocol = import.meta.env.VITE_API_PROTOCOL || 'http';

const finalApiUrl = import.meta.env.VITE_API_URL || `${protocol}://${defaultHost}:${defaultPort}/api`;

interface QueryOptions {
  select?: string | string[];
  where?: Record<string, any>;
  orderBy?: { field: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

class PostgresAPIClient {
  private tableName: string;
  private options: QueryOptions = {};

  constructor(tableName: string) {
    this.tableName = tableName;
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
    // Formato: "campo1.ilike.%valor%,campo2.eq.valor"
    if (!this.options.where) this.options.where = {};
    this.options.where['__or'] = conditions;
    return this;
  }

  not(field: string, operator: string, value: any) {
    // Exemplo: .not('grupo', 'is', null)
    if (!this.options.where) this.options.where = {};
    this.options.where[`${field}__not__${operator}`] = value;
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

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Obter token de autenticação do localStorage (Supabase)
    const session = localStorage.getItem('sb-gogxicjaqpqbhsfzutij-auth-token');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const token = parsed?.access_token || parsed?.accessToken;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        // Ignorar erro de parse
      }
    }
    
    return headers;
  }

  async execute(): Promise<{ data: any[] | null; error: any | null; count?: number }> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || `http://localhost:3000/api`;
      const response = await fetch(`${apiUrl}/query/${this.tableName}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(this.options),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const result = await response.json();
      // A API retorna { rows: [...], count: N }
      return { 
        data: result.rows || result.data || [], 
        error: null,
        count: result.count 
      };
    } catch (error) {
      console.error('Erro ao executar query:', error);
      return { data: null, error };
    }
  }

  async single(): Promise<{ data: any | null; error: any | null }> {
    this.options.limit = 1;
    const result = await this.execute();
    if (result.error) {
      return result;
    }
    return {
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      error: result.data && result.data.length === 0 ? { code: 'PGRST116', message: 'No rows returned' } : null,
    };
  }

  async update(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || `http://localhost:3000/api`;
      const response = await fetch(`${apiUrl}/update/${this.tableName}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          data,
          where: this.options.where,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const result = await response.json();
      // O servidor retorna { data: result.rows, rows: result.rows, count: result.rowCount }
      // Se for array com 1 item, retornar o item; se for array vazio, retornar null
      const rows = result.data || result.rows || [];
      return { data: rows.length > 0 ? rows[0] : null, error: null };
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      return { data: null, error };
    }
  }

  async insert(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || `http://localhost:3000/api`;
      const response = await fetch(`${apiUrl}/insert/${this.tableName}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data), // Enviar dados diretamente, não dentro de { data }
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const result = await response.json();
      // O servidor retorna { data: result.rows[0], rows: result.rows }
      return { data: result.data || result.rows?.[0] || result, error: null };
    } catch (error) {
      console.error('Erro ao inserir:', error);
      return { data: null, error };
    }
  }

  async delete(): Promise<{ data: any | null; error: any | null }> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || `http://localhost:3000/api`;
      const response = await fetch(`${apiUrl}/delete/${this.tableName}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          where: this.options.where,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      const result = await response.json();
      return { data: result.data || result, error: null };
    } catch (error) {
      console.error('Erro ao deletar:', error);
      return { data: null, error };
    }
  }
}

// Função helper para criar um cliente compatível com Supabase
export const from = (tableName: string) => {
  return new PostgresAPIClient(tableName);
};

// Exportar como padrão para compatibilidade
export default {
  from,
};

